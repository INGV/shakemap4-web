#!/bin/bash

# process_events.sh
# Script to process ShakeMap event data and generate events.json

# Lock directory to prevent concurrent executions (cross-platform)
LOCKDIR="/tmp/process_events.lock"
PIDFILE="$LOCKDIR/pid"
WORKDIR=$(cd "$(dirname "$0")" && pwd)

# Function to echo timestamped messages
echo_date() {
    local DATE_NOW
    DATE_NOW=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[${DATE_NOW}] - ${1}"
}

# Function to display usage/help
usage() {
    cat <<EOF
Usage: $(basename "$0") -d DATA_DIR [-e EVENT_ID | -l LAST_N_EVENTS] [-x SUFFIX] [-h]

Process ShakeMap event data and generate events.json.

Options:
  -d DATA_DIR                (required) Path to the data directory containing
                             event subdirectories (e.g., data/)
  -e EVENT_ID                Process a single event by its ID. Performs an
                             incremental update: adds or updates the event in
                             events.json while preserving all other events
  -l N                       Process the last N events sorted by modification
                             time (newest first). Performs an incremental update
  -x, --exclude-dir-end SUFFIX
                             Exclude event directories whose name ends with
                             SUFFIX (e.g., "_fr" excludes "44940322_fr")
  -h, --help                 Display this help message and exit

Note: Options -e and -l are mutually exclusive. If neither is specified,
all events in DATA_DIR are processed (full rebuild of events.json).

Examples:
  $(basename "$0") -d data/                        Process all events (full rebuild)
  $(basename "$0") -d data/ -e 44683062            Process a single event
  $(basename "$0") -d data/ -l 5                   Process last 5 modified events
  $(basename "$0") -d data/ -l 5 -x _fr            Exclude dirs ending with "_fr"
  $(basename "$0") -d data/ --exclude-dir-end _fr  Same, using long option
  $(basename "$0") -h                              Show this help
EOF
}


# Function to check if a lock is stale and clean it up if needed
# Returns: 0 if no lock or stale lock removed, 1 if valid lock exists
cleanup_stale_lock() {
    # No lock directory - nothing to clean up
    if [ ! -d "$LOCKDIR" ]; then
        return 0
    fi

    # Lock directory exists but no PID file - incomplete/corrupt lock
    if [ ! -f "$PIDFILE" ]; then
        echo "[WARN] Removing incomplete lock directory (no PID file)" >&2
        rm -rf "$LOCKDIR"
        return 0
    fi

    # Read the PID from the lock file
    local old_pid=$(cat "$PIDFILE" 2>/dev/null)

    # Empty or corrupt PID file
    if [ -z "$old_pid" ]; then
        echo "[WARN] Removing corrupt lock (empty PID file)" >&2
        rm -rf "$LOCKDIR"
        return 0
    fi

    # Check if the process is still running (kill -0 doesn't send signal, just checks)
    if kill -0 "$old_pid" 2>/dev/null; then
        # Process is alive - valid lock
        echo "[INFO] Another instance of process_events.sh (PID: $old_pid) is already running. Exiting." >&2
        return 1
    else
        # Process is dead - stale lock
        echo "[WARN] Removing stale lock from dead process (PID: $old_pid)" >&2
        rm -rf "$LOCKDIR"
        return 0
    fi
}

# Function to acquire lock using atomic mkdir (cross-platform: works on Linux and macOS)
# Returns: 0 on success, 1 on failure
acquire_lock() {
    local max_attempts=2
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        # Try to create lock directory atomically
        # mkdir is atomic on both Linux and macOS (better than touch for locking)
        if mkdir "$LOCKDIR" 2>/dev/null; then
            # Successfully acquired lock - write our PID
            echo $$ > "$PIDFILE"
            return 0
        fi

        # Lock directory already exists - check if it's stale
        if ! cleanup_stale_lock; then
            # Valid lock exists (another process is running)
            return 1
        fi

        # Stale lock was removed, try again
        attempt=$((attempt + 1))
    done

    # Failed to acquire lock after all attempts
    echo "[ERROR] Failed to acquire lock after $max_attempts attempts" >&2
    return 1
}

# Function to release lock (with ownership verification)
release_lock() {
    # Only remove lock if we own it (safety check)
    if [ -f "$PIDFILE" ]; then
        local lock_pid=$(cat "$PIDFILE" 2>/dev/null)
        if [ "$lock_pid" = "$$" ]; then
            rm -rf "$LOCKDIR"
        fi
    fi
}

# Try to acquire the lock - exit gracefully if another instance is running
if ! acquire_lock; then
    exit 0
fi

# Set trap to release lock on exit - only set after successfully acquiring lock
trap release_lock EXIT INT TERM

