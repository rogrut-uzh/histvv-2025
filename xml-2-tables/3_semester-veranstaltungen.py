import xml.etree.ElementTree as ET
import pandas as pd
from pathlib import Path
import re
import sys


# Namespace definieren
NS     = "{http://histvv.uni-leipzig.de/ns/2007}"
XML_NS = "{http://www.w3.org/XML/1998/namespace}"



def normalize_whitespace(text):
    if text is None:
        return None
    # Erst Zeilenumbrüche entfernen (optional)
    text = text.replace('\n', ' ')
    # Dann mehrfaches Whitespace auf 1x reduzieren
    return re.sub(r'\s+', ' ', text).strip()


def remove_brackets(text):
    if text is None:
        return None
    return text.replace('[', '').replace(']', '').strip()


# Funktion für rekursive Verarbeitung
def process_sachgruppe(sachgruppe_elem, fakultaet_id, veranstaltungen, id_semester, fakultaet_mapping):
    # Prüfen ob diese sachgruppe eine neue fakultät definiert
    if "fakultät" in sachgruppe_elem.attrib:
        fakultaet_name = sachgruppe_elem.find(f"{NS}titel").text.strip()
        fakultaet_id = fakultaet_mapping.get(fakultaet_name)

    
    # Alle <veranstaltung>-Elemente in dieser sachgruppe auslesen
    for veranstaltung in sachgruppe_elem.findall(f"{NS}veranstaltung"):
        
        id_dozent = veranstaltung.find(f"{NS}dozent").get("ref") if veranstaltung.find(f"{NS}dozent").get("ref") is not None else None
        
        vorlesungsnummer = veranstaltung.findtext(f"{NS}nr")
        vorlesungsnummer = remove_brackets(vorlesungsnummer)
        
        nachname_dozent = veranstaltung.findtext(f"{NS}dozent/{NS}nachname") if veranstaltung.findtext(f"{NS}dozent/{NS}nachname") is not None else None
        nachname_dozent = normalize_whitespace(nachname_dozent)
        
        vorname_dozent = veranstaltung.findtext(f"{NS}dozent/{NS}vorname") if veranstaltung.findtext(f"{NS}dozent/{NS}vorname") is not None else None
        vorname_dozent = normalize_whitespace(vorname_dozent)
        
        thema = veranstaltung.findtext(f"{NS}thema") if veranstaltung.findtext(f"{NS}thema") is not None else None
        thema = normalize_whitespace(thema)
        
        zusatz = ET.tostring(veranstaltung.find(f"{NS}zusatz"), encoding="unicode", method="text").strip() if veranstaltung.find(f"{NS}zusatz") is not None else None
        zusatz = normalize_whitespace(zusatz)
        
        zeit = veranstaltung.findtext(f"{NS}zeit") if veranstaltung.findtext(f"{NS}zeit") is not None else None
        zeit = normalize_whitespace(zeit)
        
        wochenstunden = veranstaltung.findtext(f"{NS}wochenstunden") if veranstaltung.findtext(f"{NS}wochenstunden") is not None else None
        
        ort = veranstaltung.findtext(f"{NS}ort") if veranstaltung.findtext(f"{NS}ort") is not None else None
        
        
        if id_dozent == "od":
            nachname_dozent = "Ohne Dozentenangabe"
        
        
        veranstaltungen.append({
            "id_semester": id_semester,
            "vorlesungsnummer": vorlesungsnummer,
            "id_veranstaltung": veranstaltung.get(f"{XML_NS}id"),
            "id_dozent": id_dozent,
            "nachname_dozent": nachname_dozent,
            "vorname_dozent": vorname_dozent,
            "grad_dozent": veranstaltung.findtext(f"{NS}dozent/{NS}grad"),
            "funktion_dozent": veranstaltung.findtext(f"{NS}dozent/{NS}funktion"),
            "thema": thema,
            "zusatz": zusatz,
            "zeit": zeit,
            "wochenstunden": wochenstunden,
            "ort": ort,
            "fakultaet_id": fakultaet_id
        })

    # In alle Kind-Sachgruppen rekursiv gehen
    for child_sachgruppe in sachgruppe_elem.findall(f"{NS}sachgruppe"):
        process_sachgruppe(child_sachgruppe, fakultaet_id, veranstaltungen, id_semester, fakultaet_mapping)


# Hauptfunktion
def parse_veranstaltungen(file_path, fakultaet_mapping):
    tree = ET.parse(file_path)
    root = tree.getroot()

    veranstaltungen = []

    # Start bei allen "obersten" sachgruppe-Elementen
    for sachgruppe_elem in root.findall(f".//{NS}sachgruppe[@fakultät]"):
        process_sachgruppe(sachgruppe_elem, None, veranstaltungen, file_path.stem, fakultaet_mapping)

    return veranstaltungen


def parse_semester_files(pfad):
    # Fakultaeten-Mapping laden
    df_fakultaeten = pd.read_csv(f"{pfad}/tbl_fakultaeten.csv", sep="~")
    fakultaet_mapping = dict(zip(df_fakultaeten["fakultaet"], df_fakultaeten["id_fakultaet"]))

    veranstaltungen_csv = "tbl_veranstaltungen.csv"
    semester_files = list(pfad.glob("[0-9][0-9][0-9][0-9][sw].xml"))
    alle_veranstaltungen = []

    for file in semester_files:
        print(f"Verarbeite: {file.name}")
        veranstaltungen = parse_veranstaltungen(file, fakultaet_mapping)
        alle_veranstaltungen.extend(veranstaltungen)
        
    # DataFrame und CSV speichern
    df_veranstaltungen = pd.DataFrame(alle_veranstaltungen)
    df_veranstaltungen.to_csv(veranstaltungen_csv, index=False, sep="~")
    print(f"CSV geschrieben: {veranstaltungen_csv}")



if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python 3_semester-veranstaltungen.py ordnerpfad/zu/semester-xmls")
        sys.exit(1)

    pfad = Path(sys.argv[1])
    if not pfad.exists() or not pfad.is_dir():
        print(f"Pfad ungültig oder kein Verzeichnis: {pfad}")
        sys.exit(1)

    parse_semester_files(pfad)
