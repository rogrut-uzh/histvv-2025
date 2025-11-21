import subprocess
import sys
from pathlib import Path

SCRIPTS = [
    "1_dozenten_xml-and-xlsx.py",
    "2_semester-header_xml.py",
    "31_semester-veranstaltungen_xml.py",
    "32_semester-veranstaltungen_xlsx.py",
    "33_semester-veranstaltungen_merge.py",
]

def run_script(script_path: Path) -> int:
    print(f"\n=== Starte {script_path.name} ===")
    result = subprocess.run([sys.executable, str(script_path)], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        print(f"FEHLER: {script_path.name} endete mit Code {result.returncode}", file=sys.stderr)
    return result.returncode

def main():
    base = Path(__file__).parent
    for name in SCRIPTS:
        script = base / name
        if not script.exists():
            print(f"Überspringe (nicht gefunden): {name}", file=sys.stderr)
            return 1
        rc = run_script(script)
        if rc != 0:
            print("Abbruch wegen Fehler.")
            return rc
    print("\nAlle Migrationen erfolgreich durchlaufen.")
    return 0

if __name__ == "__main__":
    sys.exit(main())