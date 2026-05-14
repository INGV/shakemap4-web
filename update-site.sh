#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage:
  update-site.sh [options]

Description:
  Updates the repository, pulls the Docker image, restarts the
  shakemap4-web container, and optionally runs rsync and/or follows logs.

Options:
  -r, --repo-dir DIR
      Git repository directory
      default: /home/shake/gitwork/_INGV/shakemap4-web

  -v, --docker-version VERSION
      Docker image tag/version
      required

  -n, --container-name NAME
      Container name
      default: shakemap4-web

  -p, --local-port PORT
      Local port to expose (must be an integer)
      default: 8080

  -e, --shakemap-env ENV
      Value for the SHAKEMAP_ENV environment variable
      required

  -s, --src-volume DIR
      Local directory to mount at /usr/share/nginx/html
      default: /home/shake/gitwork/_INGV/shakemap4-web

  -d, --data-volume DIR
      Data directory to mount read-only
      default: /home/shake/gitwork/_shakemap/shakemap4/data/shakemap_profiles/world/data

  -K, --data-storage-volume DIR
      Optional historical data directory to mount read-only at
      /usr/share/nginx/html/data_storage

  -i, --image-name NAME
      Docker image name
      default: ingv/shakemap4-web

  -R, --rsync-dest DEST
      rsync destination (required only with --rsync)

  -l, --lock-file FILE
      Lock file for flock
      default: /tmp/rsync_1a.lock

  -t, --rsync-timeout SEC
      rsync timeout in seconds (must be an integer)
      default: 15

  -g, --follow-logs
      Follow container logs after startup

  -x, --rsync
      Run rsync at the end

  -P, --skip-git-pull
      Skip git pull

  -D, --skip-docker-pull
      Skip docker pull

  -N, --dry-run
      Print commands without executing them

  -h, --help
      Show this help

Examples:
  update-site.sh --docker-version 2.3.0 --shakemap-env eu

  update-site.sh \
    --docker-version 2.3.0 \
    --shakemap-env eu \
    --follow-logs

  update-site.sh \
    --docker-version 2.3.0 \
    --shakemap-env eu \
    --data-storage-volume /mnt/shakemap_storage/data \
    --follow-logs

  update-site.sh \
    --docker-version 2.3.0 \
    --shakemap-env eu \
    --rsync \
    --rsync-dest user@host:/remote/path

  update-site.sh \
    --docker-version 2.3.0 \
    --shakemap-env eu \
    --dry-run
EOF
}

