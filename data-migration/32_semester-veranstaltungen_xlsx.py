import pandas as pd
from pathlib import Path
import argparse
import json
import sys
import re
import os
import hashlib
import math

default_source_folder = Path("~/gitlab-repositories/histvv-2025/data-migration/xlsx_1900-").expanduser()
veranstaltungen_json  = Path("~/gitlab-repositories/histvv-2025/data/tbl_veranstaltungen-ab-1900w.json").expanduser()


def parse_args():
    parser = argparse.ArgumentParser(description="XLSX-Dateien einlesen und JSON erzeugen.")
    parser.add_argument(
        "xlsx_folder",
        nargs="?",
        default=default_source_folder,  # bereits Path
        type=lambda s: Path(os.path.expandvars(s)).expanduser().resolve(),  # ~ und $VARS
        help=f"Ordner mit den XLSX-Dateien (Default: {default_source_folder})",
    )
    return parser.parse_args()

def get_cell(row, i):
    # Liefert None zurück, wenn Spalte i nicht existiert
    return row.iloc[i] if i < len(row) else None

def clean(cell):
    if cell is None:
        return None # wird automatisch zu null
    # echte NaN (float) erkennen
    if isinstance(cell, float) and math.isnan(cell):
        return None
    s = str(cell).strip()
    if s == "" or s.lower() in {"nan", "na", "n/a", "null", "none", "-"}:
        return None
    return s

def get_semester_id_from_filename(filename):
    m = re.match(r"(\d{4})_(Winter|Sommer)", filename)
    if not m:
        return None
    year, halbjahr = m.groups()
    return f"{year}{'w' if halbjahr == 'Winter' else 's'}"

def make_unique_id(semester_id, vorlesungsnummer, thema, zusatz, dozid):
    basis = f"{semester_id}{vorlesungsnummer}{thema}{zusatz}{dozid}"
    return hashlib.sha1(basis.encode("utf-8")).hexdigest()[:8]

def process_xlsx_file(filepath):
    semester_id = get_semester_id_from_filename(filepath.stem)
    if not semester_id:
        print(f"Überspringe Datei mit ungültigem Namen: {filepath.name}")
        return []

    df = pd.read_excel(filepath, header=None, dtype=str)

    veranstaltungen = []
    for idx, row in df.iterrows():
        fak    = clean(get_cell(row, 4))
        thema  = clean(get_cell(row, 5))
        zusatz = clean(get_cell(row, 6))
        vorlesungsnummer = clean(get_cell(row, 3))
        vorlesungsnummer_without_dot = vorlesungsnummer.rstrip(".")

        # Dozenten-Array aufbauen (max. 4)
        dozenten = []
        # 1. Dozent (id, grad, funktion)
        id1 = clean(get_cell(row, 7))
        if id1:
            dozenten.append({
                "id_dozent": id1,
                "grad":      clean(get_cell(row, 8)),
                "funktion":  clean(get_cell(row, 9)),
            })

        # 2. Dozent (id, grad, KEINE funktion)
        id2 = clean(get_cell(row, 10))
        if id2:
            dozenten.append({
                "id_dozent": id2,
                "grad":      clean(get_cell(row, 11)),
                "funktion":  None,
            })

        # 3. Dozent (id, grad, KEINE funktion)
        id3 = clean(get_cell(row, 12))
        if id3:
            dozenten.append({
                "id_dozent": id3,
                "grad":      clean(get_cell(row, 13)),
                "funktion":  None,
            })

        # 4. Dozent (id, grad, KEINE funktion)
        id4 = clean(get_cell(row, 14))
        if id4:
            dozenten.append({
                "id_dozent": id4,
                "grad":      clean(get_cell(row, 15)),
                "funktion":  None,
            })

        id_veranstaltung = f"v-{make_unique_id(semester_id, vorlesungsnummer, thema, zusatz, id1)}"

        veranstaltungen.append({
            "typ": "veranstaltung",
            "id_semester": semester_id,
            "id_veranstaltung": id_veranstaltung,
            "vorlesungsnummer": vorlesungsnummer_without_dot,
            "fak": fak,
            "thema": thema,
            "thema_anmerkung": None,
            "zusatz": zusatz,
            "zeit": None,
            "ort": None,
            "wochenstunden": None,
            "dozenten": dozenten
        })

    return veranstaltungen

def main(xlsx_folder: Path):
    folder = Path(xlsx_folder)
    if not folder.exists():
        print(f"Ordner nicht gefunden: {folder}")
        sys.exit(1)

    alle_veranstaltungen = []

    for file in sorted(folder.glob("*Sommer.xlsx")) + sorted(folder.glob("*Winter.xlsx")):
        print(f"Verarbeite: {file.name}")
        veranstaltungen = process_xlsx_file(file)
        alle_veranstaltungen.extend(veranstaltungen)

    with open(veranstaltungen_json, "w", encoding="utf-8") as f:
        json.dump(alle_veranstaltungen, f, ensure_ascii=False, indent=2)
    print(f"JSON geschrieben: {veranstaltungen_json}")

if __name__ == "__main__":
    args = parse_args()
    main(args.xlsx_folder)
