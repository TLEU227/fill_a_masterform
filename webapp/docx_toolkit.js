/* docx_toolkit.js - generische OOXML-Helper fuer das direkte, browserseitige
 * Ausfuellen von .docx-Word-Vorlagen (kein Server, kein python-docx nur JS +
 * JSZip + DOMParser/XMLSerializer). 1:1 portiert aus den Python/python-docx-
 * Referenzskripten (fill_demo10.py / fill_vb_demo8.py) - siehe dort fuer die
 * fachlichen Begruendungen/Konventionen in den Kommentaren.
 *
 * WICHTIG: kein ES-Modul, kein `export` - alles haengt an window.DocxToolkit,
 * damit es per <script> vor der eigentlichen Fachlogik (docx_fill_*.js)
 * eingebunden bzw. von build.js inline in app.html eingefuegt werden kann.
 *
 * Zustands-Kontext (ctx): anstatt wie im Python-Original globale Module-
 * Variablen (changes/skipped/NR_COUNTER/NUMMERIERUNG) zu benutzen, nehmen die
 * Funktionen hier explizit ein `ctx`-Objekt entgegen (siehe createContext()).
 * Das macht die Bibliothek reentrant (mehrfacher fill()-Aufruf im selben
 * Browser-Tab moeglich, ohne Zustand zwischen Aufrufen zu vermischen).
 */