if [[ $# -eq 0 ]]; then
  usage
  exit 0
fi

# Defaults
REPO_DIR="/home/shake/gitwork/_INGV/shakemap4-web"
DOCKER_VERSION=""
CONTAINER_NAME="shakemap4-web"
LOCAL_PORT="8080"
SHAKEMAP_ENV=""
SRC_VOLUME="/home/shake/gitwork/_INGV/shakemap4-web"
DATA_VOLUME="/home/shake/gitwork/_shakemap/shakemap4/data/shakemap_profiles/world/data"
DATA_STORAGE_VOLUME=""
IMAGE_NAME="ingv/shakemap4-web"
RSYNC_DEST=""
LOCK_FILE="/tmp/rsync_1a.lock"
RSYNC_TIMEOUT="15"

FOLLOW_LOGS=false
DO_RSYNC=false
SKIP_GIT_PULL=false
SKIP_DOCKER_PULL=false
DRY_RUN=false

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

die() {
  echo "Error: ${*}" >&2
  exit 1
}

log_step() {
  echo
  echo "== ${*} =="
}

run_cmd() {
  if [[ "${DRY_RUN}" == true ]]; then
    printf '[DRY-RUN]'
    printf ' %q' "${@}"
    printf '\n'
  else
    "${@}"
  fi
}

is_integer() {
  [[ "${1}" =~ ^[0-9]+$ ]]
}

# Sets _ARG_VALUE and _SHIFT in the caller's scope (avoids a subshell).
# Handles both "--opt VALUE" (space form) and "--opt=VALUE" (equals form).
_ARG_VALUE=""
_SHIFT=1
get_arg() {
  local OPT="${1}"
  local RAW="${2}"
  local NEXT="${3:-}"

  if [[ "${RAW}" == *=* ]]; then
    _ARG_VALUE="${RAW#*=}"
    [[ -n "${_ARG_VALUE}" ]] || die "${OPT} requires a non-empty value."
    _SHIFT=1
  else
    [[ -n "${NEXT}" ]] || die "${OPT} requires an argument."
    _ARG_VALUE="${NEXT}"
    _SHIFT=2
  fi
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "${1}" in
      -r|--repo-dir|--repo-dir=*)
        get_arg "--repo-dir" "${1}" "${2:-}"
        REPO_DIR="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -v|--docker-version|--docker-version=*)
        get_arg "--docker-version" "${1}" "${2:-}"
        DOCKER_VERSION="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -n|--container-name|--container-name=*)
        get_arg "--container-name" "${1}" "${2:-}"
        CONTAINER_NAME="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -p|--local-port|--local-port=*)
        get_arg "--local-port" "${1}" "${2:-}"
        LOCAL_PORT="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -e|--shakemap-env|--shakemap-env=*)
        get_arg "--shakemap-env" "${1}" "${2:-}"
        SHAKEMAP_ENV="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -s|--src-volume|--src-volume=*)
        get_arg "--src-volume" "${1}" "${2:-}"
        SRC_VOLUME="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -d|--data-volume|--data-volume=*)
        get_arg "--data-volume" "${1}" "${2:-}"
        DATA_VOLUME="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -K|--data-storage-volume|--data-storage-volume=*)
        get_arg "--data-storage-volume" "${1}" "${2:-}"
        DATA_STORAGE_VOLUME="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -i|--image-name|--image-name=*)
        get_arg "--image-name" "${1}" "${2:-}"
        IMAGE_NAME="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -R|--rsync-dest|--rsync-dest=*)
        get_arg "--rsync-dest" "${1}" "${2:-}"
        RSYNC_DEST="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -l|--lock-file|--lock-file=*)
        get_arg "--lock-file" "${1}" "${2:-}"
        LOCK_FILE="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -t|--rsync-timeout|--rsync-timeout=*)
        get_arg "--rsync-timeout" "${1}" "${2:-}"
        RSYNC_TIMEOUT="${_ARG_VALUE}"; shift "${_SHIFT}" ;;

      -g|--follow-logs)      FOLLOW_LOGS=true;       shift ;;
      -x|--rsync)            DO_RSYNC=true;           shift ;;
      -P|--skip-git-pull)    SKIP_GIT_PULL=true;      shift ;;
      -D|--skip-docker-pull) SKIP_DOCKER_PULL=true;   shift ;;
      -N|--dry-run)          DRY_RUN=true;            shift ;;
      -h|--help)             usage; exit 0 ;;
      --)                    shift; break ;;
      -*)                    die "Unknown option: ${1}" ;;
      *)                     die "Unexpected argument: ${1}" ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

validate_args() {
  [[ -n "${DOCKER_VERSION}" ]] || die "--docker-version is required."
  [[ -n "${SHAKEMAP_ENV}" ]]   || die "--shakemap-env is required."

  if [[ "${DO_RSYNC}" == true ]]; then
    [[ -n "${RSYNC_DEST}" ]] || die "--rsync-dest is required when using --rsync."
  fi

  is_integer "${LOCAL_PORT}"    || die "--local-port must be an integer, got: ${LOCAL_PORT}"
  is_integer "${RSYNC_TIMEOUT}" || die "--rsync-timeout must be an integer, got: ${RSYNC_TIMEOUT}"

  [[ -d "${REPO_DIR}" ]]    || die "Repository directory not found: ${REPO_DIR}"
  [[ -d "${SRC_VOLUME}" ]]  || die "Source volume not found: ${SRC_VOLUME}"
  [[ -d "${DATA_VOLUME}" ]] || die "Data volume not found: ${DATA_VOLUME}"

  if [[ -n "${DATA_STORAGE_VOLUME}" ]]; then
    [[ -d "${DATA_STORAGE_VOLUME}" ]] || die "Data storage volume not found: ${DATA_STORAGE_VOLUME}"
  fi
}

# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------

