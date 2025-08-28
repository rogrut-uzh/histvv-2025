#!/bin/sh
set -eu

# ---- Vault .env einbinden (falls vorhanden) ----
: "${DOTENV_CONFIG_PATH:=/app/vault/secrets/.env}"
if [ -f "$DOTENV_CONFIG_PATH" ]; then
  # Variablen exportierbar machen
  # shellcheck disable=SC1090
  set -a; . "$DOTENV_CONFIG_PATH"; set +a
fi

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-}"
HISTVV_INDEX="${HISTVV_INDEX:-}"

# Nur zur Info (Passwort maskieren)
_pw=""
[ -n "${ELASTICSEARCH_PASSWORD:-}" ] && _pw="***"
echo "[entrypoint] ES_URL=${ELASTICSEARCH_URL:-<unset>} ES_INDEX=${HISTVV_INDEX:-<unset>} ES_USER=${ELASTICSEARCH_USERNAME:-<unset>} ES_PASS=${_pw}"

# Optionaler Reachability-Check (KEIN Reindex, nur Hinweis)
if [ -n "$ELASTICSEARCH_URL" ] && [ -n "$HISTVV_INDEX" ]; then
  CURL_AUTH=""
  if [ -n "${ELASTICSEARCH_USERNAME:-}" ] && [ -n "${ELASTICSEARCH_PASSWORD:-}" ]; then
    CURL_AUTH="-u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}"
  fi
  code=$(curl -ksS -o /dev/null -w '%{http_code}' $CURL_AUTH "$ELASTICSEARCH_URL/$HISTVV_INDEX" || true)
  if [ "$code" = "200" ]; then
    echo "[entrypoint] Elasticsearch & Index erreichbar."
  else
    echo "[entrypoint] WARN: ES nicht erreichbar oder Index fehlt (HTTP $code). Die App startet trotzdem."
  fi
fi

echo "[entrypoint] Starte Node-Server..."
exec node ./dist/server/entry.mjs
