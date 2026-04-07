FROM nginx:1.29.3

# Install cron and dependencies for process_events.sh
RUN apt-get update && \
    apt-get install -y \
    jq \
    vim \
    cron \
    procps \
    libxml2-utils \
    && rm -rf /var/lib/apt/lists/*

# Add alias ll=ls -la to root's .bashrc
RUN echo "alias ll='ls -la'" >> /root/.bashrc

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy application files to nginx web root
COPY index.html /usr/share/nginx/html/
COPY analysis.html /usr/share/nginx/html/
COPY disclaimer*.md /usr/share/nginx/html/
COPY contributors*.md /usr/share/nginx/html/
COPY scientific-background*.md /usr/share/nginx/html/
COPY productsListToProcess.json /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY images/ /usr/share/nginx/html/images/

# Copy the processing script
COPY process_events.sh /usr/share/nginx/html/process_events.sh
RUN chmod +x /usr/share/nginx/html/process_events.sh

# Create data directory (can be mounted as volume)
RUN mkdir -p /usr/share/nginx/html/data

# Create crontab file
RUN echo "*/2 * * * * /usr/share/nginx/html/process_events.sh -d /usr/share/nginx/html/data -l 5 -x _fr >> /tmp/process_events_incremental.log 2>&1" > /etc/cron.d/shakemap-cron && \
    echo "00 12 * * * /usr/share/nginx/html/process_events.sh -d /usr/share/nginx/html/data -x _fr >> /tmp/process_events_full.log 2>&1" >> /etc/cron.d/shakemap-cron && \
    echo "01 00 * * * mv /tmp/process_events_incremental.log /tmp/process_events_incremental.yesterday.log" && \
    echo "01 00 * * * mv /tmp/process_events_full.log /tmp/process_events_full.yesterday.log" && \
    chmod 0644 /etc/cron.d/shakemap-cron

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Set Working Directory: /usr/share/nginx/html/
WORKDIR /usr/share/nginx/html/

# Use custom entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