print_config() {
  echo "== Configuration =="
  echo "REPO_DIR         : ${REPO_DIR}"
  echo "DOCKER_VERSION   : ${DOCKER_VERSION}"
  echo "CONTAINER_NAME   : ${CONTAINER_NAME}"
  echo "LOCAL_PORT       : ${LOCAL_PORT}"
  echo "SHAKEMAP_ENV     : ${SHAKEMAP_ENV}"
  echo "SRC_VOLUME       : ${SRC_VOLUME}"
  echo "DATA_VOLUME      : ${DATA_VOLUME}"
  echo "DATA_STORAGE_VOL : ${DATA_STORAGE_VOLUME:-<not set>}"
  echo "IMAGE_NAME       : ${IMAGE_NAME}"
  echo "RSYNC_DEST       : ${RSYNC_DEST:-<not set>}"
  echo "LOCK_FILE        : ${LOCK_FILE}"
  echo "RSYNC_TIMEOUT    : ${RSYNC_TIMEOUT}"
  echo "FOLLOW_LOGS      : ${FOLLOW_LOGS}"
  echo "DO_RSYNC         : ${DO_RSYNC}"
  echo "SKIP_GIT_PULL    : ${SKIP_GIT_PULL}"
  echo "SKIP_DOCKER_PULL : ${SKIP_DOCKER_PULL}"
  echo "DRY_RUN          : ${DRY_RUN}"
}

do_git_update() {
  log_step "Git update"
  if [[ "${SKIP_GIT_PULL}" == true ]]; then
    echo "Skipping git pull."
    return
  fi
  run_cmd git -C "${REPO_DIR}" pull
}

do_docker_pull() {
  local IMAGE_TAG="${1}"
  log_step "Docker image"
  if [[ "${SKIP_DOCKER_PULL}" == true ]]; then
    echo "Skipping docker pull."
    return
  fi
  run_cmd docker pull "${IMAGE_TAG}"
}

do_docker_restart() {
  local IMAGE_TAG="${1}"

  log_step "Stop/remove previous container"
  if [[ "${DRY_RUN}" == true ]]; then
    run_cmd docker stop "${CONTAINER_NAME}"
    run_cmd docker container rm "${CONTAINER_NAME}"
  else
    if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
      docker stop "${CONTAINER_NAME}" || true
      docker container rm "${CONTAINER_NAME}" || true
    else
      echo "No existing container named ${CONTAINER_NAME}."
    fi
  fi

  log_step "Start container"
  local DOCKER_ARGS=(
    docker run -d
    --rm \
    -p "${LOCAL_PORT}:80" \
    -e PROCESS_ALL_DATA_FIRST_TIME=true \
    -e ENABLE_CRONTAB=true \
    -e SHAKEMAP_ENV="${SHAKEMAP_ENV}" \
    --name "${CONTAINER_NAME}" \
    -v "${SRC_VOLUME}:/usr/share/nginx/html" \
    -v "${DATA_VOLUME}:/usr/share/nginx/html/data:ro"
  )

  if [[ -n "${DATA_STORAGE_VOLUME}" ]]; then
    DOCKER_ARGS+=(-v "${DATA_STORAGE_VOLUME}:/usr/share/nginx/html/data_storage:ro")
  fi

  DOCKER_ARGS+=("${IMAGE_TAG}")

  run_cmd "${DOCKER_ARGS[@]}"

  echo "Container started: ${CONTAINER_NAME}"
}

do_rsync() {
  log_step "Rsync"
  run_cmd flock --verbose -n "${LOCK_FILE}" \
    rsync --timeout="${RSYNC_TIMEOUT}" -av --delete \
      --exclude=.git \
      --exclude=Docker \
      --exclude=data \
      --exclude=data_storage \
      "${REPO_DIR}/" \
      "${RSYNC_DEST}"
}

do_follow_logs() {
  log_step "Container logs"
  run_cmd docker logs -f "${CONTAINER_NAME}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  parse_args "${@}"
  validate_args

  local IMAGE_TAG="${IMAGE_NAME}:${DOCKER_VERSION}"

  print_config

  do_git_update
  do_docker_pull "${IMAGE_TAG}"
  do_docker_restart "${IMAGE_TAG}"

  [[ "${DO_RSYNC}" == true ]]    && do_rsync
  [[ "${FOLLOW_LOGS}" == true ]] && do_follow_logs
}

main "${@}"
