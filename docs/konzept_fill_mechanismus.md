# Konzept: Fill-Mechanismus für VP/VB/xQTP (ohne Template-Änderung)

Ergänzt `docs/analyse_weitere_templates.md`. Ziel: die Original-`.docx`-
Dateien **unverändert** als Eingabe nehmen und eine ausgefüllte Kopie
erzeugen – keine Anpassung der Templates selbst nötig.

## Validierter Befund: VP/VB/xQTP brauchen nur 2 Techniken, nicht 3

Beim genauen Nachsehen sind in VP/VB/xQTP **alle 36–51 Content Controls
ausschließlich Checkboxen**. Die Text-Platzhalter ("zu benennen",
"ausfüllen", "XXXX", "DD.MM.202X" …) sind **ganz normaler Absatz-/
Tabellentext**, kein Content Control. Nur **VQ** nutzt echte
Text-Content-Controls ("Klicken oder tippen Sie hier, um Text
einzugeben."). Das reduziert den Aufwand deutlich:

1. **Text-Platzhalter** (VP/VB/xQTP, alle Kopf-/Rollen-/Referenzfelder):
   exakt dieselbe Technik wie unser bestehendes `masterform.fill`-Modul
   (Run-genaue Ersetzung über zusammengesetzten Text) – nur die
   Erkennung ändert sich: statt `{{key}}` wird nach bekannten
   Marker-Strings gesucht ("zu benennen", "ausfüllen", "XXXX", "xxxxxx",
   "DD.MM.202X" …), im Kontext der Tabellenzeile/des Labels davor.
2. **Checkboxen** (`w14:checkbox`-Content-Controls, in allen vier
   Templates): neue, aber kleine Funktion – siehe unten.
3. **Echte Text-Content-Controls** (bisher nur in VQ gefunden): Text
   direkt im `sdtContent` ersetzen, Zuordnung nur über Position/Label
   möglich (keine Tags vorhanden).

## Checkboxen: technisch geprüft, wie ein Ankreuzen aussieht

Eine Checkbox ist ein Content Control mit z.B.:

```xml
<w14:checkbox>
  <w14:checked w14:val="0"/>
  <w14:checkedState w14:val="2612" w14:font="MS Gothic"/>
  <w14:uncheckedState w14:val="2610" w14:font="MS Gothic"/>
</w14:checkbox>
```

Zum Ankreuzen: `w14:checked` auf `1` setzen **und** das angezeigte
Zeichen im Inhalt von U+2610 (☐) auf U+2612 (☒) ändern (Word zeigt sonst
ggf. den alten Zustand, bis das Dokument neu berechnet wird). Beides
zusammen ist eine reine, lokale XML-Änderung – keine Verschiebung von
Text/Layout.

## Text-Platzhalter: Farbe folgt der Template-eigenen Konvention

Geprüft am Beispiel "zu benennen" (Systemname-Feld in VP): Der Run hat
`<w:color w:val="0070C0"/>` (Blau) – passend zur Legende, die **im
Template selbst steht**: *"Blaue Schrift = Bei Bedarf anzupassen. Vor
Freigabe ist die Schrift schwarz zu formatieren."* Das heißt: die
Farbanpassung Blau→Schwarz beim Einsetzen des echten Werts ist **keine
Design-Entscheidung von uns**, sondern das Befolgen der Regel, die im
Dokument selbst schon dokumentiert ist – exakt das, was ein Mensch beim
manuellen Ausfüllen auch täte. Schriftart/-größe bleiben unverändert
(werden nicht angefasst), nur diese eine Farbeigenschaft wird nach
Ausfüllen korrigiert.

## Was wir zusätzlich brauchen (kein Eingriff in die Word-Datei)

Da Text-Platzhalter wie "zu benennen" keine eindeutigen Namen tragen (im
Gegensatz zu `{{key}}` oder `MERGEFIELD`), muss die Zuordnung
"dieser Platzhalter an dieser Stelle = dieses DB-Feld" **einmal pro
Template(-version)** explizit hinterlegt werden – nicht in der `.docx`,
sondern als separate Konfigurationsdatei in unserem Repo (z.B.
"in Tabelle 'Kopfdaten', Zeile 2, Spalte 2 = `systemname`"). Vorteil:
- Die Original-Datei bleibt exakt so, wie sie aus dem DMS kommt.
- Ändert Sanofi das Template künftig strukturell, muss nur diese
  Zuordnungsdatei aktualisiert werden, nicht der Fill-Mechanismus.
- **Sicherheitsnetz:** Vor dem Schreiben wird geprüft, ob an der
  erwarteten Stelle tatsächlich noch der erwartete Platzhaltertext steht.
  Stimmt das nicht mehr (Template wurde geändert), bricht der Import mit
  einer klaren Fehlermeldung ab, statt möglicherweise den falschen Wert
  in die falsche Zelle zu schreiben.

## Offen für wiederholende Tabellenzeilen (URS/RA/IQ/OQ/PQ)

Bleibt wie in `docs/analyse_weitere_templates.md` beschrieben: die
Vorlage enthält eine Beispielzeile, die pro tatsächlichem Datensatz
(Anforderung, Risiko, Prüfschritt) vervielfacht werden muss – das ist
Teil von Task #4, unabhängig von der Platzhalter-Technik in der Zeile
selbst.

**Konkrete Ausgangslage (bestätigt am VQ-Template):** die IQ-/OQ-/PQ-
Tabellen liefern **je 5 Beispielzeilen** fest im Template mit. Ein
System kann aber deutlich mehr (bis zu ~100) oder weniger Prüfschritte
brauchen. Der Fill-Mechanismus muss die Beispielzeile beim Erzeugen
also **klonen** (bei mehr als 5 Datensätzen) oder **entfernen** (bei
weniger), bis die Zeilenzahl zur tatsächlichen Datenmenge passt -
nicht nur Text in vorhandene Zeilen einsetzen. Das ist die eigentliche
Schwierigkeit von Task #4, nicht nur eine Formalität.
