const pptxgen = require("pptxgenjs");

const PRIMARY = "065A82";   // deep blue - dominant
const SECONDARY = "1C7293"; // teal - supporting
const ACCENT = "21295C";    // midnight navy - dark bg / strong text
const WHITE = "FFFFFF";
const MUTED = "5B6B73";
const TINT = "EAF2F6";
const TINT2 = "DCEAF0";
const GOOD = "1C7293";
const TEXT_DARK = "1F2937";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
const PAGE_W = 13.33;
const PAGE_H = 7.5;

function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: ACCENT };
  return s;
}
function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  return s;
}

function iconCircle(slide, x, y, d, glyph, fill = PRIMARY, glyphColor = WHITE, glyphSize = 20) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" } });
  slide.addText(glyph, {
    x, y, w: d, h: d, align: "center", valign: "middle",
    fontSize: glyphSize, bold: true, color: glyphColor, fontFace: "Calibri", margin: 0,
  });
}

function footer(slide, pageNum, dark = false) {
  slide.addText("Masterform · Projektvorstellung", {
    x: 0.5, y: PAGE_H - 0.42, w: 6, h: 0.3, fontSize: 9.5,
    color: dark ? "AFC3D6" : MUTED, fontFace: "Calibri",
  });
  slide.addText(String(pageNum), {
    x: PAGE_W - 1.0, y: PAGE_H - 0.42, w: 0.5, h: 0.3, fontSize: 9.5,
    align: "right", color: dark ? "AFC3D6" : MUTED, fontFace: "Calibri",
  });
}

function sectionTitle(slide, kicker, title, opts = {}) {
  const dark = !!opts.dark;
  if (kicker) {
    slide.addText(kicker.toUpperCase(), {
      x: 0.6, y: 0.42, w: 10, h: 0.35, fontSize: 13, bold: true,
      color: dark ? "8FD6C9" : SECONDARY, charSpacing: 1, fontFace: "Calibri",
    });
  }
  slide.addText(title, {
    x: 0.6, y: kicker ? 0.75 : 0.5, w: 11.8, h: 0.8, fontSize: 30, bold: true,
    color: dark ? WHITE : ACCENT, fontFace: "Cambria",
  });
}

// ============================================================ Slide 1 · Title
{
  const s = darkSlide();
  iconCircle(s, 9.9, 1.2, 2.9, "", SECONDARY, WHITE, 1);
  s.addShape("ellipse", { x: 9.9, y: 1.2, w: 2.9, h: 2.9, fill: { color: "2C3D75" }, line: { type: "none" } });
  s.addShape("roundRect", { x: 10.55, y: 1.95, w: 1.6, h: 1.4, rectRadius: 0.08, fill: { color: WHITE }, line: { type: "none" } });
  s.addShape("line", { x: 10.85, y: 2.3, w: 1.0, h: 0, line: { color: TINT2, width: 1.5 } });
  s.addShape("line", { x: 10.85, y: 2.6, w: 1.0, h: 0, line: { color: TINT2, width: 1.5 } });
  s.addShape("line", { x: 10.85, y: 2.9, w: 0.7, h: 0, line: { color: TINT2, width: 1.5 } });

  s.addText("MASTERFORM", {
    x: 0.7, y: 2.55, w: 9.5, h: 1.0, fontSize: 46, bold: true, color: WHITE, fontFace: "Cambria",
  });
  s.addText("Automatisiertes Vorausfüllen von Qualifizierungs- und\nValidierungsdokumenten", {
    x: 0.72, y: 3.55, w: 9.2, h: 1.0, fontSize: 19, color: "CADCFC", fontFace: "Calibri", lineSpacingMultiple: 1.15,
  });
  s.addText("Projektvorstellung · Stand 15. August 2026", {
    x: 0.72, y: 5.35, w: 8, h: 0.4, fontSize: 14, color: "8FD6C9", bold: true, fontFace: "Calibri",
  });
}

