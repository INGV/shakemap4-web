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
Usage: $(basename "$0") -d DATA_DIR [-k DATA_STORAGE_DIR] [-m DAYS [-n FILE]] [-e EVENT_ID | -l LAST_N_EVENTS] [-x SUFFIX] [-h]

Process ShakeMap event data and generate events.json.

Options:
  -d DATA_DIR                (required) Path to the data directory containing
                             event subdirectories (e.g., data/)
  --data-realtime-dir DATA_DIR
                             Long alias for -d. Use this for the primary
                             realtime data directory
  -k DATA_STORAGE_DIR        Optional historical storage directory. Used only
                             during full rebuilds
  --data-storage-dir DATA_STORAGE_DIR
                             Long alias for -k
  -m DAYS                    Move event directories older than DAYS from
                             DATA_DIR to DATA_STORAGE_DIR before processing.
                             The event OriginTime is read directly from
                             current/event.xml. Requires -d and -k
  --move-days DAYS           Long alias for -m
  -n FILE                    Path to a text file with event IDs that must never
                             be moved when -m is used, one event ID per line
  --no-move FILE             Long alias for -n
  -e EVENT_ID                Process a single event by its ID. Performs an
                             incremental update: adds or updates the event in
                             events.json while preserving all other events
  -l N                       Process the last N events sorted by modification
                             time (newest first). Performs an incremental update
  -x, --exclude-dir-end SUFFIX
                             Exclude event directories whose name ends with
                             SUFFIX (e.g., "_ri" excludes "44940322_ri")
  -h, --help                 Display this help message and exit

Note: Options -e and -l are mutually exclusive. If neither is specified,
all events in DATA_DIR and, when provided, DATA_STORAGE_DIR are processed
(full rebuild of events.json). Option -k/--data-storage-dir is valid only
for full rebuilds. Option -m/--move-days is valid only for full rebuilds and
requires writable DATA_DIR and DATA_STORAGE_DIR mounts.

Examples:
  $(basename "$0") -d data/                                      Process all realtime events (full rebuild)
  $(basename "$0") --data-realtime-dir data/                     Same, using long option
  $(basename "$0") -d data/ -k data_storage/                     Process realtime and storage events (full rebuild)
  $(basename "$0") -d data/ -e 44683062                          Process a single realtime event
  $(basename "$0") -d data/ -l 5                                 Process last 5 modified realtime events
  $(basename "$0") -d data/ -k data_storage/ -x _ri              Full rebuild excluding dirs ending with "_ri"
  $(basename "$0") -d data/ -k data_storage/ -m 100 -x _ri       Move events older than 100 days, then full rebuild
  $(basename "$0") -d data/ -k data_storage/ -m 100 -n EVENTID_DO_NOT_MOVE.txt
                                                                  Move old events except IDs listed in the file
  $(basename "$0") -d data/ --exclude-dir-end _ri                Same exclusion, using long option
  $(basename "$0") -h                                            Show this help
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
DATA_STORAGE_DIR=""
EVENTS_JSON=${WORKDIR}/events.json
EVENTS_JSON_TMP=${WORKDIR}/events.json.tmp
SINGLE_EVENT_ID=""
LAST_EVENTS=""
EXCLUDE_DIR_END=""
MOVE_DAYS=""
NO_MOVE_IDS_FILE=""
NO_MOVE_IDS=()
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
        --data-realtime-dir)
            DATA_DIR="$2"
            shift 2
            ;;
        --data-realtime-dir=*)
            DATA_DIR="${1#*=}"
            shift
            ;;
        --data-storage-dir)
            DATA_STORAGE_DIR="$2"
            shift 2
            ;;
        --data-storage-dir=*)
            DATA_STORAGE_DIR="${1#*=}"
            shift
            ;;
        --move-days)
            MOVE_DAYS="$2"
            shift 2
            ;;
        --move-days=*)
            MOVE_DAYS="${1#*=}"
            shift
            ;;
        --no-move)
            NO_MOVE_IDS_FILE="$2"
            shift 2
            ;;
        --no-move=*)
            NO_MOVE_IDS_FILE="${1#*=}"
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
while getopts "d:e:l:x:k:m:n:h" opt; do
  case $opt in
    d) DATA_DIR="$OPTARG"
    ;;
    k) DATA_STORAGE_DIR="$OPTARG"
    ;;
    m) MOVE_DAYS="$OPTARG"
    ;;
    n) NO_MOVE_IDS_FILE="$OPTARG"
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

