import xml.etree.ElementTree as ET
import pandas as pd
from pathlib import Path
import re
import sys

# Namespace definieren
NS = "{http://histvv.uni-leipzig.de/ns/2007}"

def parse_semester_files(pfad):
    semester_files = list(pfad.glob("[0-9][0-9][0-9][0-9][sw].xml"))
    semester_data = []

    for file in semester_files:
        tree = ET.parse(file)
        root = tree.getroot()

        universitaet = root.findtext(f"{NS}kopf/{NS}universität")
        semester = root.findtext(f"{NS}kopf/{NS}semester")
        beginn = root.findtext(f"{NS}kopf/{NS}beginn/{NS}jahr")
        ende = root.findtext(f"{NS}kopf/{NS}ende/{NS}jahr")
        quelle_raw = root.findtext(f"{NS}kopf/{NS}quelle")
        quelle = quelle_raw.replace("\n    ", " ") if quelle_raw is not None else None
        status = root.find(f"{NS}kopf/{NS}status")
        status_komplett = status.get("komplett") if status is not None else None
        titel = root.findtext(f"{NS}titel")

        semester_data.append({
            "id": file.stem,  # Dateiname ohne .xml
            "dateiname": file.name,
            "universitaet": universitaet,
            "semester": semester,
            "beginn": beginn,
            "ende": ende,
            "quelle": quelle,
            "status_komplett": status_komplett,
            "titel": titel
        })

    if semester_data:
        df_semester = pd.DataFrame(semester_data)
        semester_csv = "tbl_semester_header.csv"
        df_semester.to_csv(semester_csv, index=False, sep="~")
        print(f"CSV geschrieben: {semester_csv}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python extrahiere-semester.py ordnerpfad/zu/semester-xmls")
        sys.exit(1)

    pfad = Path(sys.argv[1])
    if not pfad.exists() or not pfad.is_dir():
        print(f"Pfad ungültig oder kein Verzeichnis: {pfad}")
        sys.exit(1)

    parse_semester_files(pfad)
