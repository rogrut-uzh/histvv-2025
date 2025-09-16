import xml.etree.ElementTree as ET
import sys
import json
import os
import argparse
import pandas as pd

DEFAULT_XML = "~/gitlab-repositories/histvv-2025/data-migration/xml_1833-1900/dozenten.xml"
DEFAULT_XLSX = "~/gitlab-repositories/histvv-2025/data-migration/xlsx_1900-/Dozierendenverzeichnis.xlsx"
DEFAULT_OUT = "~/gitlab-repositories/histvv-2025/data/tbl_dozenten.json"

def resolve(p: str) -> str:
    return os.path.abspath(os.path.expanduser(p))

def parse_xml(xml_path):
    NS = "{http://histvv.uni-leipzig.de/ns/2007}"
    tree = ET.parse(xml_path)
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

        gagliardi = None
        dekanat = None
        rektor = None
        fakultaet_text = None

        for absatz in dozent.findall(f"{NS}absatz"):
            text = absatz.text.strip() if absatz.text else ""
            if text.startswith("UZV:"):
                gagliardi = text
            elif text.startswith("Dekan:"):
                dekanat = text
            elif text.startswith("Rektor:"):
                rektor = text
            else:
                fakultaet_text = text

        pnd = dozent.findtext(f"{NS}pnd")

        url_elems = dozent.findall(f"{NS}url")
        wikipedia_url = None
        other_urls = []
        for url_elem in url_elems:
            url = url_elem.text.strip() if url_elem.text else ""
            if not url:
                continue
            if "wikipedia" in url.lower():
                wikipedia_url = url
            else:
                other_urls.append(url)

        dozent_entry = {
            "id_dozent": dozent.get("{http://www.w3.org/XML/1998/namespace}id"),
            "fak": fakultaet_text,
            "nachname": nachname,
            "vorname": vorname,
            "geboren": geboren_jahr,
            "gestorben": gestorben_jahr,
            "pnd": pnd,
            "gagliardi": gagliardi,
            "dekanat": dekanat,
            "rektor": rektor,
            "wikipedia": wikipedia_url if wikipedia_url else None,
            "url": other_urls if other_urls else None,
            "wikidata": None,
            "fachgebiet": None,
            "habilitation": None,
            "berufung": None,
        }

        dozenten_data.append(dozent_entry)

    return dozenten_data

def parse_xlsx(xlsx_path):
    df = pd.read_excel(xlsx_path, dtype=str)  # engine=openpyxl optional
    df.columns = [c.lower() for c in df.columns]
    dozenten_data = []

    for _, row in df.iterrows():
        def safe_get(col):
            return str(row[col]).strip() if col in row and pd.notnull(row[col]) else None

        url_list = None
        if 'url' in row and pd.notnull(row['url']):
            urls = [u.strip() for u in str(row['url']).split('|') if u.strip()]
            url_list = urls if urls else None

        dozent_entry = {
            "id_dozent": safe_get('id_dozent'),
            "fak": safe_get('id_fakultaet'),
            "nachname": safe_get('nachname'),
            "vorname": safe_get('vorname'),
            "geboren": safe_get('geboren'),
            "gestorben": safe_get('gestorben'),
            "pnd": safe_get('gnd'),
            "gagliardi": None,
            "dekanat": safe_get('dekanat'),
            "rektor": safe_get('rektor'),
            "wikipedia": None,  # kein Wikipedia im XLSX
            "url": url_list,
            "wikidata": safe_get('wikidata'),
            "fachgebiet": safe_get('fachgebiet'),
            "habilitation": safe_get('habilitation'),
            "berufung": safe_get('berufung')
        }
        dozenten_data.append(dozent_entry)
    return dozenten_data

def main(xml_path, xlsx_path, out_json):
    # Pfade auflösen
    xml_path = resolve(xml_path)
    xlsx_path = resolve(xlsx_path)
    out_json = resolve(out_json)

    # Existenz prüfen
    if not os.path.exists(xml_path):
        print(f"Fehler: XML nicht gefunden: {xml_path}", file=sys.stderr)
        sys.exit(2)
    if not os.path.exists(xlsx_path):
        print(f"Fehler: XLSX nicht gefunden: {xlsx_path}", file=sys.stderr)
        sys.exit(2)

    # Output-Ordner anlegen
    os.makedirs(os.path.dirname(out_json), exist_ok=True)

    dozenten_xml = parse_xml(xml_path)
    dozenten_xlsx = parse_xlsx(xlsx_path)

    # Dict mit allen XML-Dozenten nach ID
    dozenten_by_id = {d["id_dozent"]: d for d in dozenten_xml if d.get("id_dozent")}

    for d_xlsx in dozenten_xlsx:
        idd = d_xlsx.get("id_dozent")
        if not idd:
            continue
        if idd in dozenten_by_id:
            d_xml = dozenten_by_id[idd]
            wikipedia = d_xml.get("wikipedia")
            urls_xml = d_xml.get("url") or []
            urls_xlsx = d_xlsx.get("url") or []

            if isinstance(urls_xml, str):  # safety
                urls_xml = [urls_xml]
            if isinstance(urls_xlsx, str):
                urls_xlsx = [urls_xlsx]

            merged_urls = list(dict.fromkeys(urls_xml + urls_xlsx)) if (urls_xml or urls_xlsx) else None

            for k in d_xlsx:
                if k not in ["wikipedia", "url"]:
                    d_xml[k] = d_xlsx[k]
            d_xml["wikipedia"] = wikipedia
            d_xml["url"] = merged_urls
            dozenten_by_id[idd] = d_xml
        else:
            dozenten_by_id[idd] = d_xlsx

    dozenten_gesamt = list(dozenten_by_id.values())

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(dozenten_gesamt, f, ensure_ascii=False, indent=2)
    print(f"JSON geschrieben: {out_json}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="XML + XLSX zu Dozenten-JSON mergen")
    parser.add_argument("--xml", default=DEFAULT_XML, help="Pfad zur XML-Datei")
    parser.add_argument("--xlsx", default=DEFAULT_XLSX, help="Pfad zur XLSX-Datei")
    parser.add_argument("-o", "--out", default=DEFAULT_OUT, help="Zielpfad für JSON")

    args = parser.parse_args()
    main(args.xml, args.xlsx, args.out)
