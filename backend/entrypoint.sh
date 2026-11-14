#!/bin/sh
# Container entrypoint: apply database migrations, then exec the given command.
set -e

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
    echo "entrypoint: running database migrations (alembic upgrade head)"
    alembic upgrade head
fi

if [ "$#" -eq 0 ]; then
    set -- uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips '*'
fi

echo "entrypoint: starting: $*"
exec "$@"