# Check for required commands
REQUIRED_COMMANDS=("xmllint" "jq")
for CMD in "${REQUIRED_COMMANDS[@]}"; do
    if ! command -v "$CMD" >/dev/null 2>&1; then
        echo "[ERROR] Required command '$CMD' is not installed." >&2
        exit 1
    fi
done

DATA_DIR=""
EVENTS_JSON=${WORKDIR}/events.json
EVENTS_JSON_TMP=${WORKDIR}/events.json.tmp
SINGLE_EVENT_ID=""
LAST_EVENTS=""
EXCLUDE_DIR_END=""
# Array to track events with time parsing issues
EVENTS_WITH_TIME_PARSING=()
# Array to track excluded directories
EVENTS_EXCLUDED=()

# Handle long options (getopts does not support them)
ARGS=()
while [ $# -gt 0 ]; do
    case "$1" in
        --help)
            usage
            exit 0
            ;;
        --exclude-dir-end)
            EXCLUDE_DIR_END="$2"
            shift 2
            ;;
        --exclude-dir-end=*)
            EXCLUDE_DIR_END="${1#*=}"
            shift
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done
set -- "${ARGS[@]}"

# Parse arguments
while getopts "d:e:l:x:h" opt; do
  case $opt in
    d) DATA_DIR="$OPTARG"
    ;;
    e) SINGLE_EVENT_ID="$OPTARG"
    ;;
    l) LAST_EVENTS="$OPTARG"
    ;;
    x) EXCLUDE_DIR_END="$OPTARG"
    ;;
    h) usage
    exit 0
    ;;
    \?) usage >&2
    exit 1
    ;;
  esac
done

# Validate required argument
if [ -z "$DATA_DIR" ]; then
    echo "Error: -d option is required to specify DATA_DIR" >&2
    echo "" >&2
    usage >&2
    exit 1
fi

# Validate mutual exclusivity of -e and -l
if [ -n "$SINGLE_EVENT_ID" ] && [ -n "$LAST_EVENTS" ]; then
    echo "Error: Options -e and -l are mutually exclusive" >&2
    echo "" >&2
    usage >&2
    exit 1
fi

# Validate -l is a positive integer
if [ -n "$LAST_EVENTS" ]; then
    if ! [[ "$LAST_EVENTS" =~ ^[0-9]+$ ]] || [ "$LAST_EVENTS" -le 0 ]; then
        echo "Error: -l option requires a positive integer" >&2
        exit 1
    fi
fi

# Function to restructure flat event list into Year -> Month -> List structure
restructure_events_json() {
    echo "Restructuring data..."
    jq 'map(del(._used_time_parsing)) | group_by(.year) | map({
        key: (.[0].year | tostring),
        value: (
            group_by(.month) | map({
                key: (.[0].month | tostring | if length == 1 then "0" + . else . end),
                value: .
            }) | from_entries
        )
    }) | from_entries' "${EVENTS_JSON_TMP}" > "$EVENTS_JSON"
}

# Function to check if an event directory should be excluded
# Parameters:
#   $1 - event_id: directory name to check
# Returns: 0 if excluded, 1 if not excluded
is_excluded() {
    local event_id=$1
    if [ -n "${EXCLUDE_DIR_END}" ] && [[ "${event_id}" == *"${EXCLUDE_DIR_END}" ]]; then
        return 0
    fi
    return 1
}

# Function to process a single event
process_event() {
    local event_id=$1
    local event_xml="$DATA_DIR/$event_id/current/event.xml"

    if [ ! -f "$event_xml" ]; then
        echo "Warning: event.xml not found for event $event_id" >&2
        return 1
    fi

    # Extract fields using xmllint (XPath)
    # Note: xmllint --xpath returns result like 'content', we need to clean it up if attributes are quoted

    # Helper to extract attribute
    get_attr() {
        local attr=$1
        xmllint --xpath "string(/earthquake/@$attr)" "$event_xml"
    }

    local id=$(get_attr "id")
    local description=$(get_attr "locstring")
    local day=$(get_attr "day")
    local month=$(get_attr "month")
    local year=$(get_attr "year")
    local h=$(get_attr "hour")
    local m=$(get_attr "minute")
    local s=$(get_attr "second")
    local lat=$(get_attr "lat")
    local lon=$(get_attr "lon")
    local mag=$(get_attr "mag")
    local depth=$(get_attr "depth")

    # Check if date/time fields are missing and parse from "time" attribute if needed
    local used_time_parsing=0
    if [ -z "$year" ] || [ -z "$month" ] || [ -z "$day" ]; then
        local time_attr=$(get_attr "time")
        if [ -n "$time_attr" ]; then
            # Parse ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
            year="${time_attr:0:4}"
            month="${time_attr:5:2}"
            day="${time_attr:8:2}"
            h="${time_attr:11:2}"
            m="${time_attr:14:2}"
            s="${time_attr:17:2}"

            # Log warning and mark that we used time parsing
            echo "Warning: Event $id uses 'time' attribute instead of individual date/time fields. Parsed: $year-$month-$day $h:$m:$s" >&2
            used_time_parsing=1
        else
            echo "Error: Event $id has no valid date/time information" >&2
            return 1
        fi
    fi

    # Construct JSON object for this event
    # We use jq to ensure proper escaping and formatting
    # Include a marker if time parsing was used
    jq -n \
        --arg id "$id" \
        --arg description "$description" \
        --argjson day "$day" \
        --argjson month "$month" \
        --argjson year "$year" \
        --argjson h "$h" \
        --argjson m "$m" \
        --argjson s "$s" \
        --argjson lat "$lat" \
        --argjson lon "$lon" \
        --argjson mag "$mag" \
        --argjson depth "$depth" \
        --argjson used_time_parsing "$used_time_parsing" \
        '{
            id: $id,
            description: $description,
            day: $day,
            month: $month,
            year: $year,
            h: $h,
            m: $m,
            s: $s,
            lat: $lat,
            lon: $lon,
            mag: $mag,
            depth: $depth,
            _used_time_parsing: $used_time_parsing
        }'
}

