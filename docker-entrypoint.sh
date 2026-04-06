#!/bin/bash
#
# Docker entrypoint for shakemap4-web.
#
# Runs all optional setup steps before handing control to nginx:
#   1. Cron scheduling for periodic event processing (ENABLE_CRONTAB)
#   2. One-shot full data processing at first boot (PROCESS_ALL_DATA_FIRST_TIME)
#   3. Runtime config overrides via env vars (FILE_DISCLAIMER, FILE_CONTRIBUTORS, BBOX)
#
# Every step is opt-in: with no env vars set, the container just serves the
# static site with default config.js values.
#
set -e
echo ""

# --- Cron setup for periodic event reprocessing ---
if [ "$ENABLE_CRONTAB" = "true" ]; then
    echo "ENABLE_CRONTAB is set to true. Starting cron service..."
    crontab /etc/cron.d/shakemap-cron
    cron
    echo "Cron service started. Scheduled jobs:"
    echo "  - Every 2 minutes: process_events.sh -d /usr/share/nginx/html/data -l 5"
    echo "  - Daily at 00:10: process_events.sh -d /usr/share/nginx/html/data"
    echo "Logs will be written to:"
    echo "  - /tmp/process_events_incremental.log"
    echo "  - /tmp/process_events_full.log"
else
    echo "ENABLE_CRONTAB is not set to true. Cron service will not start."
fi
echo ""

# --- Runtime config overrides ---
# config.js is a static file baked into the image at build time. To allow the
# same image to serve different deployments (e.g. Italy vs Europe bbox, custom
# disclaimer), we patch it in-place with sed before nginx starts.
CONFIG_FILE="/usr/share/nginx/html/js/config.js"

if [ -n "${FILE_DISCLAIMER}" ]; then
    echo "FILE_DISCLAIMER is set to '${FILE_DISCLAIMER}'. Overriding disclaimerPage in config.js..."
    # Escape '&' which sed interprets as "matched text" in the replacement string
    SAFE_FILE_DISCLAIMER=$(echo "${FILE_DISCLAIMER}" | sed 's|&|\\&|g')
    sed -i "s|disclaimerPage: '.*'|disclaimerPage: '${SAFE_FILE_DISCLAIMER}'|" "${CONFIG_FILE}"
fi

if [ -n "${FILE_CONTRIBUTORS}" ]; then
    echo "FILE_CONTRIBUTORS is set to '${FILE_CONTRIBUTORS}'. Overriding contributorsPage in config.js..."
    SAFE_FILE_CONTRIBUTORS=$(echo "${FILE_CONTRIBUTORS}" | sed 's|&|\\&|g')
    sed -i "s|contributorsPage: '.*'|contributorsPage: '${SAFE_FILE_CONTRIBUTORS}'|" "${CONFIG_FILE}"
fi

# BBOX override: expects "minlat,maxlat,minlon,maxlon" (e.g. "36,72,-25,45" for Europe).
# Replaces the multi-line bBox array in config.js using a sed range match.
if [ -n "${BBOX}" ]; then
    echo "BBOX is set to '${BBOX}'. Overriding bBox in config.js..."

    IFS=',' read -r BBOX_MINLAT BBOX_MAXLAT BBOX_MINLON BBOX_MAXLON <<< "${BBOX}"

    # Tolerate "35, 49, 5, 20" (spaces after commas)
    BBOX_MINLAT=$(echo "${BBOX_MINLAT}" | tr -d ' ')
    BBOX_MAXLAT=$(echo "${BBOX_MAXLAT}" | tr -d ' ')
    BBOX_MINLON=$(echo "${BBOX_MINLON}" | tr -d ' ')
    BBOX_MAXLON=$(echo "${BBOX_MAXLON}" | tr -d ' ')

    if echo "${BBOX_MINLAT}" | grep -qE '^-?[0-9]+\.?[0-9]*$' && \
       echo "${BBOX_MAXLAT}" | grep -qE '^-?[0-9]+\.?[0-9]*$' && \
       echo "${BBOX_MINLON}" | grep -qE '^-?[0-9]+\.?[0-9]*$' && \
       echo "${BBOX_MAXLON}" | grep -qE '^-?[0-9]+\.?[0-9]*$'; then
        sed -i "/bBox: \[/,/    \]/c\\    bBox: [\\n        { minlat: ${BBOX_MINLAT}, maxlat: ${BBOX_MAXLAT}, minlon: ${BBOX_MINLON}, maxlon: ${BBOX_MAXLON} }\\n    ]" "${CONFIG_FILE}"
    else
        echo "WARNING: Invalid BBOX format '${BBOX}'. Expected: minlat,maxlat,minlon,maxlon (numeric values)."
        echo "         Example: BBOX=35,49,5,20"
        echo "         Keeping default bBox configuration."
    fi
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
