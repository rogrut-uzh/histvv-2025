import xml.etree.ElementTree as ET
import pandas as pd
import sys
from pathlib import Path

def main(pfad):
    NS = "{http://histvv.uni-leipzig.de/ns/2007}"
    tree = ET.parse(pfad)
    root = tree.getroot()
    
    ################################
    # 1) Create tbl_fakultaeten.csv 
    ################################
    fakultaeten_set = set()

    for dozent in root.findall(f"{NS}dozent"):
        for absatz in dozent.findall(f"{NS}absatz"):
            text = absatz.text.strip() if absatz.text else ""
            if not text.startswith(("UZV:", "Dekan:", "Rektor:")):
                fakultaeten_set.add(text)

    fakultaeten_liste = sorted(fakultaeten_set)

    df = pd.DataFrame({
        "id_fakultaet": range(1, len(fakultaeten_liste) + 1),
        "fakultaet": fakultaeten_liste
    })

    fak_csv = "tbl_fakultaeten.csv"
    df.to_csv(fak_csv, index=False, sep="~")
    print(f"CSV geschrieben: {fak_csv}")

    ################################
    # 2) Create tbl_dozenten.csv 
    ################################

    dozenten_data = []
    for dozent in root.findall(f"{NS}dozent"):
        name_el = dozent.find(f"{NS}name")
        nachname = name_el.findtext(f"{NS}nachname") if name_el is not None else None
        vorname = name_el.findtext(f"{NS}vorname") if name_el is not None else None

        geboren_el = dozent.find(f"{NS}geboren")
        geboren_jahr = geboren_el.findtext(f"{NS}jahr") if geboren_el is not None else None

        gestorben_el = dozent.find(f"{NS}gestorben")
        gestorben_jahr = gestorben_el.findtext(f"{NS}jahr") if gestorben_el is not None else None

        # Initialwerte für besondere <absatz>-Typen
        gagliardi = None
        dekanat = None
        rektor = None
        id_fakultaet = None

        for absatz in dozent.findall(f"{NS}absatz"):
            text = absatz.text.strip() if absatz.text else ""
            if text.startswith("UZV:"):
                gagliardi = text
            elif text.startswith("Dekan:"):
                dekanat = text
            elif text.startswith("Rektor:"):
                rektor = text
            else:
                txt_fakultaet = text

        # ID der Fakultät einlesen
        # (aus CSV von Schritt 1) in diesem Script)
        # 
        # CSV einlesen (Tilde-getrennt)
        df_fakultaeten = pd.read_csv(fak_csv, sep="~")

        # Suche in der Spalte 'fakultaet' und hole den zugehörigen 'id_fakultaet'-Wert
        row_fakultaeten = df_fakultaeten.loc[df_fakultaeten["fakultaet"] == txt_fakultaet]

        if not row_fakultaeten.empty:
            id_fakultaet = row_fakultaeten.iloc[0]["id_fakultaet"]
        else:
            id_fakultaet = None
            print("Fakultaet nicht gefunden!")

        wikipedia = dozent.findtext(f"{NS}url")
        pnd = dozent.findtext(f"{NS}pnd")

        dozenten_data.append({
            "id_dozent": dozent.get("{http://www.w3.org/XML/1998/namespace}id"),
            "id_fakultaet": id_fakultaet,
            "nachname": nachname,
            "vorname": vorname,
            "geboren": geboren_jahr,
            "gestorben": gestorben_jahr,
            "pnd": pnd,
            "wikipedia": wikipedia,
            "gagliardi": gagliardi,
            "dekanat": dekanat,
            "rektor": rektor
        })

    df_dozenten = pd.DataFrame(dozenten_data)

    # CSV schreiben (Tilde-getrennt)
    dozenten_csv = "tbl_dozenten.csv"
    df_dozenten.to_csv(dozenten_csv, index=False, sep="~")
    print(f"CSV geschrieben: {dozenten_csv}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python umwandlung-dozenten.py pfad/zu/dozenten.xml")
        sys.exit(1)
    main(sys.argv[1])
