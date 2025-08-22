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
mkdir /xyz/histvv-2025
cd /xyz/histvv-2025

# erstellt package.json
npm create astro@latest .

# Wenn das Create-Tool nach dem Setu nicht automatisch npm install ausführt, mach das einfach selbst:
npm install

# starten
npm run dev
```

### Container build & start

```
docker compose build prod && docker compose up -d prod
```

Wenn das builden der `dozierenden` Dateien ausgelassen werden soll (build dauert lange für die Dozierenden), kann dies über einen Build Parameter gesteuert werden:

```
docker compose build --build-arg EXCLUDE_DOZIERENDE=true prod && docker compose up -d prod
```

Website: `http://localhost'

### SSH in Container:

```
docker exec -it histvv2025-prod /bin/sh
```

Die HTML-Seite ist unter `/usr/share/nginx/html`

---

## UZH Cloud

Es gibt eine Cloud __Test-Umgebung__ und ein Cloud __Prod-Umgebung__. Für jede Umgebung ist ein __eigenes Container Image__ vorgesehen. In diesem Projekt ist dies mit __unterschiedlichen Branches__ gelöst. Auf dem `main` Git Branch ist die Version ist die Prod-Website. Im `test` Branch kann parallel dazu weiter entwickelt werden, respektive lokal gemachte Anpassungen können in der Cloud Test-Umgebung anderen Personen zur Vorschau gezeigt werden.

### GitLab CI/CD-Pipeline

Gemäss Definition in `.gitlab-ci.yml`, wird das Container Image erstellt und in der GitLab Registry abgespeichert. Danach wird das Image noch auf Schwachstellen gescannt.

Hinweis: Falls auf GitLab nur Dateien aktualisiert werden sollen, ohne Auslösen der CI/CD Pipeline, kann in der Commit Message am Ende `-nodeployement` angegeben werden. Bsp.: `git commit -m "Update Readme -nodeployment"`

### Deployment in UZH Cloud (K8s)

### Test-Cluster

argoCD Manifest unter https://gitlab.uzh.ch/zi-container-services/helm-charts/-/blob/main/argocd/zicstest01api.uzh.ch/zi-iti-dba/histvv.yaml?ref_type=heads

Website: http://histvv-2025.t01.cs.zi.uzh.ch

### Prod-Cluster

folgt... noch nicht umgesetzt.

### Deployment

  1. Aktueller Stand vom `helm-charts` Repository holen: `cd ~/gitlab-repositories/helm-charts && git pull`
  2. Anpassung an `~/gitlab-repositories/helm-charts/argocd/zicstest01api.uzh.ch/zi-iti-dba/histvv.yaml` vornehmen. Und zwar muss in der Zeile `image` der SHORT_SHA Tag des soeben erstellten Containers in GitLab geändert werden (die letzten 8 Stellen nach dem Doppelpunkt).
    ```
    helm:
      values: |-
        image: cr.gitlab.uzh.ch/dba/histvv-2025:3a8f1a30 
    ```
  3. Datei speichern
  4. Commit und Push: `git add . && git commit -m "new version" && git push`
  5. Nach ein paar Minuten ist die Website deployed. [Man kann ArgoCD auch dabei zuschauen](https://argocd.t01.cs.zi.uzh.ch/applications/custom-infra-argocd/histvv-2025-test?view=tree&resource=)

---

## CMI Geschäft zur neuen HistVV Website

2019-67: Historisches Vorlesungsverzeichnis HistVV: Erweiterung Datenbank ab 1900/1901