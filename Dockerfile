FROM nginx:1.29.3

# Install cron and dependencies for process_events.sh
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    jq \
    vim \
    cron \
    procps \
    libxml2-utils \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

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
COPY EVENTID_DO_NOT_MOVE.txt /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY images/ /usr/share/nginx/html/images/

# Copy Nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy the processing script
COPY process_events.sh /usr/share/nginx/html/process_events.sh
RUN chmod +x /usr/share/nginx/html/process_events.sh

# Create data directories (can be mounted as volumes)
RUN mkdir -p /usr/share/nginx/html/data /usr/share/nginx/html/data_storage

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Set Working Directory: /usr/share/nginx/html/
WORKDIR /usr/share/nginx/html/

# Use custom entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
