# fill_a_masterform

Ausfüllen von Word Dokumenten mittels Python.

Es gibt grundsätzlich zwei Arten von Word-Vorlagen, die befüllt werden
können:

1. **Reine Text-Templates** – ganz normaler Fließtext mit Platzhaltern wie
   `{{name}}`, die per Text-Ersetzung ausgetauscht werden. **Darauf
   konzentriert sich dieses Projekt aktuell.**
2. **Formulare mit echten Formularfeldern** (Content Controls /
   Legacy-Formularfelder) – erfordern eine andere Verarbeitung (Zugriff auf
   die Formularfeld-Objekte statt auf Fließtext) und sind noch nicht
   umgesetzt.

## Installation

```bash
pip install -r requirements.txt
# für Tests zusätzlich:
pip install -r requirements-dev.txt
```

## Vorlage erstellen

Platzhalter werden im Word-Dokument einfach als Text in der Form
`{{platzhalter_name}}` eingetragen – in Fließtext, Tabellenzellen sowie
Kopf- und Fußzeilen. Erlaubt sind Buchstaben, Zahlen, `_`, `-` und `.` im
Namen, z.B. `{{kunde.name}}`.

Ein Beispiel lässt sich per Skript erzeugen:

```bash
python examples/create_sample_template.py
```

Das erzeugt `examples/vorlage.docx` mit Platzhaltern wie `{{name}}`,
`{{firma}}`, `{{eintrittsdatum}}` usw.

## Vorlage ausfüllen

**Über eine JSON-Datei mit den Werten:**

```bash
python fill_template.py examples/vorlage.docx ausgefuellt.docx --data werte.json
```

`werte.json`:

```json
{
  "anrede": "Frau",
  "name": "Erika Musterfrau",
  "firma": "ACME GmbH",
  "eintrittsdatum": "01.03.2020",
  "unterzeichner": "Die Personalabteilung",
  "personalnummer": "98765",
  "datum": "13.08.2026"
}
```

**Oder direkt über einzelne Werte:**

```bash
python fill_template.py examples/vorlage.docx ausgefuellt.docx \
  --set name="Erika Musterfrau" --set firma="ACME GmbH"
```

**Alle Platzhalter einer Vorlage anzeigen** (z.B. um zu prüfen, welche
Werte benötigt werden):

```bash
python fill_template.py examples/vorlage.docx --list-placeholders
```

Platzhalter, für die kein Wert übergeben wird, bleiben unverändert im
Dokument stehen (kein Absturz, keine leeren Felder).

## Als Python-Bibliothek nutzen

```python
from masterform import fill_template

fill_template(
    "vorlage.docx",
    "ausgefuellt.docx",
    {"name": "Erika Musterfrau", "firma": "ACME GmbH"},
)
```

## Wie funktioniert die Ersetzung technisch?

Word teilt zusammenhängenden Text intern oft in mehrere "Runs" auf (z.B.
durch Autokorrektur oder minimale Formatierungswechsel), sodass ein
Platzhalter wie `{{name}}` manchmal über mehrere Runs verteilt ist. Eine
naive `str.replace()` je Run würde solche Platzhalter übersehen.
`masterform.fill` setzt den Absatztext deshalb erst komplett zusammen,
sucht dort nach Platzhaltern und schreibt die Ersetzung anschließend
Run-genau zurück – die vorhandene Formatierung (fett, Farbe, Schriftart
usw.) bleibt dabei so gut wie möglich erhalten.

## Tests

```bash
pytest tests/ -v
```
