# HistVV-2025

Diese README beschreibt den Unterhalt der Website "Historische Vorlesungsverzeichnisse der Universiät Zürich" (aka HistVV). 

## Übersicht

Die [vorherige Version der Website](https://gitlab.uzh.ch/histvv) wurde unter Verwendung der im Projekt [Historische Vorlesungsverzeichnisse der Universität Leipzig](http://histvv.uni-leipzig.de/) entwickelten Software erstellt. Die Daten lagen im XML Format. Die Website griff darauf über eine BaseX Datenbank zu. Die Vorlesungsverzeichnisse lagen in den Jahren 1833 bis 1900 vor. 2025 entschied sich das Archi-Team, weitere Jahre zu veröffentlichen. Der Unterhalt der alten Website gestaltete sich als schwierig, vorallem weil es kein Support seitens externem Programmierer mehr gab. Es wurde entschieden, die Website komplett neu zu erstellen, unter Berücksichtigung des aktuellen UZH Styleguides, und mit Deployment nach der UZH Cloud. Die Rohdaten der alten Website (XML) können dabei, mit einem Migrationsschritt, gleich weiterverwendet werden. Die Website-URL ist https://histvv.uzh.ch.

### Verwendete Technik

  - Datenaufbereitung: Python 3
  - Website: [Astro Framework](https://astro.build/)
  - Docker mit Docker Compose
  - Git, GitLab Ci/CD
  - ArgoCD Manifest für K8s

### Themenübersicht

  - Aufbereitung der Rohdaten nach JSON
  - Installation Lokal
  - UZH Cloud

---

## Vorbereitung: Git Repo klonen

```
cd ~/gitlab-repositories
git clone git@gitlab.uzh.ch:dba/histvv-2025.git
cd ~/gitlab-repositories/histvv-2025
```

---

## Aufbereitung der Rohdaten

Die Rohdaten (Vorlesungsverzeichnis, Dozierende u.a.) liegen in zwei verschiedenen Formaten vor. 

### Die "alten" Rohdaten 

  - als XML
  - Wurden von der alten Website übernommen und bleiben unverändert
  - Ablageort: [data-migration/xml_1833-1900/](data-migration/xml_1833-1900/)
  - Semester: `/data-migration/xml_1833-1900/1833s.xml [...] /data-migration/xml_1833-1900/1900s.xml`
  - Dozierende: `/data-migration/xml_1833-1900/dozenten.xml`


### Die "neuen" Rohdaten (ab 1900) 

  - als XLSX. 
  - Bearbeitung durch Team Archiv UZH bearbeitet
  - Ablageort (immer aktuell): `\\Idnas32\g_archiv_temprepository$\TEMP REPOSITORY\VVZ 1833-2014\_WEB` \
    Müssen bei Bedarf nach [data-migration/xlsx_1900-/](data-migration/xlsx_1900-/) kopiert werden
  - Semester: `/data-migration/xlsx_1900-/1900_Winter.xlsx [...]`
  - Dozierende: `/data-migration/xlsx_1900-/Dozierendenverzeichnis.xlsx`

### Umwandlung in JSON

Die Website zieht die Daten nicht aus einer Datenbank. Die Webseiten werden beim Build-Prozess "gebacken", wobei die Rohdaten zuerst in JSON umgewandelt werden müssen.
Die JSON-Dateien werden mit Python Scripts erstellt und gleich am korrekten Ort unter [data/](data/) abgelegt.


#### Dozierende

Das Script `1_dozenten_xml-and-xlsx.py` verlangt 2 Parameter:

  - Vollständiger Pfad zur XML-Dozenten-Datei
  - Vollständiger Pfad zur XLSX-Dozenten-Datei
  
Das JSON Resultat wird unter `/data/tbl_dozenten.json` abgelegt.

Aufruf:

```
python3 1_dozenten_xml-and-xlsx.py ~/gitlab-repositories/histvv-2025/data-migration/xml_1833-1900/dozenten.xml ~/gitlab-repositories/histvv-2025/data-migration/xlsx_1900-/Dozierendenverzeichnis.xlsx

JSON geschrieben: /home/rogrut/gitlab-repositories/histvv-2025/data/tbl_dozenten.json
```

#### Semester Header

Für jedes Semester gibt es allgemeine Informationen, die oben auf der Webpage angezeigt werden. Bis 1900 waren die Infos gehaltvoller und werden aus den XML-Dateien der Semester extrahiert. 

Das Script `2_semester-header_xml.py` verlangt 1 Parameter:

  - Vollständiger Pfad zum Ordner, der die Semester-XML-Dateien enthält
  
Das JSON Resultat wird unter `data/tbl_semester_header.json` abgelegt.

Aufruf:

```
$ python3 2_semester-header_xml.py ~/gitlab-repositories/histvv-2025/data-migration/xml_1833-1900

JSON geschrieben: /home/rogrut/gitlab-repositories/histvv-2025/data/tbl_semester_header.json
```

Ab 1900 liegen keine Semester Header Informationen mehr vor. Daher wurde das JSON einmalig manuell erstellt und bleibt statisch: `/data/tbl_veranstaltungen-ab-1900w.json`

#### Semester-Veranstaltungen (XML)

Das Script `3_semester-veranstaltungen_xml.py` verlangt 1 Parameter:

  - Vollständiger Pfad zum Ordner, der die Semester-XML-Dateien enthält
  
Das JSON Resultat wird unter `data/tbl_veranstaltungen.json` abgelegt.

#### Semester-Veranstaltungen (XLSX)

Das Script `3_semester-veranstaltungen_xlsx.py` verlangt 1 Parameter:

  - Vollständiger Pfad zum Ordner, der die Semester-XML-Dateien enthält
  
Das JSON Resultat wird unter `data/tbl_veranstaltungen-ab-1900w.json` abgelegt.


#### Merge Semester-Veranstaltungen

Zuletzt werden die beiden Semester-JSON `tbl_veranstaltungen.json` und `tbl_veranstaltungen-ab-1900w.json` in eine einzige Datei zusammengeführt.

Aufruf:

```
python3 4_semester-veranstaltungen_merge.py --sort
```

Das JSON Resultat wird unter `data/tbl_veranstaltungen-merged.json` abgelegt. Die Quelldateien werden anschliessend gelöscht. Mit dem `--keep` Parameter werden sie behalten.

---

## Elasticsearch

Die Daten zu den Dozierenden und Vorlesungsverzeichnissen liegen auf einem ES-Server der ZI. 

Da die Website öffentlich in der UZH-Cloud in Zone 1 liegt, kann keine direkte Verbindung zu ES aufgebaut werden. Deshalb hat Lars Frasseck ein Proxy eingerichtet. Dort ist der Index und der read-user bereits fest hinterlegt. Es muss somit nur noch die Suchquery als Body an den Endpoint gesendet werden und es braucht keine Authentifizierung mehr.

### Testumgebung

  - ES-Instanz: `https://ziwwwsearchtest01.uzh.ch:9200`
  - Index: `uzh_archiv_histvv`
  - Users: `uzh_archiv_admin` und `uzh_archiv_user` für read.
  - Proxy Endpoint: `https://www.zi.uzh.ch/cgi-bin/esproxy/archiv_proxy_test.py`


### Index erstellen und befüllen

Der ES-Index wird ausschliesslich vom lokalen Rechner manuell gepflegt. Als Vorbereitung muss im Root-Ordner ein .env file erstellt werden, wobei `<seeKeePass>` vor- oder nachher angepasst werden muss.

#### .env Datei anlegen

```
cd ~/gitlab-repositories/histvv-2025

echo -e "ES_PASSWORD_ADM=<seeKeePass>\nES_USERNAME_ADM=uzh_archiv_admin\nES=https://ziwwwsearchtest01.uzh.ch:9200\nES_INDEX=uzh_archiv_histvv\nPATH_D=data/tbl_dozenten.json\nPATH_V=data/tbl_veranstaltungen-merged.json" > ~/gitlab-repositories/histvv-2025/.env
```

#### Index anlegen und befüllen

```
cd ~/gitlab-repositories/histvv-2025 && docker run --rm --network histvv-2025_histvv-nw -e FORCE_REES_INDEX=1 --env-file .env -v "$PWD:/app" -w /app node:20-alpine node scripts/es/index-elasticsearch.mjs
```

Der Befehl startet einen einmaligen Node-20-Container, hängt ihn ins Docker-Netz histvv-2025_histvv-nw, bindet das aktuelle Verzeichnis ins Container-Verzeichnis /app ein, setzt die Umgebungsvariable FORCE_REES_INDEX, lädt die restlichen Umgebungsvariablen aus .env rein, und führt darin das Reindex-Script aus:

  1. `waitForES(ES)` – wartet, bis ES erreichbar ist.
  2. `ensureIndex(mapping)`
    - `HEAD /{index}`
    - Falls der Index existiert und `FORCE_REES_INDEX=1`:
      - `DELETE /{index}`
      - `PUT /{index}` mit `scripts/es/mapping.json`
    - Falls der Index nicht existiert: direkt `PUT` mit Mapping.
  3. `bulkUpload(...)` – lädt alle Dokumente per `_bulk` und `/_refresh`.

#### Check ob Daten vorhanden sind

```
# Von localhost aus
###################

# Auf 200 Status prüfen
curl -u uzh_archiv_admin:<seeKeePass> -I https://ziwwwsearchtest01.uzh.ch:9200/uzh_archiv_histvv

# Kleine Such-Query:
curl -s "http://localhost/api/suche.json?q=m%C3%BCller&typ=dozent&limit=5" | jq .


# Vom pod aus:
##############

# mit curl:
curl -sS -X POST 'https://www.zi.uzh.ch/cgi-bin/esproxy/archiv_proxy_test.py' -H 'Content-Type: application/json' --data '{"query":{"simple_query_string":{"query":"Dogmatik","fields":["hauptfeld"]}}}'

# oder mit node:
node -e "fetch('https://www.zi.uzh.ch/cgi-bin/esproxy/archiv_proxy_test.py',{  method:'POST',  headers:{'Content-Type':'application/json'},  body: JSON.stringify({query:{simple_query_string:{query:'Dogmatik',fields:['hauptfeld']}}}) }).then(r=>r.text()).then(console.log).catch(console.error)"
```

#### Index löschen (falls nötig)

```
curl -u uzh_archiv_admin:rHZOvorAqVId19DKcG9i -XDELETE https://ziwwwsearchtest01.uzh.ch:9200/uzh_archiv_histvv
```


---

## Lokal - docker compose

### Projektbeginn

Für den Anfang der lokalen Entwicklung, und für das Erstellen der package.json, muss npm installiert werden. Installation mit nvm, damit je nach Projekt individuelle Node Versionen installiert werden können.

#### node installieren

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

#### Astro Projekt installieren

```
cd ~/gitlab-repositories/histvv-2025

# erstellt package.json:
npm create astro@latest .

# Wenn das Create-Tool nach dem Setup nicht automatisch npm install ausführt, selber machen:
npm install

# starten:
npm run dev
```

### Container build & start

```
docker compose build prod     # or
docker compose build --no-cache prod

docker compose up -d          # or
docker compose up -d --remove-orphans
```

Website: `http://localhost`. Falls nötig, kann man sich mit `docker exec -it histvv2025 /bin/sh` in den Container wählen. Logs lassen sich mit `docker compose logs` oder `docker logs histvv2025` anzeigen.

---

## UZH Cloud

Es gibt eine Cloud __Test-Umgebung__ und ein Cloud __Prod-Umgebung__. Für jede Umgebung ist ein __eigenes Container Image__ vorgesehen. In diesem Projekt ist dies mit __unterschiedlichen Branches__ gelöst. Auf dem `main` Git Branch ist die Version für die Prod-Website. Im `test` Branch kann parallel dazu weiter entwickelt werden, respektive lokal gemachte Anpassungen können in der Cloud Test-Umgebung anderen Personen zur Vorschau gezeigt werden.

### GitLab CI/CD-Pipeline

Gemäss der Definition in `.gitlab-ci.yml`, wird das Container Image erstellt und in der GitLab Registry abgespeichert. Danach wird das Image noch auf Schwachstellen gescannt.

Hinweis: Falls auf GitLab nur Dateien aktualisiert werden sollen, ohne Auslösen der CI/CD Pipeline, kann in der Commit Message am Ende `-nodeployement` angegeben werden. Bsp.: `git commit -m "Update Readme -nodeployment"`

Vom Image werden jeweils 2 Tags erstellt. 

  - `test` zeigt immer auf das neuste Image.
  - `test-<short-sha-tag>` sollte für K8s verwendet werden, damit immer klar ist, welches Image für den Pod verwendet wurde.
  - Alle Images: https://gitlab.uzh.ch/dba/histvv-2025/container_registry/452

### Deployment in UZH Cloud (K8s)

### Test-Cluster

argoCD Manifest unter https://gitlab.uzh.ch/zi-container-services/helm-charts/-/blob/main/argocd/zicstest01api.uzh.ch/zi-iti-dba/histvv.yaml?ref_type=heads

Website: http://histvv-2025.t01.cs.zi.uzh.ch

### Prod-Cluster

folgt... noch nicht umgesetzt.

### Deployment

  1. Aktueller Stand vom `helm-charts` Repository holen: `cd ~/gitlab-repositories/helm-charts && git pull`
  2. Anpassung an `~/gitlab-repositories/helm-charts/argocd/zicstest01api.uzh.ch/zi-iti-dba/histvv.yaml` vornehmen. Und in der Zeile `image` den Pfad/Tag angeben.
```
helm:
  values: |-
    image: cr.gitlab.uzh.ch/dba/histvv-2025:test-3a8f1a30 
```
  3. Datei speichern
  4. Commit und Push: `git add . && git commit -m "update to test-3a8f1a30" && git push`
  5. Nach ein paar Minuten ist die Website deployed. [Man kann ArgoCD auch dabei zuschauen](https://argocd.t01.cs.zi.uzh.ch/applications/custom-infra-argocd/histvv-2025-test?view=tree&resource=)

---

## CMI Geschäft zur neuen HistVV Website

2019-67: Historisches Vorlesungsverzeichnis HistVV: Erweiterung Datenbank ab 1900/1901