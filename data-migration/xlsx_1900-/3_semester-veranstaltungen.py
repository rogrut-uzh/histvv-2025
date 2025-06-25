import pandas as pd
from pathlib import Path
import json
import sys
import re
import os
import hashlib

veranstaltungen_json = os.path.expanduser("~/gitlab-repositories/histvv-2025/data/tbl_veranstaltungen-ab-1900w.json")

def get_semester_id_from_filename(filename):
    m = re.match(r"(\d{4})_(Winter|Sommer)", filename)
    if not m:
        return None
    year, halbjahr = m.groups()
    return f"{year}{'w' if halbjahr == 'Winter' else 's'}"

def make_unique_id(semester_id, vorlesungsnummer, thema, zusatz):
    basis = f"{semester_id}{vorlesungsnummer}{thema}{zusatz}"
    hash_part = hashlib.sha1(basis.encode("utf-8")).hexdigest()[:8]
    return f"{hash_part}"

def process_xlsx_file(filepath):
    semester_id = get_semester_id_from_filename(filepath.stem)
    if not semester_id:
        print(f"Überspringe Datei mit ungültigem Namen: {filepath.name}")
        return []

    df = pd.read_excel(filepath, header=None, dtype=str)

    veranstaltungen = []
    for idx, row in df.iterrows():
        fak = str(row[4]).strip() if pd.notnull(row[4]) else ""
        thema = str(row[5]).strip() if pd.notnull(row[5]) else ""
        zusatz = str(row[6]).strip() if pd.notnull(row[6]) else ""
        vorlesungsnummer = str(row[3]).strip() if pd.notnull(row[3]) else ""
        vorlesungsnummer_without_dot = vorlesungsnummer.rstrip(".")
        id_veranstaltung = f"v-{make_unique_id(semester_id, vorlesungsnummer, thema, zusatz)}"

        # Dozenten-Array aufbauen (max. 3)
        dozenten = []
        # 1. Dozent (id, grad, funktion)
        if pd.notnull(row[7]) and row[7].strip():
            dozenten.append({
                "id_dozent": str(row[7]).strip(),
                "grad": str(row[8]).strip() if pd.notnull(row[8]) else "",
                "funktion": str(row[9]).strip() if pd.notnull(row[9]) else ""
            })
        # 2. Dozent (id, grad, KEINE funktion)
        if len(row) > 10 and pd.notnull(row[10]) and row[10].strip():
            dozenten.append({
                "id_dozent": str(row[10]).strip(),
                "grad": str(row[11]).strip() if pd.notnull(row[11]) else "",
                "funktion": ""
            })
        # 3. Dozent (id, grad, KEINE funktion)
        if len(row) > 12 and pd.notnull(row[12]) and row[12].strip():
            dozenten.append({
                "id_dozent": str(row[12]).strip(),
                "grad": str(row[13]).strip() if pd.notnull(row[13]) else "",
                "funktion": ""
            })

        veranstaltungen.append({
            "id_semester": semester_id,
            "id_veranstaltung": id_veranstaltung,
            "vorlesungsnummer": vorlesungsnummer_without_dot,
            "fak": fak,
            "thema": thema,
            "zusatz": zusatz,
            "zeit": str(row[7-1]).strip() if pd.notnull(row[7-1]) else "",
            "ort": "",
            "wochenstunden": "",
            "dozenten": dozenten
        })

    return veranstaltungen

def main(xlsx_folder):
    folder = Path(xlsx_folder)
    alle_veranstaltungen = []

    for file in sorted(folder.glob("*.xlsx")):
        print(f"Verarbeite: {file.name}")
        veranstaltungen = process_xlsx_file(file)
        alle_veranstaltungen.extend(veranstaltungen)

    with open(veranstaltungen_json, "w", encoding="utf-8") as f:
        json.dump(alle_veranstaltungen, f, ensure_ascii=False, indent=2)
    print(f"JSON geschrieben: {veranstaltungen_json}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python 3_semester-veranstaltungen.py ordner/mit/xlsx")
        sys.exit(1)
    main(sys.argv[1])
