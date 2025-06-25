# HistVV-2025

## Installation Node.js

Wird für lokale Entwicklung verwendet. Installation mit nvm, damit je nach Projekt individuelle Node Versionen installiert werden können.

nvm installieren:

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

nvm aktivieren (oder neu einloggen):

```
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Node 20 installieren:

```
nvm install 20
nvm use 20
```

Prüfen:

```
node -v
npm -v
```

## Start

Einmalig: `npm install` → package-lock.json entsteht

### Entwicklung lokal

Live Reload; ideal zum Entwickeln, Testen, CSS anpassen etc.

```
docker compose up --build dev -d
```

Astro Dev Server unter: `http://localhost'


### Produktions-Build

```
docker compose up --build prod -d
```

Astro Dev Server unter: `http://localhost'

#### bash in container

```
docker exec -it histvv2025-prod /bin/sh
```

Die HTML-Seite ist unter `/usr/share/nginx/html`


