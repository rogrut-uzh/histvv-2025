import xml.etree.ElementTree as ET
from pathlib import Path
import json
import argparse
import sys

# Namespace definieren
NS = "{http://histvv.uni-leipzig.de/ns/2007}"

# Default-Pfade (mit ~, werden später aufgelöst)
DEFAULT_SOURCE = "~/gitlab-repositories/histvv-2025/data-migration/xml_1833-1900/"
DEFAULT_OUT    = "~/gitlab-repositories/histvv-2025/data/tbl_semester_header.json"

static_semester_json = r"""
[
  {"id_semester":"1900w","titel":"Wintersemester 1900/01"},
  {"id_semester":"1901s","titel":"Sommersemester 1901"},
  {"id_semester":"1901w","titel":"Wintersemester 1901/02"},
  {"id_semester":"1902s","titel":"Sommersemester 1902"},
  {"id_semester":"1902w","titel":"Wintersemester 1902/03"},
  {"id_semester":"1903s","titel":"Sommersemester 1903"},
  {"id_semester":"1903w","titel":"Wintersemester 1903/04"},
  {"id_semester":"1904s","titel":"Sommersemester 1904"},
  {"id_semester":"1904w","titel":"Wintersemester 1904/05"},
  {"id_semester":"1905s","titel":"Sommersemester 1905"},
  {"id_semester":"1905w","titel":"Wintersemester 1905/06"},
  {"id_semester":"1906s","titel":"Sommersemester 1906"},
  {"id_semester":"1906w","titel":"Wintersemester 1906/07"},
  {"id_semester":"1907s","titel":"Sommersemester 1907"},
  {"id_semester":"1907w","titel":"Wintersemester 1907/08"},
  {"id_semester":"1908s","titel":"Sommersemester 1908"},
  {"id_semester":"1908w","titel":"Wintersemester 1908/09"},
  {"id_semester":"1909s","titel":"Sommersemester 1909"},
  {"id_semester":"1909w","titel":"Wintersemester 1909/10"},
  {"id_semester":"1910s","titel":"Sommersemester 1910"},
  {"id_semester":"1910w","titel":"Wintersemester 1910/11"},
  {"id_semester":"1911s","titel":"Sommersemester 1911"},
  {"id_semester":"1911w","titel":"Wintersemester 1911/12"},
  {"id_semester":"1912s","titel":"Sommersemester 1912"},
  {"id_semester":"1912w","titel":"Wintersemester 1912/13"},
  {"id_semester":"1913s","titel":"Sommersemester 1913"},
  {"id_semester":"1913w","titel":"Wintersemester 1913/14"},
  {"id_semester":"1914s","titel":"Sommersemester 1914"},
  {"id_semester":"1914w","titel":"Wintersemester 1914/15"},
  {"id_semester":"1915s","titel":"Sommersemester 1915"},
  {"id_semester":"1915w","titel":"Wintersemester 1915/16"},
  {"id_semester":"1916s","titel":"Sommersemester 1916"},
  {"id_semester":"1916w","titel":"Wintersemester 1916/17"},
  {"id_semester":"1917s","titel":"Sommersemester 1917"},
  {"id_semester":"1917w","titel":"Wintersemester 1917/18"},
  {"id_semester":"1918s","titel":"Sommersemester 1918"},
  {"id_semester":"1918w","titel":"Wintersemester 1918/19"},
  {"id_semester":"1919s","titel":"Sommersemester 1919"},
  {"id_semester":"1919w","titel":"Wintersemester 1919/20"},
  {"id_semester":"1920s","titel":"Sommersemester 1920"},
  {"id_semester":"1920w","titel":"Wintersemester 1920/21"},
  {"id_semester":"1921s","titel":"Sommersemester 1921"},
  {"id_semester":"1921w","titel":"Wintersemester 1921/22"},
  {"id_semester":"1922s","titel":"Sommersemester 1922"},
  {"id_semester":"1922w","titel":"Wintersemester 1922/23"},
  {"id_semester":"1923s","titel":"Sommersemester 1923"},
  {"id_semester":"1923w","titel":"Wintersemester 1923/24"},
  {"id_semester":"1924s","titel":"Sommersemester 1924"},
  {"id_semester":"1924w","titel":"Wintersemester 1924/25"},
  {"id_semester":"1925s","titel":"Sommersemester 1925"},
  {"id_semester":"1925w","titel":"Wintersemester 1925/26"},
  {"id_semester":"1926s","titel":"Sommersemester 1926"},
  {"id_semester":"1926w","titel":"Wintersemester 1926/27"},
  {"id_semester":"1927s","titel":"Sommersemester 1927"},
  {"id_semester":"1927w","titel":"Wintersemester 1927/28"},
  {"id_semester":"1928s","titel":"Sommersemester 1928"},
  {"id_semester":"1928w","titel":"Wintersemester 1928/29"},
  {"id_semester":"1929s","titel":"Sommersemester 1929"},
  {"id_semester":"1929w","titel":"Wintersemester 1929/30"},
  {"id_semester":"1930s","titel":"Sommersemester 1930"},
  {"id_semester":"1930w","titel":"Wintersemester 1930/31"},
  {"id_semester":"1931s","titel":"Sommersemester 1931"},
  {"id_semester":"1931w","titel":"Wintersemester 1931/32"},
  {"id_semester":"1932s","titel":"Sommersemester 1932"},
  {"id_semester":"1932w","titel":"Wintersemester 1932/33"},
  {"id_semester":"1933s","titel":"Sommersemester 1933"},
  {"id_semester":"1933w","titel":"Wintersemester 1933/34"},
  {"id_semester":"1934s","titel":"Sommersemester 1934"},
  {"id_semester":"1934w","titel":"Wintersemester 1934/35"},
  {"id_semester":"1935s","titel":"Sommersemester 1935"},
  {"id_semester":"1935w","titel":"Wintersemester 1935/36"},
  {"id_semester":"1936s","titel":"Sommersemester 1936"},
  {"id_semester":"1936w","titel":"Wintersemester 1936/37"},
  {"id_semester":"1937s","titel":"Sommersemester 1937"},
  {"id_semester":"1937w","titel":"Wintersemester 1937/38"},
  {"id_semester":"1938s","titel":"Sommersemester 1938"},
  {"id_semester":"1938w","titel":"Wintersemester 1938/39"},
  {"id_semester":"1939s","titel":"Sommersemester 1939"},
  {"id_semester":"1939w","titel":"Wintersemester 1939/40"},
  {"id_semester":"1940s","titel":"Sommersemester 1940"},
  {"id_semester":"1940w","titel":"Wintersemester 1940/41"}
]
""".strip()

