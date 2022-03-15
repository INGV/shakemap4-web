FROM debian:bullseye-slim

LABEL maintainer="Valentino Lauciani <valentino.lauciani@ingv.it>"

# Main variables
ENV INITRD No
ENV FAKE_CHROOT 1
ENV DEBIAN_FRONTEND=noninteractive

# Set User and Group variabls
ENV GROUP_NAME=shakeweb
ENV USER_NAME=shakeweb
ENV HOMEDIR_USER=/home/${USER_NAME}
#ENV HOMEDIR_USER=/var/www

# Set bash as shell
SHELL ["/bin/bash", "-c"]

# Start as root
USER root

# Set 'root' pwd
RUN echo root:toor | chpasswd

# Install necessary packages
RUN apt-get clean \
    && apt-get update -yqq \
    && apt-get install -yqq \
      apt-utils \
      vim \
      git \
      cron \
      procps \
      sudo \
    && apt-get clean

# Install python
RUN  apt-get -y install python3 python3-pip python3-dev build-essential \
  && python3 -m pip install --upgrade "pip < 21.0" \
  && python3 -m pip install --upgrade virtualenv \
  && python3 -m pip install python-dateutil 

# Set Timezone
ARG TZ=UTC
ENV TZ ${TZ}
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy and run crontab
COPY ./crontab /etc/cron.d
RUN chmod -R 644 /etc/cron.d
RUN crontab /etc/cron.d/shakeweb

# Set default User and Group id from arguments
# If UID and/or GID are equal to zero then new user and/or group are created
ARG ENV_UID=0
ARG ENV_GID=0

RUN echo ENV_UID=${ENV_UID}
RUN echo ENV_GID=${ENV_GID}

RUN \
    if [ ${ENV_UID} -eq 0 ] || [ ${ENV_GID} -eq 0 ]; then \
    echo ""; \
    echo "WARNING: when passing UID or GID equal to zero, new user and/or group are created."; \
    echo "         On Linux, if you run docker image by different UID or GID you could not able to write in docker mount data directory."; \
    echo ""; \
    fi

# Check if GID already exists
RUN cat /etc/group
RUN \
    if [ ${ENV_GID} -eq 0 ]; then \
    addgroup --system ${GROUP_NAME}; \
    elif grep -q -e "[^:][^:]*:[^:][^:]*:${ENV_GID}:.*$" /etc/group; then \
    GROUP_NAME_ALREADY_EXISTS=$(grep  -e "[^:][^:]*:[^:][^:]*:${ENV_GID}:.*$" /etc/group | cut -f 1 -d':'); \
    echo "GID ${ENV_GID} already exists with group name ${GROUP_NAME_ALREADY_EXISTS}"; \
    groupmod -n ${GROUP_NAME} ${GROUP_NAME_ALREADY_EXISTS}; \
    else \
    echo "GID ${ENV_GID} does not exist"; \
    addgroup --gid ${ENV_GID} --system ${GROUP_NAME}; \
    fi

# Check if UID already exists
RUN cat /etc/passwd
RUN \
    if [ ${ENV_UID} -eq 0 ]; then \
    useradd --system -d ${HOMEDIR_USER} -g ${GROUP_NAME} -s /bin/bash ${USER_NAME}; \
    elif grep -q -e "[^:][^:]*:[^:][^:]*:${ENV_UID}:.*$" /etc/passwd; then \
    USER_NAME_ALREADY_EXISTS=$(grep  -e "[^:][^:]*:[^:][^:]*:${ENV_UID}:.*$" /etc/passwd | cut -f 1 -d':'); \
    echo "UID ${ENV_UID} already exists with user name ${USER_NAME_ALREADY_EXISTS}"; \
    usermod -d ${HOMEDIR_USER} -g ${ENV_GID} -l ${USER_NAME} ${USER_NAME_ALREADY_EXISTS}; \
    else \
    echo "UID ${ENV_UID} does not exist"; \
    useradd --system -u ${ENV_UID} -d ${HOMEDIR_USER} -g ${ENV_GID} -G ${GROUP_NAME} -s /bin/bash ${USER_NAME}; \
    fi
# adduser -S -h ${HOMEDIR_USER} -G ${GROUP_NAME} -s /bin/bash ${USER_NAME}; \
# adduser --uid ${ENV_UID} --home ${HOMEDIR_USER} --gid ${ENV_GID} --shell /bin/bash ${USER_NAME}; \

# Create user home dir
RUN mkdir ${HOMEDIR_USER}

# Copy logrotate
COPY logrotate/workspace /etc/logrotate.d/

# Set .bashrc for root user
RUN echo "" >> /root/.bashrc \
    && echo "##################################" >> /root/.bashrc \
    && echo "alias ll='ls -l --color'" >> /root/.bashrc \
    && echo "" >> /root/.bashrc \
    && echo "export LC_ALL=\"C\"" >> /root/.bashrc

# Copy .bashrc to user
RUN cp /root/.bashrc ${HOMEDIR_USER} \
    && chown -R ${USER_NAME}:${GROUP_NAME} ${HOMEDIR_USER}/.bashrc 

#  Add new user shakeweb to sudo group
RUN adduser shakeweb sudo

# Ensure sudo group users are not 
# asked for a password when using 
# sudo command by ammending sudoers file
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Copy entrypoint
COPY entrypoint.sh /opt/
RUN chmod 755 /opt/entrypoint.sh

# Change user
USER shakeweb

# Set 'crontab' 
#RUN crontab -l | { cat; echo "* * * * * (cd /var/www && echo "-----START-----" && time /usr/bin/flock --verbose -n /tmp/crontabScriptToUpdateEvents.sh.lock /var/www/crontabScriptToUpdateEvents.sh ; echo "-----END-----") >> /var/log/workspace/crontabScriptToUpdateEvents.sh.log 2>&1"; } | crontab -

# Set user log
#RUN mkdir /var/log/workspace \
#    && chown -R shakeweb:shakeweb /var/log/workspace


# Set default work directory
WORKDIR /var/www

ENTRYPOINT [ "/opt/entrypoint.sh" ]
