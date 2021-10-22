#!/bin/bash

# Set log file
FILELOG=/tmp/entrypoint.log

# Init pid variable
pid=0

# Current pid
echo "Current pid = $$" | tee -a ${FILELOG}

# Set environment variables
. ~/.bashrc

# ISGTERM handler
term_handler () {
        echo "Run 'service cron stop':" | tee -a ${FILELOG}
        sudo service cron stop > ${FILELOG} 2>&1 &
        echo "Waiting cron stop ..." | tee -a ${FILELOG}
        wait "$pid"
        echo "Done" | tee -a ${FILELOG}
        exit
}

# With no "exit"
trap 'term_handler' SIGTERM

echo "Run script to process all events:" | tee -a ${FILELOG}
/usr/bin/python3 /var/www/updateEventList.py > ${FILELOG} 2>&1 &
echo "Done" | tee -a ${FILELOG}
echo "" | tee -a ${FILELOG}

echo "Run 'service cron start':" | tee -a ${FILELOG}
sudo service cron start > ${FILELOG} 2>&1 &
pid="$!"
echo "Done" | tee -a ${FILELOG}
echo "" | tee -a ${FILELOG}

while true; do sleep 5; done