# Validate -m is a positive integer and compatible only with full rebuilds
if [ -n "$MOVE_DAYS" ]; then
    if ! [[ "$MOVE_DAYS" =~ ^[0-9]+$ ]] || [ "$MOVE_DAYS" -le 0 ]; then
        echo "Error: -m/--move-days requires a positive integer" >&2
        exit 1
    fi

    if [ -n "$SINGLE_EVENT_ID" ] || [ -n "$LAST_EVENTS" ]; then
        echo "Error: -m/--move-days is valid only for full rebuilds (do not use it with -e or -l)" >&2
        echo "" >&2
        usage >&2
        exit 1
    fi

    if [ -z "$DATA_STORAGE_DIR" ]; then
        echo "Error: -m/--move-days requires -k/--data-storage-dir" >&2
        echo "" >&2
        usage >&2
        exit 1
    fi
fi

if [ -n "$NO_MOVE_IDS_FILE" ] && [ -z "$MOVE_DAYS" ]; then
    echo "Error: -n/--no-move is valid only when -m/--move-days is used" >&2
    echo "" >&2
    usage >&2
    exit 1
fi

# Validate storage directory use
if [ -n "$DATA_STORAGE_DIR" ]; then
    if [ -n "$SINGLE_EVENT_ID" ] || [ -n "$LAST_EVENTS" ]; then
        echo "Error: -k/--data-storage-dir is valid only for full rebuilds (do not use it with -e or -l)" >&2
        echo "" >&2
        usage >&2
        exit 1
    fi

    if [ ! -d "$DATA_STORAGE_DIR" ]; then
        echo "Error: DATA_STORAGE_DIR does not exist or is not a directory: $DATA_STORAGE_DIR" >&2
        exit 1
    fi
fi

# Validate move directory permissions
if [ -n "$MOVE_DAYS" ]; then
    if [ ! -d "$DATA_DIR" ]; then
        echo "Error: DATA_DIR does not exist or is not a directory: $DATA_DIR" >&2
        exit 1
    fi

    if [ ! -w "$DATA_DIR" ]; then
        echo "Error: DATA_DIR must be writable when -m/--move-days is used: $DATA_DIR" >&2
        exit 1
    fi

    if [ ! -w "$DATA_STORAGE_DIR" ]; then
        echo "Error: DATA_STORAGE_DIR must be writable when -m/--move-days is used: $DATA_STORAGE_DIR" >&2
        exit 1
    fi
fi

if [ -n "$NO_MOVE_IDS_FILE" ]; then
    if [ ! -f "$NO_MOVE_IDS_FILE" ]; then
        echo "Error: -n/--no-move file does not exist or is not a regular file: $NO_MOVE_IDS_FILE" >&2
        exit 1
    fi

    if ! cat "$NO_MOVE_IDS_FILE" >/dev/null 2>&1; then
        echo "Error: -n/--no-move file cannot be opened for reading: $NO_MOVE_IDS_FILE" >&2
        exit 1
    fi
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

# Function to trim leading and trailing whitespace
trim_spaces() {
    local value=$1
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "$value"
}

# Function to normalize an event directory name to its base event ID.
# Reported Intensity directories follow their base event for move decisions.
normalize_event_base_id() {
    local event_id
    event_id=$(trim_spaces "$1")

    if [[ "$event_id" == *_ri ]]; then
        event_id="${event_id%_ri}"
    fi

    printf '%s' "$event_id"
}

