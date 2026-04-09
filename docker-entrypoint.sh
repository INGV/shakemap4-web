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

# --- Cron setup for periodic event reprocessing ---
if [ "$ENABLE_CRONTAB" = "true" ]; then
    echo "ENABLE_CRONTAB is set to true. Starting cron service..."
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
    /usr/share/nginx/html/process_events.sh -d /usr/share/nginx/html/data -l 20
    /usr/share/nginx/html/process_events.sh -d /usr/share/nginx/html/data &

    echo "All data processed."
else
    echo "PROCESS_ALL_DATA_FIRST_TIME is not set to true. Data processing will not run."
fi
echo ""

echo "Starting nginx..."
exec nginx -g "daemon off;"
