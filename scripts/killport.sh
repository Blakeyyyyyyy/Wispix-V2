#!/usr/bin/env bash
set -e
PORT="$1"
[ -z "$PORT" ] && { echo "Usage: killport <port>"; exit 1; }
PIDS=$(lsof -ti tcp:$PORT || true)
[ -n "$PIDS" ] && kill -9 $PIDS || true
