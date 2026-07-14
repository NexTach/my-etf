#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_command docker

docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
"${SCRIPT_DIR}/apply_nginx.sh"
