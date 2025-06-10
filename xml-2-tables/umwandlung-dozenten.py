import xml.etree.ElementTree as ET
import pandas as pd
import sys
from pathlib import Path

def main(pfad):
    
    NS = "{http://histvv.uni-leipzig.de/ns/2007}"
    tree = ET.parse(pfad)
    root = tree.getroot()

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
            elif text.isdigit():
                id_fakultaet = text

        wikipedia = dozent.findtext(f"{NS}url")
        pnd = dozent.findtext(f"{NS}pnd")

        dozenten_data.append({
            "id": dozent.get("{http://www.w3.org/XML/1998/namespace}id"),
            "nachname": nachname,
            "vorname": vorname,
            "geboren": geboren_jahr,
            "gestorben": gestorben_jahr,
            "pnd": pnd,
            "wikipedia": wikipedia,
            "gagliardi": gagliardi,
            "dekanat": dekanat,
            "rektor": rektor,
            "id_fakultaet": id_fakultaet
        })

    df_dozenten = pd.DataFrame(dozenten_data)

    # CSV schreiben (Tilde-getrennt)
    dozenten_csv = "tbl_dozenten.csv"
    df_dozenten.to_csv(dozenten_csv, index=False, sep="~")
    print(f"CSV geschrieben: {dozenten_csv}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python umwandlung-dozenten.py pfad/zur/dozenten.xml")
        sys.exit(1)
    main(sys.argv[1])