# Function to load protected event IDs from -n/--no-move file.
# Empty lines and lines starting with "#" are ignored.
load_no_move_ids() {
    local line

    NO_MOVE_IDS=()

    if [ -z "$NO_MOVE_IDS_FILE" ]; then
        return 0
    fi

    while IFS= read -r line || [ -n "$line" ]; do
        line=$(trim_spaces "$line")

        if [ -z "$line" ] || [[ "$line" == \#* ]]; then
            continue
        fi

        NO_MOVE_IDS+=("$line")
    done < "$NO_MOVE_IDS_FILE"

    echo_date "Loaded ${#NO_MOVE_IDS[@]} protected event ID(s) from $NO_MOVE_IDS_FILE"
}

# Function to check if an event is protected by -n/--no-move
# Parameters:
#   $1 - event_id: directory name to check
# Returns: 0 if protected, 1 if not protected
is_no_move_protected() {
    local event_id=$1
    local event_base
    local protected_id
    local protected_base

    if [ ${#NO_MOVE_IDS[@]} -eq 0 ]; then
        return 1
    fi

    event_base=$(normalize_event_base_id "$event_id")

    for protected_id in "${NO_MOVE_IDS[@]}"; do
        protected_base=$(normalize_event_base_id "$protected_id")
        if [ -n "$protected_base" ] && [ "$event_base" = "$protected_base" ]; then
            return 0
        fi
    done

    return 1
}

# Function to left-pad a numeric date/time component to two digits
pad2() {
    local value=$1

    if ! [[ "$value" =~ ^[0-9]+$ ]]; then
        return 1
    fi

    printf '%02d' "$((10#$value))"
}

# Function to normalize ISO 8601 UTC origin times to YYYY-MM-DDTHH:MM:SSZ
normalize_origin_time_iso() {
    local value
    value=$(trim_spaces "$1")

    if [[ "$value" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}:[0-9]{2}:[0-9]{2})(\.[0-9]+)?Z$ ]]; then
        printf '%sT%sZ' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
        return 0
    fi

    return 1
}

# Function to convert an ISO 8601 UTC timestamp to epoch seconds.
# Supports GNU date (Linux) and BSD date (macOS).
origin_time_to_epoch() {
    local iso
    local epoch

    iso=$(normalize_origin_time_iso "$1") || return 1

    if epoch=$(date -u -d "$iso" +%s 2>/dev/null); then
        printf '%s' "$epoch"
        return 0
    fi

    if epoch=$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$iso" +%s 2>/dev/null); then
        printf '%s' "$epoch"
        return 0
    fi

    return 1
}

# Function to extract OriginTime epoch seconds directly from current/event.xml
# Parameters:
#   $1 - event_xml: path to event.xml
# Returns: prints epoch seconds and returns 0 on success
get_event_origin_epoch() {
    local event_xml=$1
    local time_attr
    local epoch
    local year
    local month
    local day
    local hour
    local minute
    local second
    local month_padded
    local day_padded
    local hour_padded
    local minute_padded
    local second_padded
    local iso

    time_attr=$(xmllint --xpath "string(/earthquake/@time)" "$event_xml" 2>/dev/null)
    if [ -n "$time_attr" ]; then
        if epoch=$(origin_time_to_epoch "$time_attr"); then
            printf '%s' "$epoch"
            return 0
        fi
    fi

    year=$(xmllint --xpath "string(/earthquake/@year)" "$event_xml" 2>/dev/null)
    month=$(xmllint --xpath "string(/earthquake/@month)" "$event_xml" 2>/dev/null)
    day=$(xmllint --xpath "string(/earthquake/@day)" "$event_xml" 2>/dev/null)
    hour=$(xmllint --xpath "string(/earthquake/@hour)" "$event_xml" 2>/dev/null)
    minute=$(xmllint --xpath "string(/earthquake/@minute)" "$event_xml" 2>/dev/null)
    second=$(xmllint --xpath "string(/earthquake/@second)" "$event_xml" 2>/dev/null)

    if ! [[ "$year" =~ ^[0-9]{4}$ ]] || [ -z "$month" ] || [ -z "$day" ]; then
        return 1
    fi

    hour=${hour:-0}
    minute=${minute:-0}
    second=${second:-0}

    month_padded=$(pad2 "$month") || return 1
    day_padded=$(pad2 "$day") || return 1
    hour_padded=$(pad2 "$hour") || return 1
    minute_padded=$(pad2 "$minute") || return 1
    second_padded=$(pad2 "$second") || return 1

    iso="${year}-${month_padded}-${day_padded}T${hour_padded}:${minute_padded}:${second_padded}Z"
    origin_time_to_epoch "$iso"
}

# Function to move one event directory to DATA_STORAGE_DIR, overwriting any
# existing destination directory as requested.
move_directory_to_storage() {
    local event_id=$1
    local source_path="${DATA_DIR%/}/${event_id}"
    local destination_path="${DATA_STORAGE_DIR%/}/${event_id}"

    if [ -z "$event_id" ] || [ "$destination_path" = "${DATA_STORAGE_DIR%/}" ]; then
        echo "Error: refusing to move invalid event directory name: '$event_id'" >&2
        return 1
    fi

    if [ ! -d "$source_path" ]; then
        echo "Warning: source directory not found while moving $event_id: $source_path" >&2
        return 1
    fi

    if [ -e "$destination_path" ]; then
        echo "Warning: overwriting existing storage directory for $event_id: $destination_path" >&2
        if ! rm -rf "$destination_path"; then
            echo "Error: failed to remove existing storage directory for $event_id: $destination_path" >&2
            return 1
        fi
        MOVE_OVERWRITTEN=$((MOVE_OVERWRITTEN + 1))
    fi

    if ! mv "$source_path" "$destination_path"; then
        echo "Error: failed to move $event_id from $source_path to $destination_path" >&2
        return 1
    fi

    return 0
}

# Function to move old realtime event directories to historical storage
move_old_events_to_storage() {
    local now_epoch
    local cutoff_epoch
    local event_xml
    local event_id
    local ri_event_id
    local origin_epoch
    local found_events=0

    MOVE_TOTAL=0
    MOVE_MOVED=0
    MOVE_RI_MOVED=0
    MOVE_RECENT=0
    MOVE_PROTECTED=0
    MOVE_PARSE_ERRORS=0
    MOVE_ERRORS=0
    MOVE_OVERWRITTEN=0

    now_epoch=$(date -u +%s)
    cutoff_epoch=$((now_epoch - (MOVE_DAYS * 86400)))

    echo_date "Moving events older than ${MOVE_DAYS} day(s) from $DATA_DIR to $DATA_STORAGE_DIR"
    load_no_move_ids

    while IFS= read -r event_xml; do
        found_events=1
        event_id=$(basename "$(dirname "$(dirname "$event_xml")")")

        # Reported Intensity directories are moved only together with their base event.
        if [[ "$event_id" == *_ri ]]; then
            continue
        fi

        MOVE_TOTAL=$((MOVE_TOTAL + 1))

        if is_no_move_protected "$event_id"; then
            MOVE_PROTECTED=$((MOVE_PROTECTED + 1))
            echo "Skipping $event_id: protected by -n/--no-move" >&2
            continue
        fi

        if ! origin_epoch=$(get_event_origin_epoch "$event_xml"); then
            MOVE_PARSE_ERRORS=$((MOVE_PARSE_ERRORS + 1))
            echo "Warning: could not parse OriginTime for $event_id from $event_xml; not moving" >&2
            continue
        fi

        if [ "$origin_epoch" -ge "$cutoff_epoch" ]; then
            MOVE_RECENT=$((MOVE_RECENT + 1))
            continue
        fi

        if move_directory_to_storage "$event_id"; then
            MOVE_MOVED=$((MOVE_MOVED + 1))
            echo "Moved $event_id to storage" >&2

            ri_event_id="${event_id}_ri"
            if [ -d "${DATA_DIR%/}/${ri_event_id}" ]; then
                if move_directory_to_storage "$ri_event_id"; then
                    MOVE_RI_MOVED=$((MOVE_RI_MOVED + 1))
                    echo "Moved ${ri_event_id} to storage together with $event_id" >&2
                else
                    MOVE_ERRORS=$((MOVE_ERRORS + 1))
                fi
            fi
        else
            MOVE_ERRORS=$((MOVE_ERRORS + 1))
        fi
    done < <(find "$DATA_DIR" -maxdepth 3 -path "*/current/event.xml" -type f | sort)

    if [ "$found_events" -eq 0 ]; then
        echo "No events found in $DATA_DIR for move evaluation" >&2
    fi

    echo_date "Move summary: evaluated=${MOVE_TOTAL}, moved=${MOVE_MOVED}, moved_ri=${MOVE_RI_MOVED}, recent=${MOVE_RECENT}, protected=${MOVE_PROTECTED}, parse_errors=${MOVE_PARSE_ERRORS}, overwritten=${MOVE_OVERWRITTEN}, move_errors=${MOVE_ERRORS}"
}

# Function to check whether Reported Intensity data exists for an event
# Parameters:
#   $1 - event_id: base event ID
#   $2 - source_dir: source directory where the base event was found
# Returns: 0 if RI data exists, 1 if not
reported_intensity_exists() {
    local event_id=$1
    local source_dir=$2

    if [ -d "${source_dir}/${event_id}_ri" ]; then
        return 0
    fi

    if [ "${source_dir}" != "${DATA_DIR}" ] && [ -d "${DATA_DIR}/${event_id}_ri" ]; then
        return 0
    fi

    if [ -n "${DATA_STORAGE_DIR}" ] && [ "${source_dir}" != "${DATA_STORAGE_DIR}" ] && [ -d "${DATA_STORAGE_DIR}/${event_id}_ri" ]; then
        return 0
    fi

    return 1
}

# Function to process a single event
process_event() {
    local event_id=$1
    local source_dir=${2:-$DATA_DIR}
    local event_xml="$source_dir/$event_id/current/event.xml"

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

    # Check if Reported Intensity data exists
    local HAS_RI=0
    if reported_intensity_exists "$id" "$source_dir"; then
        HAS_RI=1
    fi

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
        --argjson has_ri "$HAS_RI" \
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
            hasRI: ($has_ri == 1),
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

if [ -n "$MOVE_DAYS" ]; then
    move_old_events_to_storage
fi

# Main logic
if [ -n "$SINGLE_EVENT_ID" ]; then
    echo_date "Processing single event: $SINGLE_EVENT_ID [realtime: $DATA_DIR]"

    if is_excluded "$SINGLE_EVENT_ID"; then
        echo_date "Skipping event $SINGLE_EVENT_ID: directory name ends with '${EXCLUDE_DIR_END}' (excluded by -x/--exclude-dir-end)"
        EVENTS_EXCLUDED+=("$SINGLE_EVENT_ID")
    else
        event_json=$(process_event "$SINGLE_EVENT_ID" "$DATA_DIR")

        if [ -n "$event_json" ]; then
            # Check if time parsing was used
            if [ "$(echo "$event_json" | jq -r '._used_time_parsing')" = "1" ]; then
                EVENTS_WITH_TIME_PARSING+=("$SINGLE_EVENT_ID")
            fi
            update_event_in_json "$event_json" "$SINGLE_EVENT_ID"
            echo "Event $SINGLE_EVENT_ID processed from realtime: $DATA_DIR"
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

        echo "$current/$total_events - Processing $event_id [realtime: $DATA_DIR]" >&2

        # Process event
        event_json=$(process_event "$event_id" "$DATA_DIR")

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

    if [ -n "$DATA_STORAGE_DIR" ]; then
        echo_date "Using storage directory: $DATA_STORAGE_DIR"
    fi

    EVENT_SOURCES_TMP="${WORKDIR}/event_sources.tmp"
    EVENT_IDS_TMP="${WORKDIR}/event_ids.tmp"
    EVENTS_JSON_RAW="${WORKDIR}/events_raw.json.tmp"

    : > "$EVENT_SOURCES_TMP"
    : > "$EVENT_IDS_TMP"

    add_events_from_dir() {
        local source_dir=$1
        local source_label=$2
        local xml_file
        local event_id

        while read xml_file; do
            event_id=$(basename "$(dirname "$(dirname "$xml_file")")")

            if grep -Fxq "$event_id" "$EVENT_IDS_TMP"; then
                if [ "$source_label" = "storage" ]; then
                    echo "Warning: skipping duplicate event $event_id from DATA_STORAGE_DIR; DATA_DIR has priority when already present." >&2
                else
                    echo "Warning: skipping duplicate event $event_id from $source_dir; first occurrence has priority." >&2
                fi
                continue
            fi

            printf '%s\t%s\t%s\n' "$source_label" "$source_dir" "$xml_file" >> "$EVENT_SOURCES_TMP"
            printf '%s\n' "$event_id" >> "$EVENT_IDS_TMP"
        done < <(find "$source_dir" -maxdepth 3 -path "*/current/event.xml")
    }

    add_events_from_dir "$DATA_DIR" "realtime"

    if [ -n "$DATA_STORAGE_DIR" ]; then
        add_events_from_dir "$DATA_STORAGE_DIR" "storage"
    fi

    # Count total events first, after deduplicating realtime and storage dirs.
    total_events=$(wc -l < "$EVENT_SOURCES_TMP" | tr -d ' ')
    echo "Found $total_events events to process"

    if [ "$total_events" -eq 0 ]; then
        echo "No events found in $DATA_DIR${DATA_STORAGE_DIR:+ or $DATA_STORAGE_DIR}" >&2
        rm -f "$EVENT_SOURCES_TMP" "$EVENT_IDS_TMP"
        exit 1
    fi
    
    # Initialize counter
    current=0
    
    # Create temporary file for raw JSON output

    # Step 1: Process all events and write to temporary file
    while IFS=$'\t' read -r source_label source_dir xml_file; do
        # Extract event_id from path
        event_id=$(basename "$(dirname "$(dirname "$xml_file")")")

        # Increment counter
        current=$((current + 1))

        # Check exclusion
        if is_excluded "$event_id"; then
            echo "$current/$total_events - Skipping $event_id [$source_label: $source_dir]: directory name ends with '${EXCLUDE_DIR_END}' (excluded by -x/--exclude-dir-end)" >&2
            EVENTS_EXCLUDED+=("$event_id")
            continue
        fi

        echo "$current/$total_events - Processing $event_id [$source_label: $source_dir]" >&2

        # Process event
        json_str=$(process_event "$event_id" "$source_dir")
        if [ -n "$json_str" ]; then
            # Check if time parsing was used
            if [ "$(echo "$json_str" | jq -r '._used_time_parsing')" = "1" ]; then
                EVENTS_WITH_TIME_PARSING+=("$event_id")
            fi
            echo "$json_str"
        fi
    done < "$EVENT_SOURCES_TMP" > "${EVENTS_JSON_RAW}"

    # Step 2: Convert to JSON array
    jq -s '.' "${EVENTS_JSON_RAW}" > "${EVENTS_JSON_TMP}"
    rm "${EVENTS_JSON_RAW}" "$EVENT_SOURCES_TMP" "$EVENT_IDS_TMP"

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
