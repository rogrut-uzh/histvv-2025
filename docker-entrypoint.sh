#!/bin/sh
set -eu

# ---- Vault .env einbinden (falls vorhanden) ----
: "${DOTENV_CONFIG_PATH:=/app/vault/secrets/.env}"
if [ -f "$DOTENV_CONFIG_PATH" ]; then
  # macht Variablen aus .env exportierbar
  # shellcheck disable=SC1090
  set -a; . "$DOTENV_CONFIG_PATH"; set +a
fi

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-}"
HISTVV_INDEX="${HISTVV_INDEX:-}"
REINDEX_ON_START="${REINDEX_ON_START:-}"
FORCE_REINDEX="${FORCE_REINDEX:-}"

echo "[entrypoint] ELASTICSEARCH_URL=$ELASTICSEARCH_URL HISTVV_INDEX=$HISTVV_INDEX"

# kleiner Helfer für BasicAuth mit curl
CURL_AUTH=""
if [ -n "${ELASTICSEARCH_USERNAME:-}" ] && [ -n "${ELASTICSEARCH_PASSWORD:-}" ]; then
  CURL_AUTH="-u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}"
fi

need_reindex=0
if [ "${FORCE_REINDEX}" = "1" ] || [ "${REINDEX_ON_START}" = "1" ]; then
  need_reindex=1
elif [ -n "$ELASTICSEARCH_URL" ]; then
  # HEAD prüfen: 200=da, sonst fehlt
  code=$(curl -ksS -o /dev/null -w '%{http_code}' $CURL_AUTH "$ELASTICSEARCH_URL/$HISTVV_INDEX" || true)
  if [ "$code" != "200" ]; then
    echo "[entrypoint] Index $HISTVV_INDEX fehlt (HTTP $code) --> wird aufgebaut..."
    need_reindex=1
  else
    echo "[entrypoint] Index $HISTVV_INDEX existiert --> kein Rebuild."
  fi
fi

if [ "$need_reindex" = "1" ]; then
  echo "[entrypoint] Re-index starte..."
  # -r dotenv/config lädt die .env auch für Node-Fetch (falls benötigt)
  DOTENV_CONFIG_PATH="$DOTENV_CONFIG_PATH" node -r dotenv/config /app/scripts/index-elasticsearch.mjs
  echo "[entrypoint] Re-index fertig."
fi

echo "[entrypoint] Starte Node-Server..."
exec node ./dist/server/entry.mjs
