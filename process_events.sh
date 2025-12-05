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
# Array to track events with time parsing issues
EVENTS_WITH_TIME_PARSING=()

# Parse arguments
while getopts "d:e:l:" opt; do
  case $opt in
    d) DATA_DIR="$OPTARG"
    ;;
    e) SINGLE_EVENT_ID="$OPTARG"
    ;;
    l) LAST_EVENTS="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    exit 1
    ;;
  esac
done

# Validate required argument
if [ -z "$DATA_DIR" ]; then
    echo "Error: -d option is required to specify DATA_DIR" >&2
    echo "Usage: $0 -d DATA_DIR [-e EVENT_ID | -l LAST_N_EVENTS]" >&2
    exit 1
fi

# Validate mutual exclusivity of -e and -l
if [ -n "$SINGLE_EVENT_ID" ] && [ -n "$LAST_EVENTS" ]; then
    echo "Error: Options -e and -l are mutually exclusive" >&2
    echo "Usage: $0 -d DATA_DIR [-e EVENT_ID | -l LAST_N_EVENTS]" >&2
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
    jq 'group_by(.year) | map({
        key: (.[0].year | tostring),
        value: (
            group_by(.month) | map({
                key: (.[0].month | tostring | if length == 1 then "0" + . else . end),
                value: .
            }) | from_entries
        )
    }) | from_entries' "${EVENTS_JSON_TMP}" > "$EVENTS_JSON"
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

            # Log warning and track this event
            echo "Warning: Event $id uses 'time' attribute instead of individual date/time fields. Parsed: $year-$month-$day $h:$m:$s" >&2
            EVENTS_WITH_TIME_PARSING+=("$id")
        else
            echo "Error: Event $id has no valid date/time information" >&2
            return 1
        fi
    fi

    # Construct JSON object for this event
    # We use jq to ensure proper escaping and formatting
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
            depth: $depth
        }'
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
    event_json=$(process_event "$SINGLE_EVENT_ID")
    
    if [ -n "$event_json" ]; then
        # Extract year and month for the structure
        year=$(echo "$event_json" | jq -r '.year')
        month=$(echo "$event_json" | jq -r '.month' | awk '{printf "%02d", $0}') # Ensure 2 digits for key if needed, but user example showed "04"
        
        # Update events.json
        # Logic: 
        # 1. Ensure year key exists
        # 2. Ensure month key exists
        # 3. Remove existing entry for this id in that year/month list if exists
        # 4. Add new entry
        
        tmp_json=$(mktemp)
        jq --argjson new_event "$event_json" \
           --arg year "$year" \
           --arg month "$month" \
           --arg id "$SINGLE_EVENT_ID" \
           '
           .[$year] = (.[$year] // {}) |
           .[$year][$month] = (.[$year][$month] // []) |
           .[$year][$month] |= map(select(.id != $id)) + [$new_event]
           ' "$EVENTS_JSON" > "$tmp_json" && mv "$tmp_json" "$EVENTS_JSON"
           
        echo "Event $SINGLE_EVENT_ID processed."
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
    
    # Process each event
    echo "$event_dirs" | while read xml_file; do
        # Extract event_id from path
        event_id=$(basename $(dirname $(dirname "$xml_file")))
        
        # Increment counter
        current=$((current + 1))
        echo "$current/$total_events - Processing $event_id" >&2
        
        # Process event
        json_str=$(process_event "$event_id")
        if [ -n "$json_str" ]; then
             echo "$json_str"
        fi
    done | jq -s '.' > "${EVENTS_JSON_TMP}"

    # Now restructure flat list into Year -> Month -> List
    restructure_events_json

    rm "${EVENTS_JSON_TMP}"
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
    find "$DATA_DIR" -maxdepth 3 -path "*/current/event.xml" | while read xml_file; do
        # Extract event_id from path
        event_id=$(basename $(dirname $(dirname "$xml_file")))
        
        # Increment counter
        current=$((current + 1))
        echo "$current/$total_events - Processing $event_id" >&2
        
        # Process event
        # We call the function but we need to handle the file path inside the function or pass it
        # Let's redefine process_event slightly or just set DATA_DIR logic
        # Actually, process_event takes ID.
        
        json_str=$(process_event "$event_id")
        if [ -n "$json_str" ]; then
             echo "$json_str"
        fi
    done | jq -s '.' > "${EVENTS_JSON_TMP}"

    # Now restructure flat list into Year -> Month -> List
    restructure_events_json

    rm "${EVENTS_JSON_TMP}"
    echo "All events processed."
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

# Calculate and display execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))
MINUTES=$((EXECUTION_TIME / 60))
SECONDS=$((EXECUTION_TIME % 60))
echo_date "Execution time: ${MINUTES} minute(s) and ${SECONDS} second(s)"
