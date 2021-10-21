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

echo "Run 'service cron start' ..."
sudo service cron start > /tmp/entrypoint_cron_start 2>&1 &
pid="$!"

while true; do sleep 5; done
