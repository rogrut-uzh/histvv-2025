import xml.etree.ElementTree as ET
import json
from pathlib import Path
import re
import sys
import os

# Namespace definieren
NS     = "{http://histvv.uni-leipzig.de/ns/2007}"
XML_NS = "{http://www.w3.org/XML/1998/namespace}"

veranstaltungen_json = os.path.expanduser("~/gitlab-repositories/histvv-2025/data/tbl_veranstaltungen.json")

def normalize_whitespace(text):
    if text is None:
        return None
    text = text.replace('\n', ' ')
    return re.sub(r'\s+', ' ', text).strip()

def remove_brackets(text):
    if text is None:
        return None
    return text.replace('[', '').replace(']', '').strip()

def process_sachgruppe(sachgruppe_elem, fakultaet_name, veranstaltungen, id_semester):
    # Prüfen ob diese sachgruppe eine neue fakultät definiert
    if "fakultät" in sachgruppe_elem.attrib:
        fakultaet_name = sachgruppe_elem.find(f"{NS}titel").text.strip()

    # Alle <veranstaltung>-Elemente in dieser sachgruppe auslesen
    for veranstaltung in sachgruppe_elem.findall(f"{NS}veranstaltung"):
        
        vorlesungsnummer = remove_brackets(veranstaltung.findtext(f"{NS}nr"))
        thema = normalize_whitespace(veranstaltung.findtext(f"{NS}thema"))
        zusatz = normalize_whitespace(ET.tostring(veranstaltung.find(f"{NS}zusatz"), encoding="unicode", method="text").strip()) if veranstaltung.find(f"{NS}zusatz") is not None else None
        zeit = normalize_whitespace(veranstaltung.findtext(f"{NS}zeit"))
        wochenstunden = veranstaltung.findtext(f"{NS}wochenstunden")
        ort = veranstaltung.findtext(f"{NS}ort")
        id_veranstaltung = veranstaltung.get(f"{XML_NS}id")
        
        dozenten = []
        for dozent_el in veranstaltung.findall(f"{NS}dozent"):
            # nachname und vorname werden nicht gebraucht. Die Angaben werden von den Dozenten Table übernommen. 
            # Ich lasse die Angaben trotzdem noch hier drin.
            dozent = {
                "id_dozent": dozent_el.get("ref"),
                "nachname": normalize_whitespace(dozent_el.findtext(f"{NS}nachname")),
                "vorname": normalize_whitespace(dozent_el.findtext(f"{NS}vorname")),
                "grad": dozent_el.findtext(f"{NS}grad"),
                "funktion": dozent_el.findtext(f"{NS}funktion"),
            }
            dozenten.append(dozent)

        veranstaltungen.append({
            "id_semester": id_semester,
            "vorlesungsnummer": vorlesungsnummer,
            "id_veranstaltung": id_veranstaltung,
            "dozenten": dozenten,
            "thema": thema,
            "zusatz": zusatz,
            "zeit": zeit,
            "wochenstunden": wochenstunden,
            "ort": ort,
            "fak": fakultaet_name
        })

    # Rekursion in Kind-Sachgruppen
    for child_sachgruppe in sachgruppe_elem.findall(f"{NS}sachgruppe"):
        process_sachgruppe(child_sachgruppe, fakultaet_name, veranstaltungen, id_semester)

def parse_veranstaltungen(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    veranstaltungen = []

    # Start bei allen "obersten" sachgruppe-Elementen
    for sachgruppe_elem in root.findall(f".//{NS}sachgruppe[@fakultät]"):
        process_sachgruppe(sachgruppe_elem, None, veranstaltungen, file_path.stem)
    return veranstaltungen

def parse_semester_files(pfad):
    semester_files = list(pfad.glob("[0-9][0-9][0-9][0-9][sw].xml"))
    alle_veranstaltungen = []

    for file in semester_files:
        print(f"Verarbeite: {file.name}")
        veranstaltungen = parse_veranstaltungen(file)
        alle_veranstaltungen.extend(veranstaltungen)
        
    # JSON speichern
    with open(veranstaltungen_json, "w", encoding="utf-8") as f:
        json.dump(alle_veranstaltungen, f, ensure_ascii=False, indent=2)
    print(f"JSON geschrieben: {veranstaltungen_json}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python 3_semester-veranstaltungen.py ordnerpfad/zu/semester-xmls")
        sys.exit(1)

    pfad = Path(sys.argv[1])
    if not pfad.exists() or not pfad.is_dir():
        print(f"Pfad ungültig oder kein Verzeichnis: {pfad}")
        sys.exit(1)

    parse_semester_files(pfad)
