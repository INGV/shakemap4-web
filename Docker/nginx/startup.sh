#!/bin/bash

# Start crond in background
crond -l 2 -b

# Start nginx in foreground
nginx
