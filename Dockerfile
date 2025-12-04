FROM nginx:1.29.3

# Install cron and dependencies for process_events.sh
RUN apt-get update && \
    apt-get install -y \
    jq \
    cron \
    libxml2-utils \
    && rm -rf /var/lib/apt/lists/*

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy application files to nginx web root
COPY index.html /usr/share/nginx/html/
COPY analysis.html /usr/share/nginx/html/
COPY events.json /usr/share/nginx/html/
COPY productsListToProcess.json /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY images/ /usr/share/nginx/html/images/

# Copy the processing script
COPY process_events.sh /usr/local/bin/process_events.sh
RUN chmod +x /usr/local/bin/process_events.sh

# Create data directory (can be mounted as volume)
RUN mkdir -p /usr/share/nginx/html/data

# Create crontab file
RUN echo "*/2 * * * * /usr/local/bin/process_events.sh -d /usr/share/nginx/html/data -l 5 >> /tmp/process_events_incremental.log 2>&1" > /etc/cron.d/shakemap-cron && \
    echo "10 0 * * * /usr/local/bin/process_events.sh -d /usr/share/nginx/html/data >> /tmp/process_events_full.log 2>&1" >> /etc/cron.d/shakemap-cron && \
    chmod 0644 /etc/cron.d/shakemap-cron

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Use custom entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
