#!/bin/bash

# process_events.sh
# Script to process ShakeMap event data and generate events.json

# Lock directory to prevent concurrent executions (cross-platform)
LOCKDIR="/tmp/process_events.lock"
PIDFILE="$LOCKDIR/pid"

# Function to acquire lock
acquire_lock() {
    # Try to create lock directory atomically
    if mkdir "$LOCKDIR" 2>/dev/null; then
        # Successfully acquired lock, write PID
        echo $$ > "$PIDFILE"
        return 0
    else
        # Lock directory exists, check if process is still running
        if [ -f "$PIDFILE" ]; then
            local old_pid=$(cat "$PIDFILE" 2>/dev/null)
            # Check if process is still running
            if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
                echo "[INFO] Another instance of process_events.sh (PID: $old_pid) is already running. Exiting." >&2
                exit 0
            else
                # Stale lock detected, remove it
                echo "[WARN] Removing stale lock from PID: $old_pid" >&2
                rm -rf "$LOCKDIR"
                # Try to acquire lock again
                if mkdir "$LOCKDIR" 2>/dev/null; then
                    echo $$ > "$PIDFILE"
                    return 0
                else
                    echo "[ERROR] Failed to acquire lock after removing stale lock." >&2
                    exit 1
                fi
            fi
        else
            # Lock directory exists but no PID file, clean up and retry
            echo "[WARN] Lock directory exists without PID file, cleaning up..." >&2
            rm -rf "$LOCKDIR"
            if mkdir "$LOCKDIR" 2>/dev/null; then
                echo $$ > "$PIDFILE"
                return 0
            else
                echo "[ERROR] Failed to acquire lock." >&2
                exit 1
            fi
        fi
    fi
}

# Function to release lock
release_lock() {
    rm -rf "$LOCKDIR"
}

# Set trap to release lock on exit
trap release_lock EXIT INT TERM

# Acquire the lock before proceeding
acquire_lock

# Check for required commands
REQUIRED_COMMANDS=("xmllint" "jq")
for CMD in "${REQUIRED_COMMANDS[@]}"; do
    if ! command -v "$CMD" >/dev/null 2>&1; then
        echo "[ERROR] Required command '$CMD' is not installed." >&2
        exit 1
    fi
done

DATA_DIR=""
EVENTS_JSON="events.json"
SINGLE_EVENT_ID=""
LAST_EVENTS=""

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

# Main logic
if [ -n "$SINGLE_EVENT_ID" ]; then
    echo "Processing single event: $SINGLE_EVENT_ID"
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
    echo "Processing last $LAST_EVENTS events (ordered by modification date)..."
    
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
    done | jq -s '.' > all_events_flat.json
    
    # Now restructure flat list into Year -> Month -> List
    echo "Restructuring data..."
    jq 'group_by(.year) | map({
        key: (.[0].year | tostring),
        value: (
            group_by(.month) | map({
                key: (.[0].month | tostring | if length == 1 then "0" + . else . end),
                value: .
            }) | from_entries
        )
    }) | from_entries' all_events_flat.json > "$EVENTS_JSON"
    
    rm all_events_flat.json
    echo "Last $LAST_EVENTS events processed."
else
    echo "Processing all events..."
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
    done | jq -s '.' > all_events_flat.json
    
    # Now restructure flat list into Year -> Month -> List
    echo "Restructuring data..."
    jq 'group_by(.year) | map({
        key: (.[0].year | tostring),
        value: (
            group_by(.month) | map({
                key: (.[0].month | tostring | if length == 1 then "0" + . else . end),
                value: .
            }) | from_entries
        )
    }) | from_entries' all_events_flat.json > "$EVENTS_JSON"
    
    rm all_events_flat.json
    echo "All events processed."
fi
