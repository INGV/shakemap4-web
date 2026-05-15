#!/bin/bash
#
# Docker entrypoint for shakemap4-web.
#
# Runs all optional setup steps before handing control to nginx:
#   1. Cron scheduling for periodic event processing (ENABLE_CRONTAB)
#   2. One-shot full data processing at first boot (PROCESS_ALL_DATA_FIRST_TIME)
#   3. Environment profile selection via SHAKEMAP_ENV
#
# Every step is opt-in: with no env vars set, the container just serves the
# static site with INGV defaults from config-base.js.
#
set -e
echo ""

PROCESS_EVENTS_SCRIPT="/usr/share/nginx/html/process_events.sh"
REALTIME_DATA_DIR="/usr/share/nginx/html/data"
STORAGE_DATA_DIR="/usr/share/nginx/html/data_storage"

get_full_rebuild_args() {
    local args=("--data-realtime-dir" "$REALTIME_DATA_DIR")

    if [ -d "$STORAGE_DATA_DIR" ]; then
        args+=("--data-storage-dir" "$STORAGE_DATA_DIR")
    fi

    printf '%s\n' "${args[@]}"
}

get_full_rebuild_command() {
    local cmd="$PROCESS_EVENTS_SCRIPT --data-realtime-dir $REALTIME_DATA_DIR"

    if [ -d "$STORAGE_DATA_DIR" ]; then
        cmd="$cmd --data-storage-dir $STORAGE_DATA_DIR"
    fi

    printf '%s' "$cmd"
}

# --- Cron setup for periodic event reprocessing ---
if [ "$ENABLE_CRONTAB" = "true" ]; then
    echo "ENABLE_CRONTAB is set to true. Starting cron service..."

    INCREMENTAL_CMD="$PROCESS_EVENTS_SCRIPT --data-realtime-dir $REALTIME_DATA_DIR -l 5 -x _ri"
    FULL_REBUILD_CMD="$(get_full_rebuild_command) -x _ri"

    cat > /etc/cron.d/shakemap-cron <<EOF
*/2 * * * * $INCREMENTAL_CMD >> /tmp/process_events_incremental.log 2>&1
00 12 * * * $FULL_REBUILD_CMD >> /tmp/process_events_full.log 2>&1
01 00 * * * mv /tmp/process_events_incremental.log /tmp/process_events_incremental.yesterday.log 2>/dev/null || true
01 00 * * * mv /tmp/process_events_full.log /tmp/process_events_full.yesterday.log 2>/dev/null || true
EOF
    chmod 0644 /etc/cron.d/shakemap-cron

    crontab /etc/cron.d/shakemap-cron
    cron
    echo "Cron service started; check Dockerfile for more info."
else
    echo "ENABLE_CRONTAB is not set to true. Cron service will not start."
fi
echo ""

# --- Environment configuration ---
# SHAKEMAP_ENV selects which environment profile to load.
# Supported values: "ingv" (default), "eu", or any custom name matching config-<name>.js
CONFIG_DIR="/usr/share/nginx/html/js"
ENV_CONFIG="${CONFIG_DIR}/config-env.js"
SHAKEMAP_ENV="${SHAKEMAP_ENV:-ingv}"

PROFILE_FILE="${CONFIG_DIR}/profiles/${SHAKEMAP_ENV}.js"

if [ -f "${PROFILE_FILE}" ]; then
    echo "Applying environment profile: ${SHAKEMAP_ENV} (${PROFILE_FILE})"
    cp "${PROFILE_FILE}" "${ENV_CONFIG}"
else
    echo "WARNING: Profile profiles/${SHAKEMAP_ENV}.js not found. Using empty config-env.js (INGV defaults)."
    echo "// No environment overrides (using defaults from config-base.js)" > "${ENV_CONFIG}"
fi
echo ""

# --- First-boot data processing ---
if [ "$PROCESS_ALL_DATA_FIRST_TIME" = "true" ]; then
    echo "PROCESS_ALL_DATA_FIRST_TIME is set to true. Processing all data..."

    # Two-pass strategy: the first run processes only the 20 most recent events
    # so that events.json is available quickly and the portal is usable right away.
    # The second run rebuilds the full dataset in the background without blocking
    # nginx startup — it may take a long time on large data directories.
    "$PROCESS_EVENTS_SCRIPT" --data-realtime-dir "$REALTIME_DATA_DIR" -l 20
    mapfile -t FULL_REBUILD_ARGS < <(get_full_rebuild_args)
    "$PROCESS_EVENTS_SCRIPT" "${FULL_REBUILD_ARGS[@]}" &

    echo "All data processed."
else
    echo "PROCESS_ALL_DATA_FIRST_TIME is not set to true. Data processing will not run."
fi
echo ""

echo "Starting nginx..."
exec nginx -g "daemon off;"
