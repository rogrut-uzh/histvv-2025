# HistVV-2025

## Data Migration

Damit die Webapp die Daten korrekt einlesen kann, müssen die Quelldaten aufbereitet werden. Dies ist zur Zeit noch ein manueller Task. Die bis 2025 bestehenden Daten wurden der BaseX Datenbank entnommen und liegen entsprechend als XML vor. 

Die Semester ab Winter 1900 werden neu in Excel gepflegt. Ebenso die aktualisierte Dozierendenliste.

Diese Formate müssen in JSON umgewandelt werden. 

Die Daten werden vom Team Archiv UZH bearbeitet.

### XML

  - Semester: `/data-migration/xml_1833-1900/1833s.xml [...] 1900s.xml`
  - Dozierende: `/data-migration/xml_1833-1900/dozenten.xml`

### XLSX

  - Semester: `/data-migration/xlsx_1900-/1900_Winter.xlsx [...]`
  - Dozierende: `/data-migration/xlsx_1900-/Dozierendenverzeichnis.xlsx`

### Umwandlung in JSON

Die JSON-Dateien werden mit Python Scripts erstellt und gleich am korrekten Ort unter `/data/` abgelegt.

#### Dozierende

Das Script `1_dozenten_xml-and-xlsx.py` verlangt 2 Parameter:

  - Vollständiger Pfad zur XML-Dozenten-Datei
  - Vollständiger Pfad zur XLSX-Dozenten-Datei
  
Das JSON Resultat wird unter `/data/tbl_dozenten.json` abgelegt.

Aufruf:

```
$ python3 1_dozenten_xml-and-xlsx.py ~/gitlab-repositories/histvv-2025/data-migration/xml_1833-1900/dozenten.xml ~/gitlab-repositories/histvv-2025/data-migration/xlsx_1900-/Dozierendenverzeichnis.xlsx

JSON geschrieben: /home/rogrut/gitlab-repositories/histvv-2025/data/tbl_dozenten.json
```

#### Semester Header

Für jedes Semester gibt es allgemeine Informationen, die oben auf der Webpage angezeigt werden. Bis 1900 waren die Infos gehaltvoller und werden aus den XML-Dateien der Semester extrahiert. 

Das Script `2_semester-header_xml.py` verlangt 1 Parameter:

  - Vollständiger Pfad zum Ordner, der die Semester-XML-Dateien enthält
  
Das JSON Resultat wird unter `/data/tbl_semester_header.json` abgelegt.

Aufruf:

```
$ python3 2_semester-header_xml.py ~/gitlab-repositories/histvv-2025/data-migration/xml_1833-1900

JSON geschrieben: /home/rogrut/gitlab-repositories/histvv-2025/data/tbl_semester_header.json
```

Ab 1900 liegen keine Semester Header Informationen mehr vor. Daher wurde das JSON einmalig manuell erstellt und bleibt statisch: `/data/tbl_veranstaltungen-ab-1900w.json`

#### Semester-Veranstaltungen (XML)

Das Script `3_semester-veranstaltungen_xml.py` verlangt 1 Parameter:

  - Vollständiger Pfad zum Ordner, der die Semester-XML-Dateien enthält
  
Das JSON Resultat wird unter `/data/tbl_veranstaltungen.json` abgelegt.

#### Semester-Veranstaltungen (XLSX)

Das Script `3_semester-veranstaltungen_xlsx.py` verlangt 1 Parameter:

  - Vollständiger Pfad zum Ordner, der die Semester-XML-Dateien enthält
  
Das JSON Resultat wird unter `/data/tbl_veranstaltungen-ab-1900w.json` abgelegt.

---

## Lokal; docker compose

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
docker compose build --build-arg EXCLUDE_DOZIERENDE=false prod && docker compose up -d prod
```

Website: `http://localhost'

### SSH in Container:

```
docker exec -it histvv2025-prod /bin/sh
```

Die HTML-Seite ist unter `/usr/share/nginx/html`

---

## GitLab CI/CD-Pipeline

Wie in `.gitlab-ci.yml` definiert, wird das Container Image erstellt und in der GitLab Registry abgespeichert. Danach wird das Image noch auf Schwachstellen gescannt.

Falls auf GitLab nur Dateien aktualisiert werden sollen, ohne Auslösen der CI/CD Pipeline, kann in der Commit Message am Ende `-nodeployement` angegeben werden. Bsp.: `git commit -m "Update Readme -nodeployment"`

---

## Deployment in UZH Cloud (K8s)

### Test-Cluster

argoCD Manifest unter https://gitlab.uzh.ch/zi-container-services/helm-charts/-/blob/main/argocd/zicstest01api.uzh.ch/zi-iti-dba/histvv.yaml?ref_type=heads

Website: http://histvv-2025.t01.cs.zi.uzh.ch

### Prod-Cluster

folgt... noch nicht umgesetzt.
