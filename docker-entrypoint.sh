#!/bin/bash
set -e

# Check if ENABLE_CRONTAB is set to true
if [ "$ENABLE_CRONTAB" = "true" ]; then
    echo "ENABLE_CRONTAB is set to true. Starting cron service..."
    
    # Apply crontab
    crontab /etc/cron.d/shakemap-cron
    
    # Start cron in the background
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

# Check if PROCESS_ALL_DATA_FIRST_TIME is set to true
if [ "$PROCESS_ALL_DATA_FIRST_TIME" = "true" ]; then
    echo "PROCESS_ALL_DATA_FIRST_TIME is set to true. Processing all data..."
    
    # Run process_events.sh with -d and -l options
    /usr/share/nginx/html/process_events.sh -d /usr/share/nginx/html/data
    
    echo "All data processed."
else
    echo "PROCESS_ALL_DATA_FIRST_TIME is not set to true. Data processing will not run."
fi

# Start nginx in the foreground
echo "Starting nginx..."
exec nginx -g "daemon off;"
