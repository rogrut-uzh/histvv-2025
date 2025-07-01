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


