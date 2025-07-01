# HistVV-2025


### Lokal, docker compose

```
docker compose up --build prod -d
```

Website: `http://localhost'

#### SSH in Container:

```
docker exec -it histvv2025-prod /bin/sh
```

Die HTML-Seite ist unter `/usr/share/nginx/html`


## K8s

Durch Hochladen des argoCD Manifests wird ständig der Ist-Zustand mit dem Soll-Zustand auf GitLab verglichen. Bei einem Push, der ein neues Image kreiert, wird dieses automatisch übernommen und auf K8s deployed. 

Falls auf GitLab nur Dateien aktualisiert werden sollen, ohne Auslösen der CI/CD Pipeline, kann in der Commit Message am Ende `-nodeployement` angegeben werden. Bsp.: `git commit -m "Update Readme -nodeployment"`

### Test-Cluster

argoCD Manifest unter https://gitlab.uzh.ch/zi-container-services/helm-charts/-/blob/main/argocd/zicstest01api.uzh.ch/zi-iti-dba/histvv.yaml?ref_type=heads

Website: http://histvv-2025.t01.cs.zi.uzh.ch

### Prod-Cluster

folgt... noch nicht umgesetzt.



## Projektbeginn

Für den Anfang der lokalen Entwicklung, und für das Erstellen der package.json, muss npm installiert werden. Installation mit nvm, damit je nach Projekt individuelle Node Versionen installiert werden können.

### node installieren

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

### Astro Projekt installieren

```
mkdir /xyz/histvv-2025
cd /xyz/histvv-2025

# erstellt package.json
npm create astro@latest .

# Wenn das Create-Tool nach dem Setu nicht automatisch npm install ausführt, mach das einfach selbst:
npm install

# starten
npm run dev
```