// ============================================================ Slide 2 · Problem
{
  const s = lightSlide();
  sectionTitle(s, "Ausgangslage", "Viel Handarbeit, viele Wiederholungen");

  const items = [
    ["Qualifizierungsdokumente werden manuell ausgefüllt", "Systembewertung, VQ, CS-VP, CS-VB, xQTP – jedes Dokument einzeln von Hand."],
    ["Dieselben Werte immer wieder abgetippt", "Systemname, MLCS-ID, GxP-Kritikalität, Rollen, Gerätekategorie ... tauchen in mehreren Dokumenten auf."],
    ["Fehlerquelle bei wiederholter Eingabe", "Jede erneute Eingabe ist eine neue Chance für Tippfehler oder Inkonsistenzen zwischen Dokumenten."],
  ];
  let y = 1.85;
  items.forEach(([t, d], i) => {
    iconCircle(s, 0.6, y, 0.5, String(i + 1), PRIMARY, WHITE, 18);
    s.addText(t, { x: 1.35, y: y - 0.05, w: 6.9, h: 0.4, fontSize: 15.5, bold: true, color: TEXT_DARK, fontFace: "Calibri" });
    s.addText(d, { x: 1.35, y: y + 0.32, w: 6.9, h: 0.75, fontSize: 12.5, color: MUTED, fontFace: "Calibri", lineSpacingMultiple: 1.15 });
    y += 1.42;
  });

  // stat callout
  s.addShape("roundRect", { x: 8.75, y: 1.85, w: 3.9, h: 4.15, rectRadius: 0.12, fill: { color: TINT }, line: { type: "none" } });
  s.addText("733", { x: 8.75, y: 2.35, w: 3.9, h: 1.1, align: "center", fontSize: 60, bold: true, color: PRIMARY, fontFace: "Cambria" });
  s.addText("Systeme bereits in einer\nExcel-Sammlung erfasst", {
    x: 9.05, y: 3.45, w: 3.3, h: 0.8, align: "center", fontSize: 13.5, color: TEXT_DARK, fontFace: "Calibri", lineSpacingMultiple: 1.2,
  });
  s.addShape("line", { x: 9.25, y: 4.35, w: 2.9, h: 0, line: { color: TINT2, width: 1 } });
  s.addText("„Systembewertungen_GESAMT.xlsx“ – unsere Ausgangsbasis und erste Datenquelle für die neue Datenbank.", {
    x: 9.05, y: 4.55, w: 3.3, h: 1.2, align: "center", fontSize: 11.5, italic: true, color: MUTED, fontFace: "Calibri", lineSpacingMultiple: 1.2,
  });

  footer(s, 2);
}

// ============================================================ Slide 3 · Zielbild
{
  const s = lightSlide();
  sectionTitle(s, "Zielbild", "Einmal erfassen, überall wiederverwenden");

  // central DB box
  const cx = 3.55, cy = 3.55, cw = 3.0, ch = 1.5;
  s.addShape("roundRect", { x: cx, y: cy, w: cw, h: ch, rectRadius: 0.1, fill: { color: PRIMARY }, line: { type: "none" }, shadow: { type: "outer", color: "000000", opacity: 0.25, blur: 8, offset: 3, angle: 90 } });
  s.addText("Zentrale\nDatenbank", { x: cx, y: cy, w: cw, h: ch, align: "center", valign: "middle", fontSize: 18, bold: true, color: WHITE, fontFace: "Calibri" });

  const docs = ["Systembewertung", "CS-Validierungsplan", "CS-Validierungsbericht", "Vereinfachte\nQualifizierung (VQ)", "xQ-Testplan\n(IQ/OQ/PQ)"];
  const dx = 8.7, dw = 3.9, dh = 0.78, gap = 0.18;
  let dy = 1.55;
  docs.forEach((docName) => {
    s.addShape("roundRect", { x: dx, y: dy, w: dw, h: dh, rectRadius: 0.08, fill: { color: TINT }, line: { color: TINT2, width: 1 } });
    s.addText(docName, { x: dx + 0.15, y: dy, w: dw - 0.3, h: dh, align: "left", valign: "middle", fontSize: 13, bold: true, color: ACCENT, fontFace: "Calibri" });
    // connector line
    s.addShape("line", { x: cx + cw, y: cy + ch / 2, w: (dx - (cx + cw)), h: (dy + dh / 2) - (cy + ch / 2), line: { color: SECONDARY, width: 1.5, dashType: "solid" } });
    dy += dh + gap;
  });

  s.addText("Systemstammdaten, Rollen, Anforderungen (URS), Risiken (RA) und Prüfschritte (IQ/OQ/PQ/PPQ) werden einmal gepflegt –\njedes Dokument liest daraus, statt erneut abgefragt zu werden.", {
    x: 0.6, y: 5.65, w: 7.6, h: 1.1, fontSize: 12.5, color: MUTED, fontFace: "Calibri", lineSpacingMultiple: 1.25,
  });

  footer(s, 3);
}

