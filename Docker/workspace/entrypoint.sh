#!/bin/bash

# Init pid variable
pid=0

# Current pid
echo "Current pid = $$"

# Set environment variables
. ~/.bashrc

# ISGTERM handler
term_handler () {
        echo "Run 'service cron stop':"
        sudo service cron stop
        echo "Waiting cron stop ..."
        wait "$pid"
        echo "Done"
        exit
}

# With no "exit"
trap 'term_handler' SIGTERM

echo "Run script to process all events:"
/usr/bin/python3 /var/www/updateEventList.py > /tmp/entrypoint.log 2>&1 &
echo "Done"
echo ""

echo "Run 'service cron start':"
sudo service cron start > /tmp/entrypoint.log 2>&1 &
pid="$!"
echo "Done"
echo ""

while true; do sleep 5; done