# Function to update or add a single event in events.json incrementally
# Parameters:
#   $1 - event_json: JSON string of the event to add/update
#   $2 - event_id: ID of the event
update_event_in_json() {
    local event_json=$1
    local event_id=$2

    # Extract year and month for the structure
    local year=$(echo "$event_json" | jq -r '.year')
    local month=$(echo "$event_json" | jq -r '.month' | awk '{printf "%02d", $0}')

    # Update events.json incrementally
    # Logic:
    # 1. Check if event already exists in events.json
    # 2. If exists, remove old entry and add new one
    # 3. If doesn't exist, add new one
    # 4. Keep all other events intact

    local tmp_json=$(mktemp)
    jq --argjson new_event "$event_json" \
       --arg year "$year" \
       --arg month "$month" \
       --arg id "$event_id" \
       '
       .[$year] = (.[$year] // {}) |
       .[$year][$month] = (.[$year][$month] // []) |
       .[$year][$month] |= map(select(.id != $id)) + [($new_event | del(._used_time_parsing))]
       ' "$EVENTS_JSON" > "$tmp_json" && mv "$tmp_json" "$EVENTS_JSON"
}

# Initialize events.json if it doesn't exist
if [ ! -f "$EVENTS_JSON" ]; then
    echo "{}" > "$EVENTS_JSON"
fi

# Capture start time
START_TIME=$(date +%s)

# Main logic
if [ -n "$SINGLE_EVENT_ID" ]; then
    echo_date "Processing single event: $SINGLE_EVENT_ID"

    if is_excluded "$SINGLE_EVENT_ID"; then
        echo_date "Skipping event $SINGLE_EVENT_ID: directory name ends with '${EXCLUDE_DIR_END}' (excluded by -x/--exclude-dir-end)"
        EVENTS_EXCLUDED+=("$SINGLE_EVENT_ID")
    else
        event_json=$(process_event "$SINGLE_EVENT_ID")

        if [ -n "$event_json" ]; then
            # Check if time parsing was used
            if [ "$(echo "$event_json" | jq -r '._used_time_parsing')" = "1" ]; then
                EVENTS_WITH_TIME_PARSING+=("$SINGLE_EVENT_ID")
            fi
            update_event_in_json "$event_json" "$SINGLE_EVENT_ID"
            echo "Event $SINGLE_EVENT_ID processed."
        fi
    fi
elif [ -n "$LAST_EVENTS" ]; then
    echo_date "Processing last $LAST_EVENTS events (ordered by modification date)..."

    # Find all event directories that have current/event.xml
    # Sort by modification time (newest first) and take the last N
    # Cross-platform solution that works on both macOS and Linux

    # Detect OS for stat command compatibility
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS (BSD stat)
        event_dirs=$(find "$DATA_DIR" -maxdepth 3 -path "*/current/event.xml" -type f -print0 | \
                     xargs -0 stat -f "%m %N" | \
                     sort -rn | \
                     head -n "$LAST_EVENTS" | \
                     cut -d' ' -f2-)
    else
        # Linux (GNU stat)
        event_dirs=$(find "$DATA_DIR" -maxdepth 3 -path "*/current/event.xml" -type f -print0 | \
                     xargs -0 stat --format="%Y %n" | \
                     sort -rn | \
                     head -n "$LAST_EVENTS" | \
                     cut -d' ' -f2-)
    fi

    if [ -z "$event_dirs" ]; then
        echo "No events found in $DATA_DIR" >&2
        exit 1
    fi

    # Count total events to process
    total_events=$(echo "$event_dirs" | wc -l | tr -d ' ')
    echo "Found $total_events events to process"

    # Initialize counter
    current=0

    # Process each event and update events.json incrementally
    while read xml_file; do
        # Extract event_id from path
        event_id=$(basename $(dirname $(dirname "$xml_file")))

        # Increment counter
        current=$((current + 1))

        # Check exclusion
        if is_excluded "$event_id"; then
            echo "$current/$total_events - Skipping $event_id: directory name ends with '${EXCLUDE_DIR_END}' (excluded by -x/--exclude-dir-end)" >&2
            EVENTS_EXCLUDED+=("$event_id")
            continue
        fi

        echo "$current/$total_events - Processing $event_id" >&2

        # Process event
        event_json=$(process_event "$event_id")

        if [ -n "$event_json" ]; then
            # Check if time parsing was used
            if [ "$(echo "$event_json" | jq -r '._used_time_parsing')" = "1" ]; then
                EVENTS_WITH_TIME_PARSING+=("$event_id")
            fi
            update_event_in_json "$event_json" "$event_id"
        fi
    done < <(echo "$event_dirs")

    echo "Last $LAST_EVENTS events processed."
else
    echo_date "Processing all events..."
    # Iterate over all directories in data/
    # We will build a large list of objects first or update incrementally?
    # Updating incrementally is safer but slower. Given 7000+ folders, let's try to be efficient.
    # However, bash loop might be slow.
    # Let's do a loop and build a temporary file with all event objects, then merge.
    
    # Count total events first
    total_events=$(find "$DATA_DIR" -maxdepth 3 -path "*/current/event.xml" | wc -l | tr -d ' ')
    echo "Found $total_events events to process"
    
    # Initialize counter
    current=0
    
    # Find all event.xml files
    # Use process substitution to avoid subshell and preserve EVENTS_WITH_TIME_PARSING array
    # Create temporary file for raw JSON output
    EVENTS_JSON_RAW="${WORKDIR}/events_raw.json.tmp"

    # Step 1: Process all events and write to temporary file
    while read xml_file; do
        # Extract event_id from path
        event_id=$(basename $(dirname $(dirname "$xml_file")))

        # Increment counter
        current=$((current + 1))

        # Check exclusion
        if is_excluded "$event_id"; then
            echo "$current/$total_events - Skipping $event_id: directory name ends with '${EXCLUDE_DIR_END}' (excluded by -x/--exclude-dir-end)" >&2
            EVENTS_EXCLUDED+=("$event_id")
            continue
        fi

        echo "$current/$total_events - Processing $event_id" >&2

        # Process event
        json_str=$(process_event "$event_id")
        if [ -n "$json_str" ]; then
            # Check if time parsing was used
            if [ "$(echo "$json_str" | jq -r '._used_time_parsing')" = "1" ]; then
                EVENTS_WITH_TIME_PARSING+=("$event_id")
            fi
            echo "$json_str"
        fi
    done < <(find "$DATA_DIR" -maxdepth 3 -path "*/current/event.xml") > "${EVENTS_JSON_RAW}"

    # Step 2: Convert to JSON array
    jq -s '.' "${EVENTS_JSON_RAW}" > "${EVENTS_JSON_TMP}"
    rm "${EVENTS_JSON_RAW}"

    # Now restructure flat list into Year -> Month -> List
    restructure_events_json

    rm "${EVENTS_JSON_TMP}"
    echo "All events processed."
fi

# Report excluded directories
if [ ${#EVENTS_EXCLUDED[@]} -gt 0 ]; then
    echo ""
    echo_date "=== Excluded directories (${#EVENTS_EXCLUDED[@]} events, suffix '${EXCLUDE_DIR_END}') ==="
    for event_id in "${EVENTS_EXCLUDED[@]}"; do
        echo "  - $event_id"
    done
    echo ""
fi

# Report events with time parsing issues
if [ ${#EVENTS_WITH_TIME_PARSING[@]} -gt 0 ]; then
    echo ""
    echo_date "=== Events with 'time' attribute parsing (${#EVENTS_WITH_TIME_PARSING[@]} events) ==="
    for event_id in "${EVENTS_WITH_TIME_PARSING[@]}"; do
        echo "  - $event_id"
    done
    echo ""
fi

# Update file permissions to be readable
chmod 644 "$EVENTS_JSON"

# Calculate and display execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))
MINUTES=$((EXECUTION_TIME / 60))
SECONDS=$((EXECUTION_TIME % 60))
echo_date "Execution time: ${MINUTES} minute(s) and ${SECONDS} second(s)"