// ============================================================ Slide 4 · Architektur-Prinzipien
{
  const s = lightSlide();
  sectionTitle(s, "Rahmenbedingungen", "Architektur-Prinzipien");

  const rows = [
    ["Kein eigener Server", "Web-basiert, aber rein im Browser (Chrome/Edge empfohlen) – kein Serverbetrieb nötig."],
    ["Eine einzelne Datenbank-Datei", "SQLite als eine transparente, portable Datei statt komplexer Server-Infrastruktur."],
    ["Erst 1 Nutzer, später mehrere", "Architektur schließt Mehrbenutzerbetrieb nicht aus, wird aber jetzt nicht überkonstruiert."],
    ["Einfacher Status statt vollem Audit-Trail", "Entwurf/Final-Kennzeichnung + grobe Änderungshistorie statt 21-CFR-Part-11-Niveau."],
    ["Code im Repo, Daten bleiben lokal", "Nur der Programmcode liegt im (Git-)Repository – echte Systemdaten und Templates nicht."],
  ];
  let y = 1.85;
  rows.forEach(([t, d], i) => {
    iconCircle(s, 0.6, y, 0.5, "✓", SECONDARY, WHITE, 18);
    s.addText(t, { x: 1.35, y: y - 0.06, w: 10.9, h: 0.35, fontSize: 15, bold: true, color: TEXT_DARK, fontFace: "Calibri" });
    s.addText(d, { x: 1.35, y: y + 0.28, w: 10.9, h: 0.4, fontSize: 12, color: MUTED, fontFace: "Calibri" });
    y += 0.98;
  });

  footer(s, 4);
}

// ============================================================ Slide 5 · Datenmodell
{
  const s = lightSlide();
  sectionTitle(s, "Datenmodell", "Ein Baukasten statt starrer Tabellen");

  const entities = ["System", "Person", "Anforderung\n(URS)", "Risiko\n(RA)", "Prüfschritt\n(IQ/OQ/PQ/PPQ)"];
  let ex = 0.6;
  const ew = 1.55, eh = 1.15, egap = 0.18;
  entities.forEach((name) => {
    s.addShape("roundRect", { x: ex, y: 1.9, w: ew, h: eh, rectRadius: 0.09, fill: { color: PRIMARY }, line: { type: "none" } });
    s.addText(name, { x: ex, y: 1.9, w: ew, h: eh, align: "center", valign: "middle", fontSize: 12, bold: true, color: WHITE, fontFace: "Calibri" });
    ex += ew + egap;
  });
  s.addText("Objektarten statt einer starren Excel-Tabelle pro Dokumenttyp – neue Felder lassen sich jederzeit ergänzen, ohne das Schema zu ändern.", {
    x: 0.6, y: 3.25, w: 7.9, h: 0.75, fontSize: 12.5, color: MUTED, fontFace: "Calibri", lineSpacingMultiple: 1.2,
  });

  s.addShape("roundRect", { x: 0.6, y: 4.25, w: 7.9, h: 2.35, rectRadius: 0.1, fill: { color: TINT }, line: { type: "none" } });
  s.addText("Beispiel: aus 62 Checkbox-Spalten der Excel-Liste (c/r-Symboltrick)\nwurden 11 saubere, einzelne Auswahlfelder – z.B. GxP-Kritikalität,\nGerätekategorie, Systemtyp (8 Optionen statt zwei getrennte Felder).", {
    x: 0.9, y: 4.5, w: 7.3, h: 1.15, fontSize: 12.5, color: TEXT_DARK, fontFace: "Calibri", lineSpacingMultiple: 1.25,
  });
  s.addText("Abgeleitete Werte wie die Testtiefe werden automatisch aus GxP-Kritikalität + GAMP-Kategorie berechnet – kein Eingabefeld.", {
    x: 0.9, y: 5.75, w: 7.3, h: 0.7, fontSize: 12, italic: true, color: SECONDARY, fontFace: "Calibri", lineSpacingMultiple: 1.2,
  });

  // right stat
  s.addShape("roundRect", { x: 8.75, y: 4.25, w: 3.9, h: 2.35, rectRadius: 0.12, fill: { color: ACCENT }, line: { type: "none" } });
  s.addText("62 → 11", { x: 8.75, y: 4.55, w: 3.9, h: 0.9, align: "center", fontSize: 40, bold: true, color: WHITE, fontFace: "Cambria" });
  s.addText("Checkbox-Spalten zu\nsauberen Auswahlfeldern", { x: 9.0, y: 5.4, w: 3.4, h: 0.9, align: "center", fontSize: 13, color: "CADCFC", fontFace: "Calibri", lineSpacingMultiple: 1.2 });

  footer(s, 5);
}

