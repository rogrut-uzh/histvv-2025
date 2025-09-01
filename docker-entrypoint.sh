#!/bin/sh
set -eu

# Optional: Vault .env einbinden (macht Variablen exportierbar)
: "${DOTENV_CONFIG_PATH:=/app/vault/secrets/.env}"
if [ -f "$DOTENV_CONFIG_PATH" ]; then
  set -a; . "$DOTENV_CONFIG_PATH"; set +a
fi

ES_URL="${ELASTICSEARCH_URL:-}"

mask_pw() { [ -n "${1:-}" ] && echo '***' || echo '<none>'; }

echo "[entrypoint] ES_URL=${ES_URL:-<none>}"

# Optionaler, rein informativer Check (bricht NICHT ab)
if command -v curl >/dev/null 2>&1 && [ -n "$ES_URL" ]; then
  code=$(curl -ksS -o /dev/null -w '%{http_code}' "$ES_URL" || true)
  if [ "$code" != "200" ]; then
    echo "[entrypoint] WARN: ES nicht erreichbar oder Index fehlt (HTTP $code). Starte trotzdem."
  fi
fi

exec node ./dist/server/entry.mjs
