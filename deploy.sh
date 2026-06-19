#!/bin/bash
# Legacy alias — use sync.sh instead
exec "$(cd "$(dirname "$0")" && pwd)/sync.sh" "${1:-Deploy toon-blast-game}"