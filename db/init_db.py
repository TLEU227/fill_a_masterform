#!/usr/bin/env python3
"""Erzeugt eine neue, leere Masterform-Datenbank (.sqlite) aus schema.sql
+ der Start-Feldliste in seed_field_definitions.sql.

Kein SQL-Wissen nötig, um das zu benutzen:

    python db/init_db.py meine_datenbank.sqlite

Existiert die Datei schon, bricht das Skript ab (kein versehentliches
Überschreiben). Diese Datenbank enthält noch keine echten Systemdaten -
nur die Struktur (Objektarten + Felder), bereit zum Befüllen über die
künftige Browser-Oberfläche (Task #3).
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

SCHEMA_PATH = Path(__file__).parent / "schema.sql"
SEED_PATH = Path(__file__).parent / "seed_field_definitions.sql"


def init_db(db_path: Path) -> None:
    if db_path.exists():
        raise FileExistsError(f"{db_path} existiert bereits - nicht überschrieben.")

    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        conn.executescript(SEED_PATH.read_text(encoding="utf-8"))
        conn.commit()
    finally:
        conn.close()


def print_summary(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        print(f"Datenbank erstellt: {db_path}\n")
        cur.execute("SELECT key, label FROM entity_types ORDER BY key")
        print("Objektarten:")
        for key, label in cur.fetchall():
            cur.execute(
                "SELECT COUNT(*) FROM field_definitions WHERE entity_type = ?", (key,)
            )
            (n_fields,) = cur.fetchone()
            print(f"  - {label} ({key}): {n_fields} Felder definiert")
    finally:
        conn.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path", help="Pfad für die neue .sqlite-Datei")
    args = parser.parse_args(argv)

    db_path = Path(args.db_path)
    try:
        init_db(db_path)
    except FileExistsError as e:
        print(f"Fehler: {e}", file=sys.stderr)
        return 1

    print_summary(db_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
