#!/bin/sh
set -eu

# Optional: Vault .env einbinden (macht Variablen exportierbar)
: "${DOTENV_CONFIG_PATH:=/app/vault/secrets/.env}"
if [ -f "$DOTENV_CONFIG_PATH" ]; then
  set -a; . "$DOTENV_CONFIG_PATH"; set +a
fi

ES_URL="${ELASTICSEARCH_URL:-}"
ES_INDEX="${HISTVV_INDEX:-}"
ES_USER="${ELASTICSEARCH_USERNAME:-}"
ES_PASS="${ELASTICSEARCH_PASSWORD:-}"

mask_pw() { [ -n "${1:-}" ] && echo '***' || echo '<none>'; }

echo "[entrypoint] ES_URL=${ES_URL:-<none>} ES_INDEX=${ES_INDEX:-<none>} ES_USER=${ES_USER:-<none>} ES_PASS=$(mask_pw "$ES_PASS")"

# Optionaler, rein informativer Check (bricht NICHT ab)
if command -v curl >/dev/null 2>&1 && [ -n "$ES_URL" ] && [ -n "$ES_INDEX" ]; then
  AUTH=""
  [ -n "$ES_USER" ] && [ -n "$ES_PASS" ] && AUTH="-u ${ES_USER}:${ES_PASS}"
  code=$(curl -ksS -o /dev/null -w '%{http_code}' $AUTH "$ES_URL/$ES_INDEX" || true)
  if [ "$code" != "200" ]; then
    echo "[entrypoint] WARN: ES nicht erreichbar oder Index fehlt (HTTP $code). Starte trotzdem."
  fi
fi

exec node ./dist/server/entry.mjs
