import pandas as pd
import json
import os

# Pfade anpassen

excel_path = os.path.expanduser("~/gitlab-repositories/histvv-2025/data-migration/xlsx_1900-/Dozierendenverzeichnis.xlsx")
json_path = os.path.expanduser("~/gitlab-repositories/histvv-2025/data/tbl_dozenten.json")
output_path = os.path.expanduser("~/gitlab-repositories/histvv-2025/data-migration/xlsx_1900-/Dozierendenverzeichnis-Abgleich.xlsx")

# Lade Excel und JSON
df = pd.read_excel(excel_path, dtype=str)
with open(json_path, encoding="utf-8") as f:
    dozenten = json.load(f)

# Lookup-Tabelle nach (nachname, vorname, geboren)
lookup = {
    (
        d.get("nachname", "").strip().lower(),
        d.get("vorname", "").strip().lower(),
        str(d.get("geboren", "")).strip()
    ): d.get("id_dozent")
    for d in dozenten
}

# Spalte sicherstellen
if "id_dozent_alt" not in df.columns:
    df["id_dozent_alt"] = ""

# Durchlaufe alle Zeilen und ergänze id_dozent_alt, falls Treffer
for idx, row in df.iterrows():
    key = (
        str(row.get("nachname", "")).strip().lower(),
        str(row.get("vorname", "")).strip().lower(),
        str(row.get("geboren", "")).strip()
    )
    id_dozent = lookup.get(key)
    if id_dozent:
        df.at[idx, "id_dozent_alt"] = id_dozent

# Schreibe Ergebnis in neue Excel-Datei
df.to_excel(output_path, index=False)
print(f"Fertig. Neue Datei geschrieben: {output_path}")
