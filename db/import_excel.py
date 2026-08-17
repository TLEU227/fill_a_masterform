#!/usr/bin/env python3
"""Importiert Systembewertungen_GESAMT.xlsx (Blatt 'SysBew') in eine neue
Masterform-Datenbank.

Wichtig zur Granularität (siehe docs/analyse_systembewertung_xlsx.md):
eine Excel-Zeile entspricht einer Dokumentversion, nicht zwangsläufig
einem eindeutigen System. Dieser Import legt daher pro Zeile einen
eigenen 'system'-Datensatz an (keine automatische Zusammenführung von
Dokumentversionen zum selben System) - das bleibt bewusst ein
Prüfschritt für den Menschen, siehe die offenen Fragen in der Analyse.
Bekannt aus 'Erkannte Version2' als final markierte Zeilen werden als
ist_aktuelle_version=ja gekennzeichnet; alle anderen bleiben ohne
Aussage (kein automatisches "nein"), weil das nicht zuverlässig aus
den Daten allein ableitbar ist.

Nutzung:
    python db/import_excel.py Systembewertungen_GESAMT.xlsx neue_db.sqlite
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from pathlib import Path

import openpyxl

SCHEMA_PATH = Path(__file__).parent / "schema.sql"
SEED_PATH = Path(__file__).parent / "seed_field_definitions.sql"

# Direkte 1:1-Spaltenübernahmen: Excel-Spaltenname -> field_key
DIRECT_MAP = {
    "MLCSID": "mlcs_id",
    "Betrieb": "bereich",
    "Gebaeude": "gebaeude",
    "Version": "dok_version",
    "Dok. -Nr.": "dok_nummer",
    "AS/BDIS-Name": "systemname",
    "Anlage": "anlage",
    "Raum": "raum",
    "Kurzbeschreibung": "kurzbeschreibung",
    "SW-Name:": "sw_name",
    "SW-Version / Typ:": "sw_version",
    "SW-Hersteller": "sw_hersteller",
    "Hersteller": "hersteller",
    "Phenix": "lieferantennummer",  # vom Nutzer bestaetigt: QualiPSO Third Party/Customer-ID
}

# Checkbox-Gruppen (c/r-Spalten) -> welcher Wert bei 'r' herauskommt
GXP_RELEVANT = {"GxP_Relevan_JA": "ja", "GxP_Relevan_NEIN": "nein"}
GXP_KRITIKALITAET = {"GxP-C": "Critical", "GxP-M": "Major", "GxP-m2": "Minor", "GxP-NA": "N/A"}
SYSTEMTYP = {
    "Systemtyp_CIS": "CIS", "Subtyp_PCS": "CE-PCS", "Subtyp_LCE": "CE-LCE", "Subtyp_EE": "CE-EE",
    "VNAP_S0": "S0", "VNAP_S1": "S1", "VNAP_S2": "S2", "Subtyp_NA": "N/A",
}
GAMP_KATEGORIE = {"KAT1": "1", "KAT3": "3", "KAT4": "4", "KAT5": "5", "KATNA": "N/A"}
ERES_TYP = {"ERESTYP1": "Typ 1", "ERESTYP2": "Typ 2", "ERESTYP3": "Typ 3", "ERESTYP4": "Typ 4", "ERESTYPNA": "N/A"}
# Geraetekategorie: Subkategorie hat Vorrang vor der (aelteren) Sammelspalte,
# siehe docs/analyse_systembewertung_xlsx.md ("1 ist doppelt").
GERAETEKATEGORIE = {
    "GKATB1": "B1", "GKATB2": "B2", "GKATB3": "B3",
    "GKATC1": "C1", "GKATC2": "C2",
    "GKATA": "A", "GKATB": "B", "GKATC": "C", "GKATNA": "N/A",
}
BUSINESS_CRITICAL = {"BCkritisch": "ja", "BCunkritisch": "nein"}


def col_index_map(header_row: tuple) -> dict[str, int]:
    return {name: i for i, name in enumerate(header_row) if name}


def is_marked(row: tuple, col_idx: dict, colname: str) -> bool:
    i = col_idx.get(colname)
    if i is None or i >= len(row):
        return False
    v = row[i]
    return isinstance(v, str) and v.strip().lower() == "r"


def pick_from_group(row: tuple, col_idx: dict, group: dict[str, str]) -> str | None:
    for colname, value in group.items():
        if is_marked(row, col_idx, colname):
            return value
    return None


def get(row: tuple, col_idx: dict, colname: str):
    i = col_idx.get(colname)
    if i is None or i >= len(row):
        return None
    v = row[i]
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return str(v)


PLACEHOLDER_DOKNR = re.compile(r"^qu-ope-x+$", re.IGNORECASE)


def import_workbook(xlsx_path: Path, conn: sqlite3.Connection) -> dict:
    wb = openpyxl.load_workbook(xlsx_path, data_only=True, read_only=True)
    ws = wb["SysBew"]
    rows = list(ws.iter_rows(values_only=True))
    col_idx = col_index_map(rows[0])
    data_rows = rows[1:]

    cur = conn.cursor()
    stats = {"importiert": 0, "final_markiert": 0, "warnungen": []}

    for excel_zeile, row in enumerate(data_rows, start=2):
        systemname = get(row, col_idx, "AS/BDIS-Name")
        mlcs_id = get(row, col_idx, "MLCSID")
        if not systemname and not mlcs_id:
            continue  # komplett leere Zeile ueberspringen

        cur.execute(
            "INSERT INTO records (entity_type, status, erstellt_von) VALUES ('system','entwurf','Excel-Import')"
        )
        record_id = cur.lastrowid

        def setval(field_key: str, value):
            if value is None or value == "":
                return
            cur.execute(
                "INSERT INTO field_values (record_id, field_key, wert) VALUES (?,?,?)",
                (record_id, field_key, str(value)),
            )

        for excel_col, field_key in DIRECT_MAP.items():
            setval(field_key, get(row, col_idx, excel_col))

        setval("gxp_relevant", pick_from_group(row, col_idx, GXP_RELEVANT))
        setval("gxp_kritikalitaet", pick_from_group(row, col_idx, GXP_KRITIKALITAET))
        setval("systemtyp", pick_from_group(row, col_idx, SYSTEMTYP))
        setval("gamp_kategorie", pick_from_group(row, col_idx, GAMP_KATEGORIE))
        setval("eres_typ", pick_from_group(row, col_idx, ERES_TYP))
        setval("geraetekategorie", pick_from_group(row, col_idx, GERAETEKATEGORIE))
        setval("business_critical", pick_from_group(row, col_idx, BUSINESS_CRITICAL))
        setval("vq_erforderlich", "ja" if is_marked(row, col_idx, "QUAL") else ("nein" if col_idx.get("QUAL") is not None else None))
        setval("val_erforderlich", "ja" if is_marked(row, col_idx, "VAL") else ("nein" if col_idx.get("VAL") is not None else None))

        dok_nr = get(row, col_idx, "Dok. -Nr.")
        if dok_nr and PLACEHOLDER_DOKNR.match(dok_nr):
            stats["warnungen"].append(f"Zeile {excel_zeile}: Platzhalter-Dok.-Nr. '{dok_nr}' übernommen (keine echte Nummer)")

        erkannte_version = get(row, col_idx, "Erkannte Version2")
        if erkannte_version:
            setval("ist_aktuelle_version", "ja")
            stats["final_markiert"] += 1
        # kein 'nein' fuer die anderen - siehe Modulbeschreibung oben

        setval("herkunft", f"Excel-Import: Systembewertungen_GESAMT.xlsx, Zeile {excel_zeile}")

        stats["importiert"] += 1

    conn.commit()
    return stats


def init_db(db_path: Path) -> sqlite3.Connection:
    if db_path.exists():
        raise FileExistsError(f"{db_path} existiert bereits - nicht überschrieben.")
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.executescript(SEED_PATH.read_text(encoding="utf-8"))
    return conn


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("xlsx_path", help="Pfad zu Systembewertungen_GESAMT.xlsx")
    parser.add_argument("db_path", help="Pfad für die neue .sqlite-Datei")
    args = parser.parse_args(argv)

    xlsx_path = Path(args.xlsx_path)
    db_path = Path(args.db_path)

    try:
        conn = init_db(db_path)
    except FileExistsError as e:
        print(f"Fehler: {e}", file=sys.stderr)
        return 1

    stats = import_workbook(xlsx_path, conn)
    conn.close()

    print(f"Importiert: {stats['importiert']} Systemdatensätze -> {db_path}")
    print(f"Davon als 'aktuelle Version' markiert (Erkannte Version2 gesetzt): {stats['final_markiert']}")
    if stats["warnungen"]:
        print(f"\n{len(stats['warnungen'])} Warnungen (Platzhalter-Dok.-Nr.):")
        for w in stats["warnungen"][:10]:
            print(" -", w)
        if len(stats["warnungen"]) > 10:
            print(f"   ... und {len(stats['warnungen']) - 10} weitere")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