def _resolve_path(p: str) -> Path:
    return Path(p).expanduser().resolve()

def parse_semester_files(src_dir: Path) -> list[dict]:
    # Dateien deterministisch sortieren (1900s, 1900w, …)
    semester_files = sorted(src_dir.glob("[0-9][0-9][0-9][0-9][sw].xml"))
    semester_data: list[dict] = []

    for file in semester_files:
        try:
            tree = ET.parse(file)
        except ET.ParseError as e:
            print(f"XML-Fehler in {file}: {e}", file=sys.stderr)
            continue

        root = tree.getroot()

        universitaet = root.findtext(f"{NS}kopf/{NS}universität")
        semester = root.findtext(f"{NS}kopf/{NS}semester")
        beginn = root.findtext(f"{NS}kopf/{NS}beginn/{NS}jahr")
        ende = root.findtext(f"{NS}kopf/{NS}ende/{NS}jahr")

        quelle_raw = root.findtext(f"{NS}kopf/{NS}quelle")
        # Whitespace „glätten“
        quelle = " ".join(quelle_raw.split()) if quelle_raw else None

        status = root.find(f"{NS}kopf/{NS}status")
        status_komplett = status.get("komplett") if status is not None else None
        titel = root.findtext(f"{NS}titel")

        semester_data.append({
            "id_semester": file.stem,   # Dateiname ohne .xml
            "dateiname": file.name,
            "universitaet": universitaet,
            "semester": semester,
            "beginn": beginn,
            "ende": ende,
            "quelle": quelle,
            "status_komplett": status_komplett,
            "titel": titel
        })

    # Statische Titel (falls in XML kein Titel vorhanden ist oder Datei fehlt)
    static_list = json.loads(static_semester_json)
    if static_list:
        by_id = {d.get("id_semester"): d for d in semester_data if d.get("id_semester")}
        for row in static_list:
            sid = row.get("id_semester")
            if not sid:
                continue
            if sid in by_id:
                if not by_id[sid].get("titel") and row.get("titel"):
                    by_id[sid]["titel"] = row["titel"]
            else:
                semester_data.append({
                    "id_semester": sid,
                    "dateiname": None,
                    "universitaet": None,
                    "semester": None,
                    "beginn": None,
                    "ende": None,
                    "quelle": None,
                    "status_komplett": None,
                    "titel": row.get("titel")
                })

    return semester_data

def write_json(semester_data: list[dict], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(semester_data, f, ensure_ascii=False, indent=2)
    print(f"JSON geschrieben: {out_path}")

def main():
    parser = argparse.ArgumentParser(
        description="Semester-Header aus XML-Dateien extrahieren und als JSON schreiben."
    )
    parser.add_argument(
        "src",
        nargs="?",
        default=DEFAULT_SOURCE,
        help="Ordnerpfad zu den Semester-XMLs (Default: %(default)s)",
    )
    parser.add_argument(
        "-o", "--out",
        default=DEFAULT_OUT,
        help="Zielpfad der JSON-Datei (Default: %(default)s)",
    )
    args = parser.parse_args()

    src_dir = _resolve_path(args.src)
    out_path = _resolve_path(args.out)

    if not src_dir.exists() or not src_dir.is_dir():
        print(f"Pfad ungültig oder kein Verzeichnis: {src_dir}", file=sys.stderr)
        sys.exit(1)

    data = parse_semester_files(src_dir)
    if not data:
        print("Warnung: Keine Semester-Dateien gefunden und keine statischen Einträge erzeugt.", file=sys.stderr)

    write_json(data, out_path)

if __name__ == "__main__":
    main()
