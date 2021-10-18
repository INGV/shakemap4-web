FROM debian:bookworm-slim

LABEL maintainer="Valentino Lauciani <valentino.lauciani@ingv.it>"

# Main variables
ENV INITRD No
ENV FAKE_CHROOT 1
ENV DEBIAN_FRONTEND=noninteractive

# Set User and Group variabls
ENV GROUP_NAME=shakemweb
ENV USER_NAME=shakeweb
#ENV HOMEDIR_USER=/home/${USER_NAME}
ENV HOMEDIR_USER=/var/www

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

# Copy crontab
COPY ./crontab /etc/cron.d

# Set .bashrc for root user
RUN echo "" >> /root/.bashrc \
    && echo "##################################" >> /root/.bashrc \
    && echo "alias ll='ls -l --color'" >> /root/.bashrc \
    && echo "" >> /root/.bashrc \
    && echo "export LC_ALL=\"C\"" >> /root/.bashrc 

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

# Copy 'logrotate' config file
COPY logrotate/workspace /etc/logrotate.d/

# Set user log
#RUN mkdir /var/log/workspace \
#    && chown -R shakeweb:shakeweb /var/log/workspace


# Set default work directory
USER shakeweb
WORKDIR /var/www






#CMD [ "/usr/sbin/crond", "-f", "-d8" ]