(function (global) {
  "use strict";

  const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const W14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
  const XML_NS = "http://www.w3.org/XML/1998/namespace";

  // Farbcodes (RGB-Hex ohne "#"), 1:1 aus fill_vb_demo8.py.
  const DELETE_COLOR = "C00000";
  const NR_TAG_COLOR = "003399";
  // Vorschlags-Farbe (siehe fill_vb_demo8.py Kommentar zu SUGGEST_COLOR): fuer
  // Textbausteine, die eine von mehreren vorformulierten Optionen sind (nicht
  // aus der DB als gesicherte Tatsache uebernommen) - muss vor Freigabe von
  // einem Menschen bestaetigt/angepasst und dann schwarz formatiert werden.
  const SUGGEST_COLOR = "548DD4";
  const BLACK = "000000";
  const GREY_INFO_COLOR = "A6A6A6";

  // Reihenfolge der moeglichen <w:rPr>-Kindelemente laut OOXML-Schema
  // (CT_RPr._tag_seq in python-docx) - wichtig, um beim Einfuegen neuer
  // rPr-Kinder (strike/color/highlight/...) die Element-Reihenfolge zu
  // wahren (Word/manche Parser sind schema-strikt).
  const RPR_ORDER = [
    "w:rStyle", "w:rFonts", "w:b", "w:bCs", "w:i", "w:iCs", "w:caps",
    "w:smallCaps", "w:strike", "w:dstrike", "w:outline", "w:shadow",
    "w:emboss", "w:imprint", "w:noProof", "w:snapToGrid", "w:vanish",
    "w:webHidden", "w:color", "w:spacing", "w:w", "w:kern", "w:position",
    "w:sz", "w:szCs", "w:highlight", "w:u", "w:effect", "w:bdr", "w:shd",
    "w:fitText", "w:vertAlign", "w:rtl", "w:cs", "w:em", "w:lang",
    "w:eastAsianLayout", "w:specVanish", "w:oMath",
  ];

  // ============================================================ Kontext (ersetzt Python-Module-Globals)
  function createContext() {
    return {
      nrCounter: {}, // Bereich -> Zaehler (fuer nr())
      numbering: [], // [tag, label, wert] - fuer die Zuordnungstabelle
      changes: [], // [label, vorher, nachher]
      skipped: [], // [label, begruendung]
    };
  }

  function nr(ctx, bereich) {
    ctx.nrCounter[bereich] = (ctx.nrCounter[bereich] || 0) + 1;
    return `${bereich}-${ctx.nrCounter[bereich]}`;
  }

  function merkeNummer(ctx, tag, label, wert) {
    ctx.numbering.push([tag, label, wert]);
  }

  // ============================================================ Low-Level DOM-Helper (Namespace-bewusst)
  function isElement(node) {
    return node && node.nodeType === 1;
  }

  function childrenNS(el, ns, localName) {
    const out = [];
    for (const child of el.childNodes) {
      if (isElement(child) && child.namespaceURI === ns && child.localName === localName) {
        out.push(child);
      }
    }
    return out;
  }

  function firstChildNS(el, ns, localName) {
    for (const child of el.childNodes) {
      if (isElement(child) && child.namespaceURI === ns && child.localName === localName) {
        return child;
      }
    }
    return null;
  }

  function descendantsNS(el, ns, localName) {
    return Array.from(el.getElementsByTagNameNS(ns, localName));
  }

  function firstDescendantNS(el, ns, localName) {
    const list = el.getElementsByTagNameNS(ns, localName);
    return list.length ? list[0] : null;
  }

  function elementIndexInOrder(tag, orderArr) {
    return orderArr.indexOf(tag);
  }

  /** Fuegt `newEl` an der laut `orderArr` (Tag-Namen inkl. "w:"-Praefix)
   * schema-korrekten Position in `parentEl` ein (vor dem ersten Kind mit
   * hoeherer Ordnungsposition, sonst am Ende). */
  function insertOrdered(parentEl, newEl, orderArr) {
    const newTag = `w:${newEl.localName}`;
    const newIdx = elementIndexInOrder(newTag, orderArr);
    let before = null;
    for (const child of parentEl.childNodes) {
      if (!isElement(child)) continue;
      const tag = `w:${child.localName}`;
      const idx = elementIndexInOrder(tag, orderArr);
      if (idx === -1) continue;
      if (newIdx !== -1 && idx > newIdx) {
        before = child;
        break;
      }
    }
    if (before) parentEl.insertBefore(newEl, before);
    else parentEl.appendChild(newEl);
  }

  // ============================================================ Text-Aequivalente (mirrort python-docx CT_R.text / CT_P.text / _Cell.text)
  function runText(rEl) {
    let out = "";
    for (const child of rEl.childNodes) {
      if (!isElement(child) || child.namespaceURI !== W_NS) continue;
      switch (child.localName) {
        case "t":
          out += child.textContent;
          break;
        case "tab":
        case "ptab":
          out += "\t";
          break;
        case "cr":
          out += "\n";
          break;
        case "br": {
          const type = child.getAttributeNS(W_NS, "type");
          if (!type || type === "textWrapping") out += "\n";
          break;
        }
        case "noBreakHyphen":
          out += "-";
          break;
        default:
          break;
      }
    }
    return out;
  }

  function hyperlinkRuns(hyperlinkEl) {
    return childrenNS(hyperlinkEl, W_NS, "r");
  }

  function hyperlinkText(hyperlinkEl) {
    return hyperlinkRuns(hyperlinkEl).map(runText).join("");
  }

  /** Mirrort python-docx Paragraph.text: nur direkte w:r/w:hyperlink-Kinder
   * des Absatzes, in Dokumentreihenfolge (steigt NICHT in w:sdt o.ae. ab). */
  function paragraphText(pEl) {
    let out = "";
    for (const child of pEl.childNodes) {
      if (!isElement(child) || child.namespaceURI !== W_NS) continue;
      if (child.localName === "r") out += runText(child);
      else if (child.localName === "hyperlink") out += hyperlinkText(child);
    }
    return out;
  }

  /** Mirrort python-docx Paragraph.runs: NUR direkte w:r-Kinder (nicht in
   * w:hyperlink/w:sdt verschachtelt). */
  function paragraphRuns(pEl) {
    return childrenNS(pEl, W_NS, "r");
  }

  function cellParagraphs(tcEl) {
    return childrenNS(tcEl, W_NS, "p");
  }

  /** Mirrort python-docx _Cell.text: alle Absatztexte der Zelle, mit "\n" verbunden. */
  function cellText(tcEl) {
    return cellParagraphs(tcEl).map(paragraphText).join("\n");
  }

  // ============================================================ Dokumentstruktur (nur TOP-LEVEL, wie doc.paragraphs/doc.tables in python-docx)
  function getBody(doc) {
    return doc.getElementsByTagNameNS(W_NS, "body")[0];
  }

  /** Mirrort python-docx Document.paragraphs: NUR direkte w:p-Kinder von
   * w:body (keine Tabellenzellen-Absaetze, keine Kopf-/Fusszeilen, keine
   * Absaetze in Textboxen/SDTs auf oberster Ebene). */
  function bodyParagraphs(doc) {
    return childrenNS(getBody(doc), W_NS, "p");
  }

  /** Mirrort python-docx Document.tables: NUR direkte w:tbl-Kinder von w:body
   * (keine verschachtelten Tabellen in Zellen). */
  function bodyTables(doc) {
    return childrenNS(getBody(doc), W_NS, "tbl");
  }

  function tableRows(tblEl) {
    return childrenNS(tblEl, W_NS, "tr");
  }

  /** Zell-Zugriff ohne Beruecksichtigung von gridSpan/vMerge (Merges) - in
   * den hier bearbeiteten Vorlagen kommen laut Analyse keine verschmolzenen
   * Zellen vor; fuer den generischen Fall waere eine _cells-Expansion wie in
   * python-docx's Table._cells noetig (hier bewusst nicht portiert). */
  function rowCells(trEl) {
    return childrenNS(trEl, W_NS, "tc");
  }

  /** mirrort python-docx Table.add_row(): neue leere w:tr mit einer w:tc je
   * Spalte (aus w:tblGrid), jede Zelle mit genau einem leeren w:p (die von
   * OOXML geforderte Mindestbelegung einer Zelle - siehe CT_Tc.new()). */
  function addTableRow(doc, tblEl) {
    const tr = doc.createElementNS(W_NS, "w:tr");
    tblEl.appendChild(tr);
    const tblGrid = firstChildNS(tblEl, W_NS, "tblGrid");
    const gridCols = tblGrid ? childrenNS(tblGrid, W_NS, "gridCol") : [];
    const rows = tableRows(tblEl);
    const colCount = gridCols.length || (rows.length ? rowCells(rows[0]).length : 0);
    for (let i = 0; i < colCount; i++) {
      const tc = doc.createElementNS(W_NS, "w:tc");
      const w = gridCols[i] ? gridCols[i].getAttributeNS(W_NS, "w") : null;
      if (w) {
        const tcPr = doc.createElementNS(W_NS, "w:tcPr");
        const tcW = doc.createElementNS(W_NS, "w:tcW");
        tcW.setAttributeNS(W_NS, "w:w", w);
        tcW.setAttributeNS(W_NS, "w:type", "dxa");
        tcPr.appendChild(tcW);
        tc.appendChild(tcPr);
      }
      tc.appendChild(doc.createElementNS(W_NS, "w:p"));
      tr.appendChild(tc);
    }
    return tr;
  }

  function tableHeaderTexts(tblEl) {
    const rows = tableRows(tblEl);
    if (!rows.length) return [];
    return rowCells(rows[0]).map((tc) => cellText(tc).trim());
  }

  // ============================================================ find_p / find_all_p (auf Body-Absaetzen, wie doc.paragraphs)
  function findP(doc, predicate) {
    const paras = bodyParagraphs(doc);
    for (const p of paras) if (predicate(p)) return p;
    return null;
  }

  function findAllP(doc, predicate) {
    return bodyParagraphs(doc).filter(predicate);
  }

  // ============================================================ Formatierungs-Helper (Run-Ebene)
  function getOrAddRPr(doc, rEl) {
    let rpr = firstChildNS(rEl, W_NS, "rPr");
    if (!rpr) {
      rpr = doc.createElementNS(W_NS, "w:rPr");
      rEl.insertBefore(rpr, rEl.firstChild); // w:rPr ist immer das erste Kind von w:r
    }
    return rpr;
  }

  function setRunHighlight(doc, rEl, val) {
    const rpr = getOrAddRPr(doc, rEl);
    let hl = firstChildNS(rpr, W_NS, "highlight");
    if (val === null || val === undefined) {
      if (hl) rpr.removeChild(hl);
      return;
    }
    if (!hl) {
      hl = doc.createElementNS(W_NS, "w:highlight");
      insertOrdered(rpr, hl, RPR_ORDER);
    }
    hl.setAttributeNS(W_NS, "w:val", val);
  }

  /** hex=null entfernt eine vorhandene Farbe (No-Op falls keine vorhanden -
   * mirrort ColorFormat.rgb-Setter: "if value is None and self._color is
   * None: return", d.h. es wird KEIN leeres w:rPr erzwungen). */
  function setRunColor(doc, rEl, hex) {
    if (hex === null || hex === undefined) {
      const rpr = firstChildNS(rEl, W_NS, "rPr");
      if (!rpr) return;
      const color = firstChildNS(rpr, W_NS, "color");
      if (color) rpr.removeChild(color);
      return;
    }
    const rpr = getOrAddRPr(doc, rEl);
    let color = firstChildNS(rpr, W_NS, "color");
    if (!color) {
      color = doc.createElementNS(W_NS, "w:color");
      insertOrdered(rpr, color, RPR_ORDER);
    }
    color.setAttributeNS(W_NS, "w:val", hex);
  }

  function setRunStrike(doc, rEl, on) {
    const rpr = getOrAddRPr(doc, rEl);
    let strike = firstChildNS(rpr, W_NS, "strike");
    if (!on) {
      if (strike) rpr.removeChild(strike);
      return;
    }
    if (!strike) {
      strike = doc.createElementNS(W_NS, "w:strike");
      insertOrdered(rpr, strike, RPR_ORDER);
    }
    strike.removeAttributeNS(W_NS, "val"); // true = Standard, kein w:val noetig (analog python-docx OptionalAttribute default)
  }

  function setRunItalic(doc, rEl, on) {
    const rpr = getOrAddRPr(doc, rEl);
    let i = firstChildNS(rpr, W_NS, "i");
    if (!on) {
      if (i) rpr.removeChild(i);
      return;
    }
    if (!i) {
      i = doc.createElementNS(W_NS, "w:i");
      insertOrdered(rpr, i, RPR_ORDER);
    }
  }

  function setRunBold(doc, rEl, on) {
    const rpr = getOrAddRPr(doc, rEl);
    let b = firstChildNS(rpr, W_NS, "b");
    if (on === null || on === undefined) {
      if (b) rpr.removeChild(b);
      return;
    }
    if (!b) {
      b = doc.createElementNS(W_NS, "w:b");
      insertOrdered(rpr, b, RPR_ORDER);
    }
    if (on) b.removeAttributeNS(W_NS, "val");
    else b.setAttributeNS(W_NS, "w:val", "0");
  }

  /** sz in halben Punkten (w:sz@w:val ist Halbpunkte), z.B. 7pt -> 14. */
  function setRunSizeHalfPt(doc, rEl, halfPt) {
    const rpr = getOrAddRPr(doc, rEl);
    let sz = firstChildNS(rpr, W_NS, "sz");
    if (halfPt === null || halfPt === undefined) {
      if (sz) rpr.removeChild(sz);
      return;
    }
    if (!sz) {
      sz = doc.createElementNS(W_NS, "w:sz");
      insertOrdered(rpr, sz, RPR_ORDER);
    }
    sz.setAttributeNS(W_NS, "w:val", String(halfPt));
  }

  function setRunFontNameAsciiHAnsi(doc, rEl, name) {
    if (!name) return;
    const rpr = getOrAddRPr(doc, rEl);
    let rFonts = firstChildNS(rpr, W_NS, "rFonts");
    if (!rFonts) {
      rFonts = doc.createElementNS(W_NS, "w:rFonts");
      insertOrdered(rpr, rFonts, RPR_ORDER);
    }
    rFonts.setAttributeNS(W_NS, "w:ascii", name);
    rFonts.setAttributeNS(W_NS, "w:hAnsi", name);
  }

  function getRunFontNameAscii(rEl) {
    const rpr = firstChildNS(rEl, W_NS, "rPr");
    if (!rpr) return null;
    const rFonts = firstChildNS(rpr, W_NS, "rFonts");
    if (!rFonts) return null;
    return rFonts.getAttributeNS(W_NS, "ascii") || null;
  }

  function getRunSizeHalfPt(rEl) {
    const rpr = firstChildNS(rEl, W_NS, "rPr");
    if (!rpr) return null;
    const sz = firstChildNS(rpr, W_NS, "sz");
    if (!sz) return null;
    const v = sz.getAttributeNS(W_NS, "val");
    return v ? parseInt(v, 10) : null;
  }

  function getRunBold(rEl) {
    const rpr = firstChildNS(rEl, W_NS, "rPr");
    if (!rpr) return null;
    const b = firstChildNS(rpr, W_NS, "b");
    if (!b) return null;
    const v = b.getAttributeNS(W_NS, "val");
    if (v === null || v === "") return true; // Attribut fehlt -> Default true
    return !(v === "0" || v === "false");
  }

  /** Mirrort run_color() aus fill_vb_demo8.py: liefert den RGB-Hex-Wert
   * (Grossbuchstaben, ohne "#") einer expliziten w:color/@w:val, sonst null. */
  function getRunColorHex(rEl) {
    const rpr = firstChildNS(rEl, W_NS, "rPr");
    if (!rpr) return null;
    const color = firstChildNS(rpr, W_NS, "color");
    if (!color) return null;
    const v = color.getAttributeNS(W_NS, "val");
    if (!v || v === "auto") return null;
    return v.toUpperCase();
  }

  /** Setzt den Text eines Runs komplett neu (mirrort Run.text-Setter =
   * clear_content() + Neuaufbau aus Zeichen). Leerstring => Run bleibt ohne
   * jeden Inhalt (kein leeres <w:t/>), genau wie im Python-Original. Zerlegt
   * \t/\n/\r in w:tab/w:br, alles andere in w:t (immer mit
   * xml:space="preserve", defensiv). Entfernt dabei jeglichen Altinhalt
   * (auch Feldcodes/fldChar - identisch zum python-docx-Verhalten). */
  function setRunText(doc, rEl, text) {
    // Alles außer w:rPr entfernen (mirrort CT_R.clear_content()).
    for (const child of Array.from(rEl.childNodes)) {
      if (isElement(child) && child.namespaceURI === W_NS && child.localName === "rPr") continue;
      rEl.removeChild(child);
    }
    if (!text) return;
    let buffer = "";
    const flush = () => {
      if (buffer) {
        const t = doc.createElementNS(W_NS, "w:t");
        t.setAttributeNS(XML_NS, "xml:space", "preserve");
        t.textContent = buffer;
        rEl.appendChild(t);
        buffer = "";
      }
    };
    for (const ch of text) {
      if (ch === "\t") {
        flush();
        rEl.appendChild(doc.createElementNS(W_NS, "w:tab"));
      } else if (ch === "\n" || ch === "\r") {
        flush();
        rEl.appendChild(doc.createElementNS(W_NS, "w:br"));
      } else {
        buffer += ch;
      }
    }
    flush();
  }

  function addRun(doc, pEl) {
    const r = doc.createElementNS(W_NS, "w:r");
    pEl.appendChild(r);
    return r;
  }

  // ============================================================ Absatz-Entfernung (mirrort safe_remove_paragraph)
  /** Entfernt einen Absatz tatsaechlich aus dem Dokument. Ausnahme: letzter
   * Absatz in einer Tabellenzelle - eine Zelle darf laut OOXML nie ganz ohne
   * Absatz sein, dort wird stattdessen durchgestrichen+rot markiert. */
  function safeRemoveParagraph(doc, pEl) {
    const parent = pEl.parentNode;
    if (parent && parent.namespaceURI === W_NS && parent.localName === "tc" && childrenNS(parent, W_NS, "p").length <= 1) {
      for (const r of paragraphRuns(pEl)) {
        if (runText(r)) {
          setRunStrike(doc, r, true);
          setRunColor(doc, r, DELETE_COLOR);
          setRunHighlight(doc, r, null);
        }
      }
      return false;
    }
    parent.removeChild(pEl);
    return true;
  }

  function markAsDeleted(doc, pEl) {
    safeRemoveParagraph(doc, pEl);
  }

  /** Entfernt "Oder:"/"Oder"/"Oder (...)"-Trennabsaetze, die zwischen zwei
   * alternativen Absaetzen liegen, sobald die Alternative aufgeloest ist. */
  function entferneOderZwischen(doc, p1, p2) {
    const paras = bodyParagraphs(doc);
    const idxs = [];
    paras.forEach((p, i) => {
      if (p === p1 || p === p2) idxs.push(i);
    });
    if (idxs.length !== 2) return;
    const lo = Math.min(idxs[0], idxs[1]);
    const hi = Math.max(idxs[0], idxs[1]);
    for (let i = lo + 1; i < hi; i++) {
      const p = paras[i];
      if (paragraphText(p).trim().toLowerCase().startsWith("oder")) {
        safeRemoveParagraph(doc, p);
      }
    }
  }

  function addTagRun(doc, pEl, tag) {
    const run = addRun(doc, pEl);
    setRunText(doc, run, ` [${tag}]`);
    setRunItalic(doc, run, true);
    setRunSizeHalfPt(doc, run, 14); // Pt(7) -> 14 Halbpunkte
    setRunColor(doc, run, NR_TAG_COLOR);
  }

  // ============================================================ Span-/Marker-Ersetzung (Runs-uebergreifend, wie python-docx-Runs-Offsets)
  /** Ersetzt den Text im Bereich [start,end) (Zeichenoffsets ueber
   * paragraphRuns(p) hinweg) durch `value`. mark_black=true -> schwarz+gelb,
   * sonst gelb + Farbe entfernt (mirrort replace_span_in_paragraph). */
  function replaceSpanInParagraph(doc, pEl, start, end, value, markBlack) {
    const runs = paragraphRuns(pEl);
    let pos = 0;
    const offsets = runs.map((r) => {
      const s = pos;
      pos += runText(r).length;
      return [s, pos];
    });
    const overlapping = [];
    offsets.forEach(([s, e], i) => {
      if (e > start && s < end) overlapping.push(i);
    });
    if (!overlapping.length) return false;
    const firstI = overlapping[0];
    const lastI = overlapping[overlapping.length - 1];
    const firstRun = runs[firstI];
    const firstText = runText(firstRun);
    const prefix = firstText.slice(0, start - offsets[firstI][0]);
    if (firstI === lastI) {
      const suffix = firstText.slice(end - offsets[firstI][0]);
      setRunText(doc, firstRun, prefix + value + suffix);
    } else {
      const lastRun = runs[lastI];
      const lastText = runText(lastRun);
      const suffix = lastText.slice(end - offsets[lastI][0]);
      setRunText(doc, firstRun, prefix + value);
      for (let i = firstI + 1; i < lastI; i++) setRunText(doc, runs[i], "");
      setRunText(doc, lastRun, suffix);
    }
    if (markBlack) {
      setRunColor(doc, firstRun, BLACK);
      setRunHighlight(doc, firstRun, "yellow");
    } else {
      setRunHighlight(doc, firstRun, "yellow");
      setRunColor(doc, firstRun, null);
    }
    return true;
  }

  /** mirrort replace_marker(): sucht `marker` im Absatztext, ersetzt ihn
   * (optional mit fortlaufender Nummerierung "[Bereich-n] Wert"). Liefert den
   * Tag zurueck (oder null, falls Marker nicht gefunden/kein Bereich). */
  function replaceMarker(doc, ctx, pEl, marker, value, label, opts) {
    opts = opts || {};
    const text = paragraphText(pEl);
    const idx = text.indexOf(marker);
    if (idx === -1) return null;
    const tag = opts.bereich ? nr(ctx, opts.bereich) : null;
    const displayValue = tag ? `[${tag}] ${value}` : value;
    const ok = replaceSpanInParagraph(doc, pEl, idx, idx + marker.length, displayValue, !!opts.markBlack);
    if (ok) {
      ctx.changes.push([label, marker, displayValue]);
      if (tag) merkeNummer(ctx, tag, label, value);
    }
    return ok ? tag : null;
  }

  // ============================================================ Zellwerte (mirrort set_cell_value / append_to_cell)
  function setCellValue(doc, ctx, tcEl, value, label, opts) {
    opts = opts || {};
    const old = cellText(tcEl);
    const tag = opts.bereich ? nr(ctx, opts.bereich) : null;
    const displayValue = tag ? `[${tag}] ${value}` : value;
    const paragraphs = cellParagraphs(tcEl);
    const runs = [];
    for (const p of paragraphs) runs.push(...paragraphRuns(p));
    let run;
    if (!runs.length) {
      run = addRun(doc, paragraphs[0]);
      setRunText(doc, run, displayValue);
    } else {
      run = runs[0];
      setRunText(doc, run, displayValue);
      for (let i = 1; i < runs.length; i++) setRunText(doc, runs[i], "");
    }
    setRunHighlight(doc, run, "yellow");
    setRunColor(doc, run, opts.markBlack ? BLACK : null);
    ctx.changes.push([label, old.trim(), displayValue]);
    if (tag) merkeNummer(ctx, tag, label, value);
    return tag;
  }

  function appendToCell(doc, ctx, tcEl, value, label, opts) {
    opts = opts || {};
    const markBlack = opts.markBlack === undefined ? true : opts.markBlack;
    const old = cellText(tcEl);
    const tag = opts.bereich ? nr(ctx, opts.bereich) : null;
    const displayValue = tag ? `[${tag}] ${value}` : value;
    const paragraphs = cellParagraphs(tcEl);
    const p = paragraphs[paragraphs.length - 1];
    const run = addRun(doc, p);
    setRunText(doc, run, ` ${displayValue}`);
    setRunHighlight(doc, run, "yellow");
    if (opts.markSuggested) setRunColor(doc, run, SUGGEST_COLOR);
    else if (markBlack) setRunColor(doc, run, BLACK);
    ctx.changes.push([label, old.trim(), `${old.trim()} ${displayValue}`.trim()]);
    if (tag) merkeNummer(ctx, tag, label, value);
    return tag;
  }

  // ============================================================ Checkbox-Helper (echte w14-Checkbox-SDTs)
  function sdtsInCell(tcEl) {
    return descendantsNS(tcEl, W_NS, "sdt");
  }

  function setCheckbox(doc, sdtEl, checked) {
    const checkedEl = firstDescendantNS(sdtEl, W14_NS, "checked");
    checkedEl.setAttributeNS(W14_NS, "w14:val", checked ? "1" : "0");
    const tEl = firstDescendantNS(sdtEl, W_NS, "t");
    tEl.textContent = checked ? "☒" : "☐";
    if (checked) {
      const rEl = tEl.parentNode;
      let rpr = firstChildNS(rEl, W_NS, "rPr");
      if (!rpr) {
        rpr = doc.createElementNS(W_NS, "w:rPr");
        rEl.insertBefore(rpr, rEl.firstChild);
      }
      let hl = firstChildNS(rpr, W_NS, "highlight");
      if (!hl) {
        hl = doc.createElementNS(W_NS, "w:highlight");
        insertOrdered(rpr, hl, RPR_ORDER);
      }
      hl.setAttributeNS(W_NS, "w:val", "yellow");
    }
  }

  /** mirrort set_ja_nein_checkbox(): erwartet genau 2 Checkbox-SDTs (Ja/Nein)
   * in der Zelle. */
  function setJaNeinCheckbox(doc, ctx, tcEl, antwort, label, bereich) {
    const sdts = sdtsInCell(tcEl);
    if (sdts.length !== 2) {
      throw new Error(`Erwartet genau 2 Checkboxen, gefunden: ${sdts.length}`);
    }
    const [jaSdt, neinSdt] = sdts;
    setCheckbox(doc, jaSdt, antwort === "ja");
    setCheckbox(doc, neinSdt, antwort === "nein");
    const tag = nr(ctx, bereich);
    const paragraphs = cellParagraphs(tcEl);
    addTagRun(doc, paragraphs[paragraphs.length - 1], tag);
    ctx.changes.push([
      label,
      "☐ Ja / ☐ Nein (nicht angekreuzt)",
      `[${tag}] ${antwort === "ja" ? "☑ Ja" : "☑ Nein"} (angekreuzt + gelb markiert)`,
    ]);
    merkeNummer(ctx, tag, label, antwort.charAt(0).toUpperCase() + antwort.slice(1));
    return tag;
  }

  // ============================================================ Block-Loeschung + grauer Text
  function deleteBlock(doc, ctx, paragraphs, label) {
    let vorschau = "";
    for (const p of paragraphs) {
      if (paragraphText(p).trim()) {
        vorschau = paragraphText(p).slice(0, 60);
        break;
      }
    }
    const list = paragraphs.slice();
    for (const p of list) safeRemoveParagraph(doc, p);
    if (paragraphs.length) ctx.changes.push([label, vorschau, "[Block entfernt]"]);
  }

  /** Absaetze von (inkl.) dem ersten auf `startPred` passenden Absatz bis
   * (exkl.) dem naechsten Heading-Absatz. */
  function blockBetween(doc, stylesIndex, startPred) {
    const paras = bodyParagraphs(doc);
    const startI = paras.findIndex(startPred);
    if (startI === -1) return [];
    let endI = startI + 1;
    while (endI < paras.length && !isHeadingStyle(stylesIndex, paras[endI])) endI++;
    return paras.slice(startI, endI);
  }

  /** Absaetze von (inkl.) `startPred` bis (exkl.) `endPred`. */
  function blockVonBis(doc, startPred, endPred) {
    const paras = bodyParagraphs(doc);
    const startI = paras.findIndex(startPred);
    if (startI === -1) return [];
    let endI = -1;
    for (let i = startI + 1; i < paras.length; i++) {
      if (endPred(paras[i])) {
        endI = i;
        break;
      }
    }
    if (endI === -1) return paras.slice(startI);
    return paras.slice(startI, endI);
  }

  /** Grauer Bedienungshilfe-Text (#A6A6A6) wird tatsaechlich entfernt, wenn
   * der GESAMTE Absatz grau ist. Nur falls grauer Text mit echtem Inhalt im
   * selben Absatz gemischt vorkommt, bleibt es beim Durchstreichen. */
  function stripGrey(doc, paragraphsIterable) {
    let entfernt = 0;
    for (const p of paragraphsIterable.slice()) {
      const runsMitText = paragraphRuns(p).filter((r) => runText(r));
      if (!runsMitText.length) continue;
      const greyRuns = runsMitText.filter((r) => getRunColorHex(r) === GREY_INFO_COLOR);
      if (!greyRuns.length) continue;
      if (greyRuns.length === runsMitText.length) {
        safeRemoveParagraph(doc, p);
      } else {
        for (const r of greyRuns) {
          setRunStrike(doc, r, true);
          setRunColor(doc, r, DELETE_COLOR);
        }
      }
      entfernt++;
    }
    return entfernt;
  }

  // ============================================================ Absatz einfuegen (mirrort insert_paragraph_after)
  function insertParagraphAfter(doc, pEl, text) {
    const refRun = paragraphRuns(pEl).find((r) => runText(r).trim());
    const newEl = pEl.cloneNode(true);
    for (const r of childrenNS(newEl, W_NS, "r")) newEl.removeChild(r);
    pEl.parentNode.insertBefore(newEl, pEl.nextSibling);
    const run = addRun(doc, newEl);
    setRunText(doc, run, text);
    if (refRun) {
      setRunFontNameAsciiHAnsi(doc, run, getRunFontNameAscii(refRun));
      const sz = getRunSizeHalfPt(refRun);
      if (sz !== null) setRunSizeHalfPt(doc, run, sz);
      const bold = getRunBold(refRun);
      if (bold !== null) setRunBold(doc, run, bold);
    }
    setRunColor(doc, run, BLACK);
    setRunHighlight(doc, run, "yellow");
    return newEl;
  }

  // ============================================================ Versionshistorie (wiederverwendbar CS-VP/CS-VB, siehe fill_vb_demo8.py)
  /** proj.folgeversion + proj.history steuern alle "V2.0 (CC Nummer): ..."-
   * Absaetze im Dokument. `exclude` (Array von w:p-Elementen) nimmt
   * phasenspezifische Zeilen aus, die woanders (GxP-Ergebnisaussagen)
   * behandelt werden. */
  function versionshistorieZeilenGenerisch(doc, ctx, proj, exclude) {
    const fvRoh = proj.folgeversion;
    if (fvRoh === undefined || fvRoh === null || fvRoh === "") {
      ctx.skipped.push([
        "Alle 'V2.0 (CC Nummer): ...'-Zeilen im Dokument",
        "folgeversion nicht in der Projekt-DB gesetzt -> Zeilen bleiben unangetastet.",
      ]);
      return;
    }
    const fv = parseFloat(fvRoh);
    const history = proj.history || [];
    const v2Eintrag = history.find((h) => parseFloat(h.version) === 2.0) || null;
    const neuereEintraege = history
      .filter((h) => parseFloat(h.version) >= 3.0)
      .sort((a, b) => parseFloat(a.version) - parseFloat(b.version));
    let zielParagraphen = findAllP(doc, (p) => paragraphText(p).trim().startsWith("V2.0 (CC Nummer):"));
    if (exclude && exclude.length) {
      const excludeSet = new Set(exclude.filter(Boolean));
      zielParagraphen = zielParagraphen.filter((p) => !excludeSet.has(p));
    }
    let nEntfernt = 0;
    let nBefuellt = 0;
    let nEingefuegt = 0;
    for (const p of zielParagraphen) {
      if (fv <= 1.0) {
        safeRemoveParagraph(doc, p);
        nEntfernt++;
        continue;
      }
      let letzteZeile = p;
      if (v2Eintrag) {
        const tag = nr(ctx, "Versionshistorie-Zeilen");
        const neuerText = `[${tag}] V2.0 (${v2Eintrag.cc_nummer}): ${v2Eintrag.beschreibung}`;
        const runs = paragraphRuns(p);
        for (let i = 1; i < runs.length; i++) setRunText(doc, runs[i], "");
        if (runs.length) {
          setRunText(doc, runs[0], neuerText);
          setRunColor(doc, runs[0], BLACK);
          setRunHighlight(doc, runs[0], "yellow");
        }
        merkeNummer(
          ctx, tag,
          "Kapitelspezifische Versionshistorie-Zeile V2.0 (generisch, aus versionshistorie_eintrag)",
          v2Eintrag.beschreibung,
        );
        nBefuellt++;
        letzteZeile = p;
      }
      if (fv >= 3.0) {
        for (const eintrag of neuereEintraege) {
          const tag = nr(ctx, "Versionshistorie-Zeilen");
          const neueZeileText = `[${tag}] V${eintrag.version} (${eintrag.cc_nummer}): ${eintrag.beschreibung}`;
          letzteZeile = insertParagraphAfter(doc, letzteZeile, neueZeileText);
          merkeNummer(
            ctx, tag,
            `Kapitelspezifische Versionshistorie-Zeile V${eintrag.version} (NEU eingefügt, aus versionshistorie_eintrag)`,
            eintrag.beschreibung,
          );
          nEingefuegt++;
        }
      }
    }
    if (nEntfernt) {
      ctx.changes.push([
        "Alle 'V2.0 (CC Nummer)'-Zeilen im Dokument entfernt (Projekt-DB: folgeversion <= 1.0)",
        `${nEntfernt} Zeilen`, "[entfernt]",
      ]);
    }
    if (nBefuellt) {
      ctx.changes.push([
        `Alle 'V2.0 (CC Nummer)'-Zeilen im Dokument befüllt (${nBefuellt} Stellen, Projekt-DB: versionshistorie_eintrag V2.0)`,
        "V2.0 (CC Nummer): ...", "echte CC-Nummer + Beschreibung",
      ]);
    }
    if (nEingefuegt) {
      ctx.changes.push([
        `Neue Versionshistorie-Zeilen für aktuelle Version eingefügt (${nEingefuegt} Stellen, Projekt-DB: versionshistorie_eintrag)`,
        "-", `${nEingefuegt} neue Absätze im Stil der vorhandenen V2.0-Zeilen`,
      ]);
    }
  }

  // ============================================================ Absatz-Stil-Aufloesung (nur fuer "startsWith Heading", siehe block_between)
  const BABELFISH_UI = {
    "heading 1": "Heading 1", "heading 2": "Heading 2", "heading 3": "Heading 3",
    "heading 4": "Heading 4", "heading 5": "Heading 5", "heading 6": "Heading 6",
    "heading 7": "Heading 7", "heading 8": "Heading 8", "heading 9": "Heading 9",
    caption: "Caption", footer: "Footer", header: "Header",
  };

  /** Baut eine styleId -> UI-Stilname-Map aus word/styles.xml (mirrort
   * python-docx BabelFish.internal2ui fuer die hier relevanten Stile). */
  function buildStylesIndex(stylesXmlString) {
    const doc = new DOMParser().parseFromString(stylesXmlString, "application/xml");
    const map = {};
    for (const styleEl of descendantsNS(doc, W_NS, "style")) {
      const id = styleEl.getAttributeNS(W_NS, "styleId");
      const nameEl = firstChildNS(styleEl, W_NS, "name");
      if (!id || !nameEl) continue;
      const internalName = nameEl.getAttributeNS(W_NS, "val") || "";
      map[id] = BABELFISH_UI[internalName.toLowerCase()] || internalName;
    }
    return map;
  }

  function paragraphStyleName(stylesIndex, pEl) {
    const pPr = firstChildNS(pEl, W_NS, "pPr");
    if (!pPr) return "Normal";
    const pStyle = firstChildNS(pPr, W_NS, "pStyle");
    if (!pStyle) return "Normal";
    const id = pStyle.getAttributeNS(W_NS, "val");
    return (stylesIndex && stylesIndex[id]) || "Normal";
  }

  function isHeadingStyle(stylesIndex, pEl) {
    return paragraphStyleName(stylesIndex, pEl).startsWith("Heading");
  }

  // ============================================================ Zip/XML-Dokument-Boilerplate
  function extractXmlProlog(xmlString) {
    const m = xmlString.match(/^<\?xml[^>]*\?>/);
    return m ? m[0] : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  }

  function parseXml(xmlString) {
    return new DOMParser().parseFromString(xmlString, "application/xml");
  }

  /** XMLSerializer.serializeToString() liefert KEINEN XML-Prolog - den
   * urspruenglichen Prolog-String (siehe extractXmlProlog) davorsetzen. */
  function serializeXmlWithProlog(doc, prolog) {
    let serialized = new XMLSerializer().serializeToString(doc);
    // Defensiv: falls der Serializer doch einen Prolog mitliefert (browserabhängig), nicht doppelt setzen.
    serialized = serialized.replace(/^<\?xml[^>]*\?>\s*/, "");
    return `${prolog}${serialized}`;
  }

  global.DocxToolkit = {
    W_NS, W14_NS, XML_NS,
    DELETE_COLOR, NR_TAG_COLOR, SUGGEST_COLOR, BLACK, GREY_INFO_COLOR,
    RPR_ORDER,
    createContext, nr, merkeNummer,
    isElement, childrenNS, firstChildNS, descendantsNS, firstDescendantNS, insertOrdered,
    runText, hyperlinkText, paragraphText, paragraphRuns, cellParagraphs, cellText,
    getBody, bodyParagraphs, bodyTables, tableRows, rowCells, tableHeaderTexts, addTableRow,
    findP, findAllP,
    getOrAddRPr, setRunHighlight, setRunColor, setRunStrike, setRunItalic, setRunBold,
    setRunSizeHalfPt, setRunFontNameAsciiHAnsi,
    getRunFontNameAscii, getRunSizeHalfPt, getRunBold, getRunColorHex,
    setRunText, addRun,
    safeRemoveParagraph, markAsDeleted, entferneOderZwischen, addTagRun,
    replaceSpanInParagraph, replaceMarker,
    setCellValue, appendToCell,
    sdtsInCell, setCheckbox, setJaNeinCheckbox,
    deleteBlock, blockBetween, blockVonBis, stripGrey,
    insertParagraphAfter, versionshistorieZeilenGenerisch,
    buildStylesIndex, paragraphStyleName, isHeadingStyle,
    extractXmlProlog, parseXml, serializeXmlWithProlog,
  };
})(typeof window !== "undefined" ? window : globalThis);
