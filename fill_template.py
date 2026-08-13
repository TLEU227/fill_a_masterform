#!/usr/bin/env python3
"""CLI zum Ausfüllen eines reinen Text-Templates (.docx).

Beispiel:
    python fill_template.py vorlage.docx ausgefuellt.docx --data werte.json
    python fill_template.py vorlage.docx ausgefuellt.docx --set name=Anna --set firma="ACME GmbH"
"""

from __future__ import annotations

import argparse
import json
import sys

from masterform import fill_template, find_placeholders


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Füllt ein Word-Text-Template (.docx) mit Platzhaltern wie {{feld}}."
    )
    parser.add_argument("template", help="Pfad zur Vorlage (.docx)")
    parser.add_argument("output", nargs="?", help="Pfad für die ausgefüllte Datei (.docx)")
    parser.add_argument("--data", help="JSON-Datei mit den Werten (z.B. werte.json)")
    parser.add_argument(
        "--set",
        action="append",
        default=[],
        metavar="SCHLUESSEL=WERT",
        help="Einzelner Wert, z.B. --set name=Anna (kann mehrfach angegeben werden)",
    )
    parser.add_argument(
        "--list-placeholders",
        action="store_true",
        help="Zeigt nur alle im Template gefundenen Platzhalter an und beendet.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.list_placeholders:
        for name in sorted(find_placeholders(args.template)):
            print(name)
        return 0

    if not args.output:
        print("Fehler: 'output' ist erforderlich, außer bei --list-placeholders.", file=sys.stderr)
        return 2

    data: dict[str, object] = {}
    if args.data:
        with open(args.data, encoding="utf-8") as f:
            data.update(json.load(f))
    for item in args.set:
        key, sep, value = item.partition("=")
        if not sep:
            print(f"Fehler: --set erwartet SCHLUESSEL=WERT, bekommen: {item!r}", file=sys.stderr)
            return 2
        data[key] = value

    fill_template(args.template, args.output, data)
    print(f"Fertig: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
