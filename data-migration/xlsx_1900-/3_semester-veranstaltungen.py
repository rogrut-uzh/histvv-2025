import pandas as pd
from pathlib import Path
import json
import sys
import re
import os

veranstaltungen_json = os.path.expanduser("~/gitlab-repositories/histvv-2025/data/tbl_veranstaltungen-2.json")

def get_semester_id_from_filename(filename):
    m = re.match(r"(\d{4})_(Winter|Sommer)", filename)
    if not m:
        return None
    year, halbjahr = m.groups()
    return f"{year}{'w' if halbjahr == 'Winter' else 's'}"

def process_xlsx_file(filepath):
    semester_id = get_semester_id_from_filename(filepath.stem)
    if not semester_id:
        print(f"Überspringe Datei mit ungültigem Namen: {filepath.name}")
        return []

    # Lese das Excel ohne Header (header=None), alle Spalten als string
    df = pd.read_excel(filepath, header=None, dtype=str)

    veranstaltungen = []
    for idx, row in df.iterrows():
        veranstaltungen.append({
            "id_semester": semester_id,
            "vorlesungsnummer": str(row[3]).strip() if pd.notnull(row[3]) else "",
            "fak": str(row[4]).strip() if pd.notnull(row[4]) else "",
            "thema": str(row[5]).strip() if pd.notnull(row[5]) else "",
            "zusatz": str(row[6]).strip() if pd.notnull(row[6]) else "",
            "zeit": "",
            "ort": "",
            "wochenstunden": "",
            "id_dozent": str(row[7]).strip() if pd.notnull(row[7]) else "",
            "grad_dozent": str(row[8]).strip() if pd.notnull(row[8]) else "",
            "funktion_dozent": str(row[9]).strip() if pd.notnull(row[9]) else ""
        })

    return veranstaltungen

def main(xlsx_folder):
    folder = Path(xlsx_folder)
    alle_veranstaltungen = []

    # Durchsuche alle passenden XLSX-Dateien
    for file in sorted(folder.glob("*.xlsx")):
        print(f"Verarbeite: {file.name}")
        veranstaltungen = process_xlsx_file(file)
        alle_veranstaltungen.extend(veranstaltungen)

    # Schreibe alles in eine JSON-Datei
    with open(veranstaltungen_json, "w", encoding="utf-8") as f:
        json.dump(alle_veranstaltungen, f, ensure_ascii=False, indent=2)
    print(f"JSON geschrieben: {veranstaltungen_json}")
    
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python 3_semester-veranstaltungen.py ordner/mit/xlsx")
        sys.exit(1)
    main(sys.argv[1])
