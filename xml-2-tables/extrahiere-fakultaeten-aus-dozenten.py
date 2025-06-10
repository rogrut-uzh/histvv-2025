import xml.etree.ElementTree as ET
import pandas as pd
import sys

def main(pfad):
    NS = "{http://histvv.uni-leipzig.de/ns/2007}"

    tree = ET.parse(pfad)
    root = tree.getroot()

    fakultaeten_set = set()

    for dozent in root.findall(f"{NS}dozent"):
        for absatz in dozent.findall(f"{NS}absatz"):
            text = absatz.text.strip() if absatz.text else ""
            if not text.startswith(("UZV:", "Dekan:", "Rektor:")):
                fakultaeten_set.add(text)

    fakultaeten_liste = sorted(fakultaeten_set)

    df = pd.DataFrame({
        "id": range(1, len(fakultaeten_liste) + 1),
        "fakultaet": fakultaeten_liste
    })

    fak_csv = "tbl_fakultaeten.csv"
    df.to_csv(fak_csv, index=False, sep="~")
    print(f"CSV geschrieben: {fak_csv}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python extrahiere-fakultaeten-aus-dozenten.py pfad/zur/dozenten.xml")
        sys.exit(1)
    main(sys.argv[1])