// ============================================================ Slide 6 · Datenerfassung / 3 Szenarien
{
  const s = lightSlide();
  sectionTitle(s, "Datenerfassung im Browser", "Drei Erfassungs-Szenarien");

  const cards = [
    ["1", "Neuanlage (leer)", "System ist unbekannt – alle Felder leer, gruppiert mit Dropdowns statt Freitext-Tippfehlern."],
    ["2", "Kopie von ähnlichem System", "Werte eines bestehenden Systems werden sichtbar übernommen – nur Abweichungen werden überschrieben."],
    ["3", "Bestehendes System bearbeiten", "Aktuelle Werte werden geladen und angezeigt – geänderte oder neue Werte überschreiben gezielt."],
  ];
  let cx = 0.6;
  const cw = 3.95, ch = 3.35, cgap = 0.25;
  cards.forEach(([num, title, desc]) => {
    s.addShape("roundRect", { x: cx, y: 1.95, w: cw, h: ch, rectRadius: 0.1, fill: { color: TINT }, line: { type: "none" } });
    iconCircle(s, cx + 0.3, 2.25, 0.6, num, PRIMARY, WHITE, 22);
    s.addText(title, { x: cx + 0.3, y: 3.05, w: cw - 0.6, h: 0.75, fontSize: 15.5, bold: true, color: ACCENT, fontFace: "Calibri", lineSpacingMultiple: 1.1 });
    s.addText(desc, { x: cx + 0.3, y: 3.75, w: cw - 0.6, h: 1.4, fontSize: 12, color: MUTED, fontFace: "Calibri", lineSpacingMultiple: 1.25 });
    cx += cw + cgap;
  });

  s.addText("Formular: Personen zuerst, dann Stammdaten/GxP-Bewertung · Format-/SOP-Hinweise nur beim Bearbeiten sichtbar · Suchfeld statt Dropdown (skaliert auf ~500 Systeme) · Warnung vor Datenverlust beim Schließen ohne Speichern.", {
    x: 0.6, y: 5.55, w: 12.1, h: 0.9, fontSize: 11.5, italic: true, color: MUTED, fontFace: "Calibri", lineSpacingMultiple: 1.25,
  });
  s.addText("Bereits als klickbares HTML-Mockup verfügbar", {
    x: 0.6, y: 6.35, w: 6, h: 0.35, fontSize: 12, bold: true, color: SECONDARY, fontFace: "Calibri",
  });

  footer(s, 6);
}

// ============================================================ Slide 7 · Drei Techniken
{
  const s = lightSlide();
  sectionTitle(s, "Dokumente ausfüllen", "Drei Techniken – je nach Template");

  const cols = [
    ["Text-Platzhalter", "{{feld}}", "Einfache Textvorlagen mit Platzhaltern im Fließtext.", "z.B. eigene Text-Templates"],
    ["Seriendruckfelder", "MERGEFIELD", "Klassische Word-Mailmerge-Felder, direkt aus der Datenbank befüllt.", "Systembewertung"],
    ["Formularfelder", "Content Control", "Word-Steuerelemente inkl. Checkbox-Umschaltung, Position/Label-basiert erkannt.", "VQ · CS-VP · CS-VB · xQTP"],
  ];
  let cx = 0.6;
  const cw = 3.95, cgap = 0.25;
  cols.forEach(([title, badge, desc, usage]) => {
    s.addShape("roundRect", { x: cx, y: 1.95, w: cw, h: 3.75, rectRadius: 0.1, fill: { color: WHITE }, line: { color: TINT2, width: 1.25 }, shadow: { type: "outer", color: "9AA5B1", opacity: 0.25, blur: 6, offset: 2, angle: 90 } });
    s.addShape("roundRect", { x: cx + 0.3, y: 2.2, w: cw - 0.6, h: 0.5, rectRadius: 0.06, fill: { color: TINT }, line: { type: "none" } });
    s.addText(badge, { x: cx + 0.3, y: 2.2, w: cw - 0.6, h: 0.5, align: "center", valign: "middle", fontSize: 13, bold: true, color: PRIMARY, fontFace: "Courier New" });
    s.addText(title, { x: cx + 0.3, y: 2.85, w: cw - 0.6, h: 0.45, fontSize: 16, bold: true, color: ACCENT, fontFace: "Calibri" });
    s.addText(desc, { x: cx + 0.3, y: 3.35, w: cw - 0.6, h: 1.35, fontSize: 12, color: MUTED, fontFace: "Calibri", lineSpacingMultiple: 1.25 });
    s.addShape("line", { x: cx + 0.3, y: 4.85, w: cw - 0.6, h: 0, line: { color: TINT2, width: 1 } });
    s.addText(usage, { x: cx + 0.3, y: 5.0, w: cw - 0.6, h: 0.55, fontSize: 11.5, italic: true, bold: true, color: SECONDARY, fontFace: "Calibri" });
    cx += cw + cgap;
  });

  s.addText("Zusätzliche Herausforderung: wiederholende Listen (z.B. bis zu 100 Prüfschritte) erfordern automatisches Klonen bzw. Entfernen von Tabellenzeilen im Template statt fester Zeilenzahl.", {
    x: 0.6, y: 5.85, w: 12.1, h: 0.8, fontSize: 11.5, color: MUTED, fontFace: "Calibri", lineSpacingMultiple: 1.25,
  });

  footer(s, 7);
}

