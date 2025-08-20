# BENUTZUNG
#
# Standard (merge, sortiert/ohne dedup, löscht Inputs):
# python3 4_semester-veranstaltungen_merge.py --sort
# 
# Inputs behalten:
# python3 4_semester-veranstaltungen_merge.py --sort --keep
# 
# Duplikate (nach id_veranstaltung) entfernen:
# python3 4_semester-veranstaltungen_merge.py --sort --dedup
# 
# Anderer Ausgabename:
# python3 4_semester-veranstaltungen_merge.py --out pfad/zur/tbl_veranstaltungen-merged.json
import json
import argparse
from pathlib import Path

def load_array(path: Path):
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{path} enthält kein JSON-Array.")
    return data

def maybe_int(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return None

def main():
    parser = argparse.ArgumentParser(description="Merge von Vorlesungs-JSONs")
    parser.add_argument("--file1", default="~/gitlab-repositories/histvv-2025/data/tbl_veranstaltungen.json",
                        help="Erste Eingabedatei")
    parser.add_argument("--file2", default="~/gitlab-repositories/histvv-2025/data/tbl_veranstaltungen-ab-1900w.json",
                        help="Zweite Eingabedatei")
    parser.add_argument("--out", default="~/gitlab-repositories/histvv-2025/data/tbl_veranstaltungen-merged.json",
                        help="Ausgabedatei (Standard: ~/gitlab-repositories/histvv-2025/data/tbl_veranstaltungen-merged.json)")
    parser.add_argument("--keep", action="store_true",
                        help="Eingabedateien NICHT löschen")
    parser.add_argument("--dedup", action="store_true",
                        help="Duplikate nach id_veranstaltung entfernen")
    parser.add_argument("--sort", action="store_true",
                        help="Nach id_semester und vorlesungsnummer sortieren")
    args = parser.parse_args()

    file1 = Path(args.file1).expanduser()
    file2 = Path(args.file2).expanduser()
    out_path = Path(args.out).expanduser()
    tmp_path = out_path.with_suffix(out_path.suffix + ".tmp")


    # Einlesen
    arr1 = load_array(file1)
    arr2 = load_array(file2)

    merged = arr1 + arr2

    # Optional: Duplikate entfernen (Schlüssel: id_veranstaltung)
    if args.dedup:
        seen = set()
        unique = []
        for item in merged:
            key = item.get("id_veranstaltung")
            if key is None or key not in seen:
                unique.append(item)
                if key is not None:
                    seen.add(key)
        merged = unique

    # Optional: sortieren (id_semester, vorlesungsnummer numerisch, Fallback String)
    if args.sort:
        def sort_key(x):
            sem = x.get("id_semester", "")
            vn = x.get("vorlesungsnummer")
            vn_int = maybe_int(vn)
            # zuerst nach Semester, dann numerisch, dann als String-Fallback
            return (sem, vn_int if vn_int is not None else float("inf"), str(vn) if vn is not None else "")
        merged.sort(key=sort_key)

    # Schreiben (atomar via .tmp)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with tmp_path.open("w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp_path.replace(out_path)

    # Eingabedateien löschen (sofern nicht --keep)
    if not args.keep:
        for p in (file1, file2):
            try:
                p.unlink()
            except FileNotFoundError:
                pass

    print(f"OK: {len(arr1)} + {len(arr2)} → {len(merged)} Einträge in {out_path}")

if __name__ == "__main__":
    main()
