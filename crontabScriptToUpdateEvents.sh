#!/bin/bash

DIR_SHAKEMAP_DATA=./data
if [[ -d ${DIR_SHAKEMAP_DATA} ]]; then
	NOW=$( date +%H%M )
	if [[ "${NOW}" == "0001" ]]; then
		echo "START - Rebuild all"
		/usr/bin/python3 /var/www/updateEventList.py
		echo "END - Rebuild all"
        else
		echo "START - Rebuild only last event"
		find ${DIR_SHAKEMAP_DATA}/ -maxdepth 1 -mindepth 1 -mtime -3 -type d -exec basename {} \; > /tmp/events.txt
		while read LINE; do
			echo "LINE=${LINE}"
			/usr/bin/python3 /var/www/updateEventList.py --eventid=${LINE}
		done < /tmp/events.txt
		if [[ -f /tmp/events.txt ]]; then
			rm /tmp/events.txt
		fi
		echo "END - Rebuild only last event"
	fi
else
	echo " The \"${DIR_SHAKEMAP_DATA}\" doesn't exist"
	echo ""
	exit 1
fi
echo ""