// ============================================================ Slide 8 · Aktueller Stand
{
  const s = lightSlide();
  sectionTitle(s, "Fortschritt", "Aktueller Stand");

  // Done column
  s.addShape("roundRect", { x: 0.6, y: 1.9, w: 5.85, h: 4.55, rectRadius: 0.1, fill: { color: TINT }, line: { type: "none" } });
  iconCircle(s, 0.95, 2.15, 0.5, "✓", GOOD, WHITE, 18);
  s.addText("Bereits erledigt", { x: 1.6, y: 2.18, w: 4.6, h: 0.45, fontSize: 17, bold: true, color: ACCENT, fontFace: "Calibri" });
  const done = [
    "Analyse der Excel-Liste (733 Systeme) + aller 5 relevanten Word-Templates",
    "Konkretes SQLite-Datenmodell (Objektarten, Felder, Optionen)",
    "Funktionierender Python-Fill-Mechanismus für Text-Templates",
    "Klickbares Formular-Mockup für die Datenerfassung",
  ];
  let dy = 2.85;
  done.forEach((t) => {
    s.addText("•", { x: 1.0, y: dy, w: 0.3, h: 0.5, fontSize: 14, bold: true, color: GOOD, fontFace: "Calibri" });
    s.addText(t, { x: 1.3, y: dy, w: 4.9, h: 0.75, fontSize: 12.5, color: TEXT_DARK, fontFace: "Calibri", lineSpacingMultiple: 1.2 });
    dy += 0.85;
  });

  // Next column
  s.addShape("roundRect", { x: 6.75, y: 1.9, w: 5.9, h: 4.55, rectRadius: 0.1, fill: { color: ACCENT }, line: { type: "none" } });
  iconCircle(s, 7.1, 2.15, 0.5, "→", SECONDARY, WHITE, 18);
  s.addText("Nächste Schritte", { x: 7.75, y: 2.18, w: 4.6, h: 0.45, fontSize: 17, bold: true, color: WHITE, fontFace: "Calibri" });
  const next = [
    "Echte Datenbank-Anbindung im Browser (statt Mockup)",
    "Mechanismus für wiederholende Tabellenzeilen (Listen-Platzhalter)",
    "Dokument-Erzeugung inkl. Entwurf-/Final-Status",
  ];
  dy = 2.85;
  next.forEach((t) => {
    s.addText("•", { x: 7.15, y: dy, w: 0.3, h: 0.5, fontSize: 14, bold: true, color: "8FD6C9", fontFace: "Calibri" });
    s.addText(t, { x: 7.45, y: dy, w: 5.0, h: 0.75, fontSize: 12.5, color: "E7EEF5", fontFace: "Calibri", lineSpacingMultiple: 1.2 });
    dy += 0.85;
  });

  footer(s, 8);
}

// ============================================================ Slide 9 · Priorisierung
{
  const s = lightSlide();
  sectionTitle(s, "Priorisierung", "Erst wiederverwenden, dann Systembewertung");

  // Phase 1
  s.addShape("roundRect", { x: 0.6, y: 2.3, w: 6.9, h: 3.1, rectRadius: 0.1, fill: { color: TINT }, line: { type: "none" } });
  s.addText("PHASE 1 · JETZT", { x: 0.9, y: 2.5, w: 4, h: 0.35, fontSize: 12, bold: true, color: SECONDARY, fontFace: "Calibri", charSpacing: 1 });
  s.addText("CS-VP · CS-VB · VQ · xQTP", { x: 0.9, y: 2.85, w: 6.3, h: 0.5, fontSize: 19, bold: true, color: ACCENT, fontFace: "Cambria" });
  s.addText("Dokumente, die überwiegend bereits vorhandene Stammdaten wiederverwenden – hoher Nutzen bei vertretbarem Aufwand.", {
    x: 0.9, y: 3.45, w: 6.3, h: 0.9, fontSize: 13, color: TEXT_DARK, fontFace: "Calibri", lineSpacingMultiple: 1.25,
  });

  // arrow
  s.addShape("rightArrow", { x: 7.75, y: 3.55, w: 0.9, h: 0.6, fill: { color: SECONDARY }, line: { type: "none" } });

  // Phase 2
  s.addShape("roundRect", { x: 8.9, y: 2.3, w: 3.8, h: 3.1, rectRadius: 0.1, fill: { color: ACCENT }, line: { type: "none" } });
  s.addText("PHASE 2 · SPÄTER", { x: 9.2, y: 2.5, w: 3.2, h: 0.35, fontSize: 12, bold: true, color: "8FD6C9", fontFace: "Calibri", charSpacing: 1 });
  s.addText("Systembewertung", { x: 9.2, y: 2.85, w: 3.2, h: 0.75, fontSize: 19, bold: true, color: WHITE, fontFace: "Cambria" });
  s.addText("Komplexeste Datenerfassung – hier entstehen die meisten Werte erst neu.", {
    x: 9.2, y: 3.65, w: 3.2, h: 1.0, fontSize: 12, color: "CADCFC", fontFace: "Calibri", lineSpacingMultiple: 1.25,
  });

  s.addText("Bewusste Reihenfolge: erst dort automatisieren, wo Daten wiederverwendet werden können – die Systembewertung selbst folgt danach.", {
    x: 0.6, y: 5.75, w: 11.9, h: 0.7, fontSize: 12.5, italic: true, color: MUTED, fontFace: "Calibri", lineSpacingMultiple: 1.25,
  });

  footer(s, 9);
}

// ============================================================ Slide 10 · Ausblick / Fragen
{
  const s = darkSlide();
  s.addText("AUSBLICK", { x: 0.6, y: 0.6, w: 8, h: 0.35, fontSize: 13, bold: true, color: "8FD6C9", charSpacing: 1, fontFace: "Calibri" });
  s.addText("Offene Fragen an das Team", { x: 0.6, y: 0.95, w: 10.5, h: 0.8, fontSize: 30, bold: true, color: WHITE, fontFace: "Cambria" });

  const qs = [
    "Passt euch das Formular-Layout (Reihenfolge, Gruppierung, Hinweise)?",
    "Stimmt die Priorisierung – zuerst CS-VP/CS-VB/VQ/xQTP, Systembewertung später?",
    "Bleibt das Repository privat, oder sind weitere Personen daran zu beteiligen?",
  ];
  let y = 2.15;
  qs.forEach((q, i) => {
    iconCircle(s, 0.7, y, 0.55, String(i + 1), SECONDARY, WHITE, 20);
    s.addText(q, { x: 1.55, y: y - 0.02, w: 10.6, h: 0.7, fontSize: 16, color: "E7EEF5", fontFace: "Calibri", valign: "middle", lineSpacingMultiple: 1.2 });
    y += 1.05;
  });

  s.addShape("line", { x: 0.6, y: 5.85, w: 12.1, h: 0, line: { color: "3B4A7C", width: 1 } });
  s.addText("Danke für eure Zeit – Feedback und Rückfragen jederzeit willkommen.", {
    x: 0.6, y: 6.05, w: 11, h: 0.5, fontSize: 14, italic: true, color: "AFC3D6", fontFace: "Calibri",
  });

  footer(s, 10, true);
}

pres.writeFile({ fileName: "/home/user/fill_a_masterform/presentation/Masterform_Projektvorstellung.pptx" }).then(() => {
  console.log("Deck geschrieben.");
});
