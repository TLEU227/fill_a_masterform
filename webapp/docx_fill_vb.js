/* docx_fill_vb.js - Fachlogik zum automatisierten Vorbefuellen des CS-
 * Validierungsberichts (CS-VB), 1:1 portiert aus dem Python-Referenzskript
 * fill_vb_demo8.py (siehe dort fuer die ausfuehrlichen fachlichen
 * Begruendungen/Konventionen in den Kommentaren - hier bewusst knapper
 * gehalten, aber inhaltlich identisch).
 *
 * Kein ES-Modul: haengt sich an window.DocxFillVB = { fill(...) }. Nutzt
 * window.DocxToolkit (docx_toolkit.js, MUSS vorher per <script> geladen
 * sein) und die globale Klasse `JSZip` (vendor/jszip/jszip.js).
 *
 * fill(templateArrayBuffer, sys, proj) erwartet in `sys`/`proj` GENAU die
 * gleichen Key-Namen wie SYS/PROJ im Python-Skript (== field_key aus den
 * DB-Seed-Dateien db/seed_field_definitions*.sql). Fehlende/leere Werte
 * (undefined/null/"") werden wie Python None/"" behandelt ("nicht gesetzt").
 * Gibt ein Uint8Array (das fertige .docx) zurueck.
 */
(function (global) {
  "use strict";

  const T = global.DocxToolkit;

  // ============================================================ KI-Reifegrad-Matrix (1:1 aus webapp/app.js / fill_vb_demo8.py)
  const KI_REIFEGRAD_MATRIX = {
    "0": { "1": "I", "2": "II", "3": "II", "4": "II", "5": "II" },
    "1": { "1": "I", "2": "III", "3": "III", "4": "III", "5": "III" },
    "2": { "1": "I", "2": "IV", "3": "IV", "4": "V", "5": "V" },
    "3": { "1": "I", "2": "IV", "3": "IV", "4": "V", "5": "V" },
    "4": { "1": "I", "2": "VI", "3": "VI", "4": "VI", "5": "VI" },
    "5": { "1": "I", "2": "VI", "3": "VI", "4": "VI", "5": "VI" },
  };

  function berechneKiReifegrad(sysDaten) {
    if (sysDaten.ki_vorhanden === "nein") return "N/A";
    if (sysDaten.ki_vorhanden !== "ja") return null;
    const autonomie = String(sysDaten.ki_autonomie_stufe);
    const steuerung = String(sysDaten.ki_steuerungsdesign_stufe);
    const zeile = KI_REIFEGRAD_MATRIX[autonomie];
    return zeile ? zeile[steuerung] || null : null;
  }

  function arrEq(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  // ============================================================ Tabellen-Mappings fuer Kap. 6.1 "Dokumentation Initial-Validierung"
  const DOK_MAPPING = {
    Systembewertung: ["systembewertung_dok_id", "systembewertung_version"],
    "CS Validierungsplan (CS-VP)": ["vp_dok_id", "vp_version"],
    "Funktionsspezifikation (FDS)": ["fs_dok_id", "fs_version"],
    "Risikoanalyse (RA)": ["ra_dok_id", "ra_version"],
    "IQ/OQ-Testplan": ["testplan_dok_id", "testplan_version"],
  };
  const DOK_MAPPING_MIT_ERSTELLT = {
    "Hardware Designspezifikation (HDS)": ["hds_erstellt", "hds_dok_id", "hds_version"],
    "Software Designspezifikation (SDS)": ["sds_erstellt", "sds_dok_id", "sds_version"],
    "URS/Traceability-Matrix": ["urs_tm_erstellt", "urs_tm_dok_id", "urs_tm_version"],
    "DQ Abschlussbericht": ["dq_abschlussbericht_erstellt", "dq_abschlussbericht_dok_id", "dq_abschlussbericht_version"],
    "IQ-Testvorschriften (projektspezifisch)": ["iq_testvorschriften_erstellt", "iq_testvorschriften_dok_id", "iq_testvorschriften_version"],
    "IQ-Abschlussbericht": ["iq_abschlussbericht_erstellt", "iq_abschlussbericht_dok_id", "iq_abschlussbericht_version"],
    "OQ-Testvorschriften (projektspezifisch)": ["oq_testvorschriften_erstellt", "oq_testvorschriften_dok_id", "oq_testvorschriften_version"],
    "OQ-Abschlussbericht": ["oq_abschlussbericht_erstellt", "oq_abschlussbericht_dok_id", "oq_abschlussbericht_version"],
    "PQ-Testplan": ["pq_testplan_erstellt", "pq_testplan_dok_id", "pq_testplan_version"],
    "PQ-Abschlussbericht": ["pq_abschlussbericht_erstellt", "pq_abschlussbericht_dok_id", "pq_abschlussbericht_version"],
    "Authorisation for Use (AFU)": ["afu_erstellt", "afu_dok_id", "afu_version"],
  };

  // ============================================================ Kap. 6.2 "Weitere Validierungsdokumente" - 18 Prüfpunkte in Template-Reihenfolge
  const WVD_ZEILEN = [
    "wvd_datenflussdiagramm", "wvd_audit_trail_review_konzept", "wvd_berechtigungskonzept",
    "wvd_trainingsplan", "wvd_ppq", "wvd_user_process_monitoring", "wvd_datenmigration",
    "wvd_wartung_monitoring", "wvd_archivierung_daten", "wvd_backup_restore_konzept",
    "wvd_business_continuity_plan", "wvd_incident_stoerungsmanagement",
    "wvd_aenderungs_konfigurationsmanagement", "wvd_logbuch_system",
    "wvd_lieferantenbewertung_nachweis", "wvd_quality_agreement",
    "wvd_bedienungsanweisungen", "wvd_bedienungshandbuch",
  ];

  async function fill(templateArrayBuffer, sys, proj) {
    sys = sys || {};
    proj = proj || {};
    if (!sys.ki_reifegrad) {
      sys = Object.assign({}, sys, { ki_reifegrad: berechneKiReifegrad(sys) });
    }

    const zip = new JSZip();
    await zip.loadAsync(templateArrayBuffer);

    const docXmlString = await zip.file("word/document.xml").async("string");
    const prolog = T.extractXmlProlog(docXmlString);
    const doc = T.parseXml(docXmlString);

    let stylesIndex = {};
    const stylesFile = zip.file("word/styles.xml");
    if (stylesFile) {
      const stylesXmlString = await stylesFile.async("string");
      stylesIndex = T.buildStylesIndex(stylesXmlString);
    }

    const ctx = T.createContext();

    // ============================================================ 0. Legendebox (ganze Tabelle entfernt)
    for (const t of T.bodyTables(doc)) {
      const rows = T.tableRows(t);
      if (!rows.length) continue;
      const cells0 = T.rowCells(rows[0]);
      if (cells0.length && T.cellText(cells0[0]).trim().startsWith("Diese Legendebox dient nur zur Orientierung")) {
        t.parentNode.removeChild(t);
        ctx.changes.push(["Legendebox (Bedienungshilfe, jedes Dokument) - komplett entfernt", "Legendebox-Text", "[entfernt]"]);
        break;
      }
    }

    // ============================================================ 1. Folgedokument-Hinweis (identisch zur CS-VP-Logik)
    if (proj.ist_folgeprojekt === "ja" && proj.vorgaenger_dok_id) {
      const pSatz = T.findP(doc, (p) => T.paragraphText(p).includes("ist das Folgedokument von"));
      if (pSatz) {
        T.replaceMarker(
          doc, ctx, pSatz, "XXXXXX (Version xx)",
          `${proj.vorgaenger_dok_id} (Version ${proj.vorgaenger_version || "xx"})`,
          "Folgedokument-Hinweis (Anfang, vor Tabelle 1): Vorgänger-Dok-ID + Version (Projekt-DB)",
          { bereich: "Folgedokument-Hinweis" },
        );
      }
      ctx.skipped.push([
        "Folgedokument-Hinweis: erster Teil ('XXXXXX (Version 1.0)')",
        "Dok-ID DIESES Dokuments selbst - erst nach Erzeugung durch QualiPSO bekannt, bleibt Platzhalter.",
      ]);
    } else {
      const pHinweis = T.findP(doc, (p) => T.paragraphText(p).trim().startsWith("Hinweis: Nachfolgender Verweis"));
      const pSatz = T.findP(doc, (p) => T.paragraphText(p).includes("ist das Folgedokument von"));
      for (const p of [pHinweis, pSatz]) if (p) T.markAsDeleted(doc, p);
    }

    // ============================================================ 2. Kopf-Tabelle
    for (const t of T.bodyTables(doc)) {
      const rows = T.tableRows(t);
      if (!rows.length) continue;
      const cells0 = T.rowCells(rows[0]);
      if (cells0.length && T.cellText(cells0[0]).trim().startsWith("Gebäude")) {
        T.setCellValue(doc, ctx, cells0[1], sys.gebaeude, "Kopf-Tabelle: Gebäude", { bereich: "Kopf-Tabelle" });
        T.setCellValue(doc, ctx, cells0[3], sys.bereich, "Kopf-Tabelle: Bereich", { bereich: "Kopf-Tabelle" });
        const cells1 = T.rowCells(rows[1]);
        T.setCellValue(doc, ctx, cells1[1], sys.systemname, "Kopf-Tabelle: Systemname", { bereich: "Kopf-Tabelle" });
        T.setCellValue(doc, ctx, cells1[3], sys.mlcs_id, "Kopf-Tabelle: MLCS-ID", { bereich: "Kopf-Tabelle" });
        break;
      }
    }

    // ============================================================ 3. Tabelle 1 Dokumentenfreigabe - Nutzer-Entscheidung: unangetastet
    ctx.skipped.push(["Tabelle 1: Dokumentenfreigabe", "Nutzer-Entscheidung 04.09.: keine Personen-Ergänzung mehr, Tabelle bleibt unverändert."]);

    // ============================================================ 3b. Tabelle 3 "Gegenstand des CS Validierungsberichts"
    for (const t of T.bodyTables(doc)) {
      const header = T.tableHeaderTexts(t);
      if (arrEq(header, ["System", "Software", "Hauptkomponenten", "Hersteller / Lieferant"])) {
        const rows = T.tableRows(t);
        const r1 = T.rowCells(rows[1]);
        T.setCellValue(doc, ctx, r1[0], sys.systemname, "Tabelle 3: Gegenstand des CS-VB - System (System-DB)", { bereich: "Tabelle 3" });
        let swText = sys.sw_name || "";
        if (sys.sw_version) swText = swText ? `${swText}, ${sys.sw_version}` : sys.sw_version;
        if (swText) {
          T.setCellValue(doc, ctx, r1[1], swText, "Tabelle 3: Gegenstand des CS-VB - Software Name+Version (System-DB)", { bereich: "Tabelle 3" });
        }
        T.setCellValue(doc, ctx, r1[3], sys.hersteller, "Tabelle 3: Gegenstand des CS-VB - Hersteller/Lieferant (System-DB)", { bereich: "Tabelle 3" });
        ctx.skipped.push(["Tabelle 3: Hauptkomponenten", "Kein DB-Feld dafür vorgesehen (wie beim CS-VP)."]);
        break;
      }
    }

    // ============================================================ 3bb. Alle "V2.0 (CC Nummer): ..."-Zeilen, gesteuert durch folgeversion
    const v2ZeileOq = T.findP(doc, (p) => T.paragraphText(p).trim() === "V2.0 (CC Nummer): Beschreibung der OQ-Ergebnisse");
    const v2ZeilePq = T.findP(doc, (p) => T.paragraphText(p).trim().startsWith("V2.0 (CC Nummer): Beschreibung der Ergebnisse der PQ "));
    const v2ZeilePpq = T.findP(doc, (p) => T.paragraphText(p).trim().startsWith("V2.0 (CC Nummer): Beschreibung der Ergebnisse der PPQ "));
    T.versionshistorieZeilenGenerisch(doc, ctx, proj, [v2ZeileOq, v2ZeilePq, v2ZeilePpq]);

    // ============================================================ 3c. Generischer Scan: alle "(CC Nummer)"-Platzhalter
    (function ersetzeCcNummerUeberall() {
      let n = 0;
      const cc = proj.change_control_nummer;
      if (!cc) {
        ctx.skipped.push(["'(CC Nummer)'-Platzhalter im gesamten Dokument", "Kein change_control_nummer in der Projekt-DB hinterlegt."]);
        return;
      }
      for (const p of T.bodyParagraphs(doc)) {
        let idx = T.paragraphText(p).indexOf("(CC Nummer)");
        while (idx !== -1) {
          T.replaceSpanInParagraph(doc, p, idx, idx + "(CC Nummer)".length, `(${cc})`, false);
          n++;
          idx = T.paragraphText(p).indexOf("(CC Nummer)");
        }
      }
      if (n) {
        const tag = T.nr(ctx, "V2.0-Zeilen");
        T.merkeNummer(ctx, tag, `'(CC Nummer)'-Platzhalter im gesamten Dokument (${n} Stellen)`, cc);
        ctx.changes.push([`'(CC Nummer)'-Platzhalter (${n} Stellen, Projekt-DB: change_control_nummer)`, "(CC Nummer)", `(${cc})`]);
      }
    })();

    // ============================================================ 3d. Tabelle 5: Lieferantenbewertung
    for (const t of T.bodyTables(doc)) {
      const header = T.tableHeaderTexts(t);
      if (arrEq(header, ["Lieferant / Adresse", "Dienstleistung / Service", "Lieferantenbewertung"])) {
        const rowA = T.rowCells(T.tableRows(t)[1]);
        T.replaceMarker(doc, ctx, T.cellParagraphs(rowA[0])[0], "Lieferant A", sys.hersteller, "Tabelle 5: Lieferantenbewertung - Lieferant A Name (System-DB: hersteller)", { bereich: "Tabelle 5" });
        if (sys.lieferantennummer) {
          T.replaceMarker(doc, ctx, T.cellParagraphs(rowA[2])[0], "000000", sys.lieferantennummer, "Tabelle 5: Lieferantenbewertung - Lieferant A QualiPSO-ID (System-DB: lieferantennummer)", { bereich: "Tabelle 5" });
        }
        ctx.skipped.push(["Tabelle 5: Lieferantenbewertung - Lieferant B + Adresse/Dienstleistung", "Kein zweiter Lieferant und keine Adress-/Service-Felder in unseren Demo-Daten -> bleibt unangetastet."]);
        break;
      }
    }

    // ============================================================ 3e. Kap. 1.2 "Ziel und Umfang": Initial-Validierung
    {
      const pInitial = T.findP(doc, (p) => T.paragraphText(p).startsWith("Die Initial-Validierung erfolgte im Rahmen des Change Controls"));
      if (pInitial) {
        if (proj.ist_folgeprojekt === "nein") {
          if (proj.change_control_nummer) {
            T.replaceMarker(doc, ctx, pInitial, "zu benennen", proj.change_control_nummer, "Kap. 1.2: Initial-Validierung - CC-Nummer eingesetzt (Projekt-DB: change_control_nummer)", { markBlack: true, bereich: "Kap. 1.2" });
          } else {
            ctx.skipped.push(["Kap. 1.2: Initial-Validierung - CC-Nummer", "Kein change_control_nummer in der Projekt-DB hinterlegt -> Platzhalter bleibt."]);
          }
          for (const r of T.paragraphRuns(pInitial)) {
            if (T.runText(r)) {
              T.setRunColor(doc, r, T.BLACK);
              T.setRunHighlight(doc, r, "yellow");
            }
          }
        } else if (proj.ist_folgeprojekt === "ja") {
          const vorschau = T.paragraphText(pInitial).slice(0, 60);
          T.markAsDeleted(doc, pInitial);
          ctx.changes.push(["Kap. 1.2: 'Initial-Validierung'-Absatz entfernt (Projekt-DB: ist_folgeprojekt=ja, keine Initial-Validierung)", vorschau, "[entfernt]"]);
        } else {
          ctx.skipped.push(["Kap. 1.2: Initial-Validierung?", "ist_folgeprojekt nicht gesetzt -> Absatz bleibt unangetastet."]);
        }
      }
    }

    // ============================================================ 4. 'Validierungsplan XXXXX' - alle Vorkommen im gesamten Fliesstext
    (function ersetzeVpMarkerUeberall() {
      let n = 0;
      if (!proj.vp_dok_id) {
        ctx.skipped.push(["'Validierungsplan XXXXX' (>=10 Stellen im Fließtext)", "Kein vp_dok_id in der Projekt-DB hinterlegt -> Marker bleiben unangetastet."]);
        return 0;
      }
      for (const p of T.bodyParagraphs(doc)) {
        for (const r of T.paragraphRuns(p)) {
          if (T.runText(r) === "XXXXX") {
            T.setRunText(doc, r, proj.vp_dok_id);
            T.setRunHighlight(doc, r, "yellow");
            T.setRunColor(doc, r, null);
            n++;
          }
        }
      }
      if (n) {
        const tag = T.nr(ctx, "Fließtext");
        T.merkeNummer(ctx, tag, `'Validierungsplan XXXXX' im Fließtext (${n} Stellen)`, proj.vp_dok_id);
        ctx.changes.push([`'Validierungsplan XXXXX' im Fließtext (${n} Stellen, Projekt-DB: vp_dok_id)`, "XXXXX", `[${tag}] ${proj.vp_dok_id}`]);
      }
      return n;
    })();

    // ============================================================ 4b. Alle "unveraendert vs. geaendert"-Stellen
    function geaendertAlternative(pUnveraendert, pGeaendertIntro, feldwert, freitextWert, label, bereich, pFreitextPlatzhalter) {
      if (feldwert !== "ja" && feldwert !== "nein") {
        ctx.skipped.push([label, "Kein Wert in der Projekt-DB hinterlegt -> beide Absätze bleiben unangetastet."]);
        return;
      }
      T.entferneOderZwischen(doc, pUnveraendert, pGeaendertIntro);
      if (feldwert === "nein") {
        for (const r of T.paragraphRuns(pUnveraendert)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
        const tag = T.nr(ctx, bereich);
        T.addTagRun(doc, pUnveraendert, tag);
        T.merkeNummer(ctx, tag, label, "unverändert");
        ctx.changes.push([label, "(beide Alternativen im Template)", `[${tag}] unverändert beibehalten, 'geändert'-Block entfernt`]);
        T.markAsDeleted(doc, pGeaendertIntro);
        if (pFreitextPlatzhalter) T.markAsDeleted(doc, pFreitextPlatzhalter);
      } else {
        T.markAsDeleted(doc, pUnveraendert);
        for (const r of T.paragraphRuns(pGeaendertIntro)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
        const tag = T.nr(ctx, bereich);
        T.addTagRun(doc, pGeaendertIntro, tag);
        T.merkeNummer(ctx, tag, label, "geändert, 'unverändert'-Block entfernt");
        ctx.changes.push([label, "(beide Alternativen im Template)", `[${tag}] 'geändert'-Block beibehalten`]);
        if (pFreitextPlatzhalter && freitextWert) {
          const tag2 = T.nr(ctx, bereich);
          const runs = T.paragraphRuns(pFreitextPlatzhalter);
          for (let i = 1; i < runs.length; i++) T.setRunText(doc, runs[i], "");
          if (runs.length) {
            T.setRunText(doc, runs[0], `[${tag2}] ${freitextWert}`);
            T.setRunHighlight(doc, runs[0], "yellow");
            T.setRunColor(doc, runs[0], null);
          }
          T.merkeNummer(ctx, tag2, `${label} - Beschreibung`, freitextWert);
        } else if (pFreitextPlatzhalter) {
          ctx.skipped.push([`${label} - Beschreibung`, "Kein Freitext in der Projekt-DB hinterlegt -> Platzhalter '...' bleibt unangetastet."]);
        }
      }
    }

    // Kap. 1.4 Systembeschreibung (hat "Oder:")
    {
      const p1 = T.findP(doc, (p) => T.paragraphText(p).trim().startsWith("Das System (Systembeschreibung"));
      const p2 = T.findP(doc, (p) => T.paragraphText(p).trim().startsWith("Das System (die Systembeschreibung"));
      const p3 = T.findP(doc, (p) => T.paragraphText(p).trim() === "Beschreibung des Systemstruktur/ des Datenflusses:");
      if (p1 && p2) {
        geaendertAlternative(p1, p2, proj.systembeschreibung_geaendert, proj.systembeschreibung_aenderung_beschreibung, "Kap. 1.4: Systembeschreibung gegenüber CS-VP geändert? (Projekt-DB: systembeschreibung_geaendert)", "Kap. 1.4", p3);
      }
    }

    // Kap. 2.1 Verantwortlichkeiten (KEIN "Oder" im Template, trotzdem Alternative)
    {
      const p1 = T.findP(doc, (p) => T.paragraphText(p).trim().startsWith("Die Verantwortlichkeiten sind im Validierungsplan"));
      const p2 = T.findP(doc, (p) => {
        const txt = T.paragraphText(p).trim();
        return txt.startsWith("Die  Verantwortlichkeiten haben sich gegenüber dem Validierungsplan wie folgt geändert")
          || txt.startsWith("Die Verantwortlichkeiten haben sich gegenüber dem Validierungsplan wie folgt geändert");
      });
      if (p1 && p2) {
        const paras = T.bodyParagraphs(doc);
        const idx2 = paras.indexOf(p2);
        let p3 = null;
        if (idx2 + 1 < paras.length && T.paragraphText(paras[idx2 + 1]).trim() === "...") p3 = paras[idx2 + 1];
        geaendertAlternative(p1, p2, proj.verantwortlichkeiten_geaendert, proj.verantwortlichkeiten_aenderung_beschreibung, "Kap. 2.1: Verantwortlichkeiten gegenüber CS-VP geändert? (Projekt-DB: verantwortlichkeiten_geaendert, im Template ohne 'Oder')", "Kap. 2.1", p3);
        ctx.skipped.push(["Kap. 2.1: Verantwortlichkeiten - Duplikat nach der 'V2.0 (CC Nummer)'-Zeile", "Fast identischer Absatz-Block direkt nach der V2.0-Zeile im Template (mutmaßlich Kopierfehler in der Vorlage selbst) - bewusst nicht angetastet, um nichts Falsches zu raten."]);
      }
    }

    // Kap. 2.2 Verantwortlichkeiten des/der Lieferanten (KEIN "Oder")
    {
      const p1 = T.findP(doc, (p) => T.paragraphText(p).trim().startsWith("Die Verantwortlichkeiten des / der Lieferanten sind im Validierungsplan"));
      if (p1) {
        const paras = T.bodyParagraphs(doc);
        const idx1 = paras.indexOf(p1);
        const p2 = paras.slice(idx1 + 1, idx1 + 4).find((p) => T.paragraphText(p).trim().startsWith("Die Verantwortlichkeiten haben sich")) || null;
        if (p2) {
          const idx2 = paras.indexOf(p2);
          let p3 = null;
          if (idx2 + 1 < paras.length && T.paragraphText(paras[idx2 + 1]).trim() === "...") p3 = paras[idx2 + 1];
          geaendertAlternative(p1, p2, proj.lieferanten_verantwortlichkeiten_geaendert, proj.lieferanten_verantwortlichkeiten_aenderung_beschreibung, "Kap. 2.2: Verantwortlichkeiten des/der Lieferanten gegenüber CS-VP geändert? (Projekt-DB: lieferanten_verantwortlichkeiten_geaendert, im Template ohne 'Oder')", "Kap. 2.2", p3);
        }
      }
    }

    // Kap. 2.2.1 Lieferantenbewertung (hat "Oder:") - steuert auch, ob Tabelle 5 ueberhaupt gebraucht wird
    {
      const p1 = T.findP(doc, (p) => T.paragraphText(p).trim().startsWith("Lieferantenbewertung siehe Validierungsplan"));
      const p2 = T.findP(doc, (p) => T.paragraphText(p).trim() === "Die Lieferantenbewertung wurde durchgeführt:");
      if (p1 && p2) {
        const neuDurchgefuehrt = proj.lieferantenbewertung_neu_durchgefuehrt;
        T.entferneOderZwischen(doc, p1, p2);
        if (neuDurchgefuehrt === "ja") {
          T.markAsDeleted(doc, p1);
          for (const r of T.paragraphRuns(p2)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Kap. 2.2.1");
          T.addTagRun(doc, p2, tag);
          T.merkeNummer(ctx, tag, "Kap. 2.2.1: Lieferantenbewertung neu durchgeführt (Projekt-DB: lieferantenbewertung_neu_durchgefuehrt)", "ja");
          ctx.changes.push(["Kap. 2.2.1: Lieferantenbewertung neu durchgeführt - Tabelle 5 bleibt", "(beide Alternativen)", `[${tag}] beibehalten`]);
        } else if (neuDurchgefuehrt === "nein") {
          for (const r of T.paragraphRuns(p1)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Kap. 2.2.1");
          T.addTagRun(doc, p1, tag);
          T.merkeNummer(ctx, tag, "Kap. 2.2.1: Lieferantenbewertung - nur Verweis auf CS-VP (Projekt-DB: lieferantenbewertung_neu_durchgefuehrt=nein)", "nein");
          ctx.changes.push(["Kap. 2.2.1: keine neue Lieferantenbewertung - Verweis auf CS-VP bleibt, Tabelle 5 entfällt", "(beide Alternativen)", `[${tag}] beibehalten`]);
          T.markAsDeleted(doc, p2);
          for (const t of T.bodyTables(doc)) {
            const header = T.tableHeaderTexts(t);
            if (arrEq(header, ["Lieferant / Adresse", "Dienstleistung / Service", "Lieferantenbewertung"])) {
              t.parentNode.removeChild(t);
              ctx.changes.push(["Tabelle 5: Lieferantenbewertung - komplett entfernt (keine neue Bewertung in diesem Projekt)", "Tabelle 5", "[entfernt]"]);
              break;
            }
          }
        } else {
          ctx.skipped.push(["Kap. 2.2.1: Lieferantenbewertung neu durchgeführt?", "Kein Wert in der Projekt-DB -> beide Absätze + Tabelle 5 bleiben unangetastet."]);
        }
      }
    }

    // Kap. 3.x Testprozess (hat "Oder:")
    {
      const p1 = T.findP(doc, (p) => T.paragraphText(p).trim() === "Während der Validierung wurde der Testprozess wie folgt angepasst:");
      const p2 = T.findP(doc, (p) => T.paragraphText(p).trim().startsWith("Bei der vorliegenden Validierung wurden Standardtestvorschriften"));
      let pEllipse = null;
      if (p1) {
        const paras = T.bodyParagraphs(doc);
        const idx1 = paras.indexOf(p1);
        if (idx1 + 1 < paras.length && T.paragraphText(paras[idx1 + 1]).trim() === "...") pEllipse = paras[idx1 + 1];
      }
      if (p1 && p2) {
        const angepasst = proj.testprozess_angepasst;
        T.entferneOderZwischen(doc, p1, p2);
        if (angepasst === "ja") {
          for (const r of T.paragraphRuns(p1)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Kap. 3 Testprozess");
          T.addTagRun(doc, p1, tag);
          T.merkeNummer(ctx, tag, "Kap. 3 Testprozess: während der Validierung angepasst (Projekt-DB: testprozess_angepasst)", "ja");
          ctx.changes.push(["Kap. 3 Testprozess: angepasst-Block bleibt, Standardtestvorschriften-Block entfernt", "(beide Alternativen)", `[${tag}] beibehalten`]);
          T.markAsDeleted(doc, p2);
          if (pEllipse && proj.testprozess_anpassung_beschreibung) {
            const tag2 = T.nr(ctx, "Kap. 3 Testprozess");
            const wert = proj.testprozess_anpassung_beschreibung;
            const runs = T.paragraphRuns(pEllipse);
            for (let i = 1; i < runs.length; i++) T.setRunText(doc, runs[i], "");
            if (runs.length) {
              T.setRunText(doc, runs[0], `[${tag2}] ${wert}`);
              T.setRunHighlight(doc, runs[0], "yellow");
              T.setRunColor(doc, runs[0], null);
            }
            T.merkeNummer(ctx, tag2, "Kap. 3 Testprozess - Beschreibung der Anpassung", wert);
          }
        } else if (angepasst === "nein") {
          T.markAsDeleted(doc, p1);
          if (pEllipse) T.markAsDeleted(doc, pEllipse);
          for (const r of T.paragraphRuns(p2)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Kap. 3 Testprozess");
          T.addTagRun(doc, p2, tag);
          T.merkeNummer(ctx, tag, "Kap. 3 Testprozess: Standardtestvorschriften verwendet, nicht angepasst (Projekt-DB: testprozess_angepasst=nein)", "nein");
          ctx.changes.push(["Kap. 3 Testprozess: Standardtestvorschriften-Block bleibt, angepasst-Block entfernt", "(beide Alternativen)", `[${tag}] beibehalten`]);
        } else {
          ctx.skipped.push(["Kap. 3 Testprozess: angepasst?", "Kein Wert in der Projekt-DB -> beide Absätze bleiben unangetastet."]);
        }
      }
    }

    // ============================================================ 5. Tabelle 'Dokumentation Initial-Validierung' (Kap. 6.1)
    for (const t of T.bodyTables(doc)) {
      const header = T.tableHeaderTexts(t);
      const rows = T.tableRows(t);
      if (arrEq(header, ["Dokumententyp", "Dokumenten-Nr.", "Version"]) && rows.length > 10) {
        const ohneFeld = [];
        const rowsZuEntfernen = [];
        for (const row of rows.slice(1)) {
          const cells = T.rowCells(row);
          const typ = T.cellText(cells[0]).trim();
          if (typ === "CS Validierungsbericht (CS-VB)") continue;
          const felder = DOK_MAPPING[typ];
          if (felder) {
            const [idKey, verKey] = felder;
            if (proj[idKey]) T.setCellValue(doc, ctx, cells[1], proj[idKey], `Tabelle 'Dokumentation Initial-Validierung' - ${typ}, Dok-Nr. (Projekt-DB: ${idKey})`, { bereich: "Dok-Übersicht" });
            if (proj[verKey]) T.setCellValue(doc, ctx, cells[2], proj[verKey], `Tabelle 'Dokumentation Initial-Validierung' - ${typ}, Version (Projekt-DB: ${verKey})`, { bereich: "Dok-Übersicht" });
            continue;
          }
          const felder2 = DOK_MAPPING_MIT_ERSTELLT[typ];
          if (felder2) {
            const [erstelltKey, idKey, verKey] = felder2;
            const erstelltWert = proj[erstelltKey];
            if (erstelltWert === "nein") {
              rowsZuEntfernen.push([row, typ]);
            } else if (erstelltWert === "ja") {
              if (proj[idKey]) T.setCellValue(doc, ctx, cells[1], proj[idKey], `Tabelle 'Dokumentation Initial-Validierung' - ${typ}, Dok-Nr. (Projekt-DB: ${idKey})`, { bereich: "Dok-Übersicht" });
              if (proj[verKey]) T.setCellValue(doc, ctx, cells[2], proj[verKey], `Tabelle 'Dokumentation Initial-Validierung' - ${typ}, Version (Projekt-DB: ${verKey})`, { bereich: "Dok-Übersicht" });
            } else {
              ctx.skipped.push([`Tabelle 'Dokumentation Initial-Validierung' - ${typ}: erstellt?`, `${erstelltKey} nicht in der Projekt-DB gesetzt -> Zeile bleibt mit Platzhalter 'XXXX' stehen.`]);
            }
            continue;
          }
          ohneFeld.push(typ);
        }
        for (const [row, typ] of rowsZuEntfernen) {
          row.parentNode.removeChild(row);
          ctx.changes.push([`Tabelle 'Dokumentation Initial-Validierung' - Zeile '${typ}' entfernt (nicht erstellt)`, "Zeile mit Platzhalter 'XXXX'", "[Zeile entfernt]"]);
        }
        if (ohneFeld.length) {
          ctx.skipped.push(["Tabelle 'Dokumentation Initial-Validierung' - Zeilen ohne jedes Projekt-DB-Feld", `Betroffen: ${ohneFeld.join(", ")} - bleiben unangetastet.`]);
        }
        break;
      }
    }

    // ============================================================ 6. Tabelle 'Weitere Validierungsdokumente' (Kap. 6.2, 18 Prüfpunkte)
    for (const t of T.bodyTables(doc)) {
      const header = T.tableHeaderTexts(t);
      if (header.length && header[0] === "Prüfpunkte") {
        const rows = T.tableRows(t);
        if (rows.length - 1 !== WVD_ZEILEN.length) {
          ctx.skipped.push(["Tabelle 'Weitere Validierungsdokumente'", `Erwartet ${WVD_ZEILEN.length} Zeilen, gefunden ${rows.length - 1} -> nicht automatisiert (Template evtl. geändert).`]);
          break;
        }
        for (let i = 0; i < WVD_ZEILEN.length; i++) {
          const row = rows[i + 1];
          const slug = WVD_ZEILEN[i];
          const cells = T.rowCells(row);
          const typLabel = T.cellText(cells[0]).trim().split("\n")[0].split(":")[0];
          const erforderlichKey = slug === "wvd_ppq" ? "ppq_durchgefuehrt" : `${slug}_erforderlich`;
          const erforderlichWert = proj[erforderlichKey];
          if (erforderlichWert !== "ja" && erforderlichWert !== "nein") {
            ctx.skipped.push([`Tabelle 'Weitere Validierungsdokumente' - ${typLabel}: erforderlich?`, `${erforderlichKey} nicht in der Projekt-DB gesetzt -> Zeile bleibt unangetastet.`]);
            continue;
          }
          T.setJaNeinCheckbox(doc, ctx, cells[1], erforderlichWert, `Tabelle 'Weitere Validierungsdokumente' - ${typLabel}: erforderlich? (Projekt-DB: ${erforderlichKey})`, "Weitere Val.-Dok.");
          if (erforderlichWert === "ja") {
            const dokId = proj[`${slug}_dok_id`];
            const titel = proj[`${slug}_titel`];
            if (dokId) {
              const text = dokId + (titel ? ` (${titel})` : "");
              T.appendToCell(doc, ctx, cells[2], text, `Tabelle 'Weitere Validierungsdokumente' - ${typLabel}: Dokumenten-ID (Projekt-DB: ${slug}_dok_id)`, { bereich: "Weitere Val.-Dok." });
            } else {
              ctx.skipped.push([`Tabelle 'Weitere Validierungsdokumente' - ${typLabel}: Dokumenten-ID`, "Kein Wert in der Projekt-DB hinterlegt -> Spalte bleibt leer."]);
            }
          } else {
            const begruendung = proj[`${slug}_begruendung`];
            if (begruendung) {
              T.appendToCell(doc, ctx, cells[2], begruendung, `Tabelle 'Weitere Validierungsdokumente' - ${typLabel}: Begründung (Projekt-DB: ${slug}_begruendung, Vorschlag - vor Freigabe zu bestätigen)`, { markSuggested: true, bereich: "Weitere Val.-Dok." });
            } else {
              ctx.skipped.push([`Tabelle 'Weitere Validierungsdokumente' - ${typLabel}: Begründung`, "Kein Wert in der Projekt-DB hinterlegt -> Spalte bleibt leer."]);
            }
          }
        }
        break;
      }
    }

    // ============================================================ 7. Aenderungshistorie
    for (const t of T.bodyTables(doc)) {
      const header = T.tableHeaderTexts(t);
      if (header.length === 3 && header[1] === "Change Control") {
        for (const eintrag of proj.history || []) {
          const newRow = T.addTableRow(doc, t);
          const cells = T.rowCells(newRow);
          const werte = [`Freigabedatum: -- / ${eintrag.version}`, eintrag.cc_nummer, eintrag.beschreibung];
          werte.forEach((wert, ci) => {
            T.setCellValue(doc, ctx, cells[ci], wert, `Änderungshistorie - neue Zeile V${eintrag.version} (Projekt-DB)`, { markBlack: true, bereich: "Änderungshistorie" });
          });
        }
        break;
      }
    }

    // ============================================================ 8. Kap. 4.1: Einsatz von Kuenstlicher Intelligenz
    {
      const kiReifegrad = sys.ki_reifegrad;
      const pKiOhne = T.findP(doc, (p) => T.paragraphText(p).trim() === "Innerhalb des CS kommt KEINE künstliche Intelligenz zum Einsatz.");
      const pKiMit = T.findP(doc, (p) => T.paragraphText(p).trim() === "MIT Künstliche Intelligenz:");
      if (["N/A", "I", "II"].includes(kiReifegrad)) {
        if (pKiOhne && pKiMit) T.entferneOderZwischen(doc, pKiOhne, pKiMit);
        const block = T.blockBetween(doc, stylesIndex, (p) => T.paragraphText(p).trim() === "MIT Künstliche Intelligenz:");
        T.deleteBlock(doc, ctx, block, `Kap. 4.1: 'MIT Künstliche Intelligenz'-Block komplett gestrichen (System-DB: ki_reifegrad=${kiReifegrad})`);
      } else if (["III", "IV", "V", "VI"].includes(kiReifegrad)) {
        const block = T.blockVonBis(
          doc,
          (p) => T.paragraphText(p).trim() === "Innerhalb des CS kommt KEINE künstliche Intelligenz zum Einsatz.",
          (p) => T.paragraphText(p).trim() === "MIT Künstliche Intelligenz:",
        );
        T.deleteBlock(doc, ctx, block, `Kap. 4.1: 'ohne Künstliche Intelligenz'-Block komplett gestrichen (System-DB: ki_reifegrad=${kiReifegrad})`);
      } else {
        ctx.skipped.push(["Kap. 4.1: Einsatz von Künstlicher Intelligenz", "ki_reifegrad konnte nicht berechnet werden (ki_vorhanden/-autonomie_stufe/-steuerungsdesign_stufe nicht vollständig gesetzt) -> beide Blöcke bleiben unangetastet."]);
      }
    }

    // ============================================================ 9. Kap. 4.2/4.7/4.8/4.9/4.10: DQ/IQ/OQ/PQ/PPQ-Ergebnisse
    function offeneAnforderungenSatz(pJa, pNein, feldwert, label, bereich) {
      if (feldwert !== "ja" && feldwert !== "nein") {
        ctx.skipped.push([label, "Kein Wert in der Projekt-DB hinterlegt -> beide Absätze bleiben unangetastet."]);
        return;
      }
      const kept = feldwert === "ja" ? pJa : pNein;
      const deleted = feldwert === "ja" ? pNein : pJa;
      T.entferneOderZwischen(doc, pJa, pNein);
      for (const r of T.paragraphRuns(kept)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
      const tag = T.nr(ctx, bereich);
      T.addTagRun(doc, kept, tag);
      T.merkeNummer(ctx, tag, label, feldwert.charAt(0).toUpperCase() + feldwert.slice(1));
      ctx.changes.push([label, "(beide Alternativen im Template)", `[${tag}] '${T.paragraphText(kept).slice(0, 50)}...' beibehalten, Alternative + 'Oder:' entfernt`]);
      T.markAsDeleted(doc, deleted);
    }

    const pDqJa = T.findP(doc, (p) => T.paragraphText(p).startsWith("Offene Anforderungen die im Rahmen der DQ"));
    const pDqNein = T.findP(doc, (p) => T.paragraphText(p).trim() === "Im Rahmen der DQ sind keine offenen Anforderungen aufgetreten.");
    if (pDqJa && pDqNein) offeneAnforderungenSatz(pDqJa, pDqNein, proj.dq_offene_anforderungen, "Kap. 4.2 DQ: offene Anforderungen aufgetreten? (Projekt-DB: dq_offene_anforderungen)", "Kap. 4.2 DQ");

    // IQ: echte 3-Wege-Weiche
    {
      const pIqJa = T.findP(doc, (p) => T.paragraphText(p).trim() === "Alle offenen Anforderungen wurden spätestens mit Abschluss PQ behoben und final geschlossen.");
      const pIqUnkritisch = T.findP(doc, (p) => T.paragraphText(p).startsWith("Die folgenden offenen Anforderungen wurden als unkritisch"));
      const pIqUnkritischDesc = T.findP(doc, (p) => T.paragraphText(p).trim() === "Beschreibung der offenen Anforderungen...");
      const pIqUnkritischCc = T.findP(doc, (p) => T.paragraphText(p).startsWith("Diese Anforderungen werden nach Abschluss der Validierung"));
      const pIqNein = T.findP(doc, (p) => T.paragraphText(p).trim() === "Im Rahmen der IQ sind keine offenen Anforderungen aufgetreten.");
      if (pIqJa && pIqUnkritisch && pIqUnkritischCc && pIqNein) {
        T.entferneOderZwischen(doc, pIqJa, pIqUnkritisch);
        T.entferneOderZwischen(doc, pIqUnkritischCc, pIqNein);
        const iqJa = proj.iq_offene_anforderungen;
        const iqUnkritisch = proj.iq_offene_anforderungen_unkritisch;
        if (iqJa === "nein") {
          T.markAsDeleted(doc, pIqJa);
          for (const p of [pIqUnkritisch, pIqUnkritischDesc, pIqUnkritischCc]) if (p) T.markAsDeleted(doc, p);
          for (const r of T.paragraphRuns(pIqNein)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Kap. 4.7 IQ");
          T.addTagRun(doc, pIqNein, tag);
          T.merkeNummer(ctx, tag, "Kap. 4.7 IQ: offene Anforderungen aufgetreten? (Projekt-DB: iq_offene_anforderungen)", "Nein");
          ctx.changes.push(["Kap. 4.7 IQ: 'keine offenen Anforderungen'-Satz beibehalten, beide 'ja'-Varianten entfernt", "(3 Alternativen im Template)", `[${tag}] beibehalten`]);
        } else if (iqJa === "ja" && iqUnkritisch === "ja") {
          T.markAsDeleted(doc, pIqJa);
          T.markAsDeleted(doc, pIqNein);
          for (const p of [pIqUnkritisch, pIqUnkritischCc]) {
            for (const r of T.paragraphRuns(p)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          }
          const tag = T.nr(ctx, "Kap. 4.7 IQ");
          T.addTagRun(doc, pIqUnkritischCc, tag);
          T.merkeNummer(ctx, tag, "Kap. 4.7 IQ: offene Anforderungen als unkritisch bewertet (Projekt-DB: iq_offene_anforderungen_unkritisch)", "Ja");
          ctx.changes.push(["Kap. 4.7 IQ: 'unkritisch bewertet'-Variante beibehalten, beide anderen Varianten entfernt", "(3 Alternativen im Template)", `[${tag}] beibehalten`]);
          if (pIqUnkritischDesc && proj.iq_offene_anforderungen_beschreibung) {
            const tag2 = T.nr(ctx, "Kap. 4.7 IQ");
            const wert = proj.iq_offene_anforderungen_beschreibung;
            const runs = T.paragraphRuns(pIqUnkritischDesc);
            for (let i = 1; i < runs.length; i++) T.setRunText(doc, runs[i], "");
            if (runs.length) {
              T.setRunText(doc, runs[0], `[${tag2}] ${wert}`);
              T.setRunHighlight(doc, runs[0], "yellow");
              T.setRunColor(doc, runs[0], null);
            }
            T.merkeNummer(ctx, tag2, "Kap. 4.7 IQ - Beschreibung der als unkritisch bewerteten offenen Anforderungen (Projekt-DB: iq_offene_anforderungen_beschreibung)", wert);
          }
          if (proj.change_control_nummer) {
            T.replaceMarker(doc, ctx, pIqUnkritischCc, "CC-XXXX", proj.change_control_nummer, "Kap. 4.7 IQ - Change Control für Nachverfolgung (Projekt-DB: change_control_nummer, wiederverwendet)", { markBlack: true, bereich: "Kap. 4.7 IQ" });
          }
        } else if (iqJa === "ja") {
          for (const p of [pIqUnkritisch, pIqUnkritischDesc, pIqUnkritischCc]) if (p) T.markAsDeleted(doc, p);
          T.markAsDeleted(doc, pIqNein);
          for (const r of T.paragraphRuns(pIqJa)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Kap. 4.7 IQ");
          T.addTagRun(doc, pIqJa, tag);
          T.merkeNummer(ctx, tag, "Kap. 4.7 IQ: offene Anforderungen aufgetreten, bis PQ behoben (Projekt-DB: iq_offene_anforderungen)", "Ja");
          ctx.changes.push(["Kap. 4.7 IQ: 'bis PQ behoben'-Variante beibehalten, beide anderen Varianten entfernt", "(3 Alternativen im Template)", `[${tag}] beibehalten`]);
        } else {
          ctx.skipped.push(["Kap. 4.7 IQ: offene Anforderungen aufgetreten?", "iq_offene_anforderungen nicht in der Projekt-DB gesetzt -> alle 3 Alternativen bleiben unangetastet."]);
        }
      }
    }

    function abschlussberichtAlternative(pBericht, pHier, v2Zeile, feldwert, label, bereich) {
      if (feldwert !== "ja" && feldwert !== "nein") {
        ctx.skipped.push([label, "Kein Wert in der Projekt-DB hinterlegt -> beide Absätze bleiben unangetastet."]);
        return;
      }
      T.entferneOderZwischen(doc, pBericht, pHier);
      if (feldwert === "ja") {
        for (const r of T.paragraphRuns(pBericht)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
        const tag = T.nr(ctx, bereich);
        T.addTagRun(doc, pBericht, tag);
        T.merkeNummer(ctx, tag, label, "Ja (eigener Abschlussbericht)");
        ctx.changes.push([label, "(beide Alternativen im Template)", `[${tag}] 'Abschlussbericht'-Satz beibehalten, 'in diesem Bericht'-Satz + zugehörige V2.0-Zeile entfernt`]);
        T.markAsDeleted(doc, pHier);
        if (v2Zeile) T.markAsDeleted(doc, v2Zeile);
      } else {
        T.markAsDeleted(doc, pBericht);
        for (const r of T.paragraphRuns(pHier)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
        const tag = T.nr(ctx, bereich);
        T.addTagRun(doc, pHier, tag);
        T.merkeNummer(ctx, tag, label, "Nein (Ergebnisse in diesem CS-VB)");
        ctx.changes.push([label, "(beide Alternativen im Template)", `[${tag}] 'in diesem Bericht'-Satz beibehalten, 'Abschlussbericht'-Satz entfernt`]);
        if (v2Zeile) {
          ctx.skipped.push([`${label} - zugehörige 'V2.0 (CC Nummer)'-Ergebniszeile`, "Phasenspezifischer Ergebnistext (z.B. konkrete OQ/PQ/PPQ-Ergebnisse) - keine GxP-Ergebnisaussage automatisiert erfunden, Platzhalter bleibt zur manuellen Eintragung stehen."]);
        }
      }
    }

    {
      const pOqJa = T.findP(doc, (p) => T.paragraphText(p).startsWith("Alle OQ-Prüfungen wurden"));
      const pOqNein = T.findP(doc, (p) => T.paragraphText(p).trim() === "Im Rahmen der OQ sind keine offenen Anforderungen aufgetreten.");
      if (pOqJa && pOqNein) offeneAnforderungenSatz(pOqJa, pOqNein, proj.oq_offene_anforderungen, "Kap. 4.8 OQ: offene Anforderungen aufgetreten? (Projekt-DB: oq_offene_anforderungen)", "Kap. 4.8 OQ");
      const pOqAbschlussbericht = T.findP(doc, (p) => T.paragraphText(p).trim() === "Die Ergebnisse der OQ sind in den OQ-Testprotokollen dokumentiert und im OQ Abschlussbericht zusammengefasst.");
      const pOqInBericht = T.findP(doc, (p) => T.paragraphText(p).startsWith("Die Ergebnisse der OQ sind in den OQ-Testprotokollen dokumentiert und in diesem Validierungsbericht"));
      if (pOqAbschlussbericht && pOqInBericht) abschlussberichtAlternative(pOqAbschlussbericht, pOqInBericht, v2ZeileOq, proj.oq_abschlussbericht_erstellt, "Kap. 4.8 OQ: eigener OQ-Abschlussbericht erstellt? (Projekt-DB: oq_abschlussbericht_erstellt)", "Kap. 4.8 OQ");
    }

    {
      const pPqJa = T.findP(doc, (p) => T.paragraphText(p).startsWith("Offene Anforderungen die im Rahmen der PQ"));
      const pPqNein = T.findP(doc, (p) => T.paragraphText(p).trim() === "Im Rahmen der PQ sind keine offenen Anforderungen aufgetreten.");
      if (pPqJa && pPqNein) offeneAnforderungenSatz(pPqJa, pPqNein, proj.pq_offene_anforderungen, "Kap. 4.9 PQ: offene Anforderungen aufgetreten? (Projekt-DB: pq_offene_anforderungen)", "Kap. 4.9 PQ");
      const pPqAbschlussbericht = T.findP(doc, (p) => T.paragraphText(p).trim() === "Die Ergebnisse der Durchführung sind in PQ-Testprotokollen dokumentiert und im PQ Abschlussbericht zusammengefasst.");
      const pPqInBericht = T.findP(doc, (p) => T.paragraphText(p).startsWith("Die Ergebnisse der Durchführung sind in PQ-Testprotokollen dokumentiert und in diesem Validierungsbericht"));
      if (pPqAbschlussbericht && pPqInBericht) abschlussberichtAlternative(pPqAbschlussbericht, pPqInBericht, v2ZeilePq, proj.pq_abschlussbericht_erstellt, "Kap. 4.9 PQ: eigener PQ-Abschlussbericht erstellt? (Projekt-DB: pq_abschlussbericht_erstellt)", "Kap. 4.9 PQ");
    }

    // PPQ: erst pruefen ob ueberhaupt durchgefuehrt - wenn nein, ganzes Kapitel weg.
    if (proj.ppq_durchgefuehrt === "nein") {
      const block = T.blockBetween(doc, stylesIndex, (p) => T.paragraphStyleName(stylesIndex, p) === "Heading 2" && T.paragraphText(p).trim() === "Prozess Performance Qualifizierung (PPQ)");
      T.deleteBlock(doc, ctx, block, "Kap. 4.10: Prozess Performance Qualifizierung (PPQ) - komplett gestrichen (Projekt-DB: ppq_durchgefuehrt=nein)");
    } else if (proj.ppq_durchgefuehrt === "ja") {
      const pPpqJa = T.findP(doc, (p) => T.paragraphText(p).startsWith("Offene Anforderungen die im Rahmen der PPQ"));
      const pPpqNein = T.findP(doc, (p) => T.paragraphText(p).trim() === "Im Rahmen der PPQ sind keine offenen Anforderungen aufgetreten.");
      const pPpqAbschlussbericht = T.findP(doc, (p) => T.paragraphText(p).trim() === "Die Ergebnisse der Durchführung sind in PPQ-Testprotokollen dokumentiert und im PPQ Abschlussbericht zusammengefasst.");
      const pPpqInBericht = T.findP(doc, (p) => T.paragraphText(p).startsWith("Die Ergebnisse der Durchführung sind in PPQ-Testprotokollen dokumentiert und in diesem Validierungsbericht"));
      if (pPpqAbschlussbericht && pPpqInBericht) abschlussberichtAlternative(pPpqAbschlussbericht, pPpqInBericht, v2ZeilePpq, proj.ppq_abschlussbericht_erstellt, "Kap. 4.10 PPQ: eigener PPQ-Abschlussbericht erstellt? (Projekt-DB: ppq_abschlussbericht_erstellt)", "Kap. 4.10 PPQ");
      if (pPpqJa && pPpqNein) offeneAnforderungenSatz(pPpqJa, pPpqNein, proj.ppq_offene_anforderungen, "Kap. 4.10 PPQ: offene Anforderungen aufgetreten? (Projekt-DB: ppq_offene_anforderungen)", "Kap. 4.10 PPQ");
    } else {
      ctx.skipped.push(["Kap. 4.10 PPQ", "ppq_durchgefuehrt nicht gesetzt -> ganzes Kapitel bleibt unangetastet."]);
    }

    // ============================================================ 9b. Kap. 3 "Vorgehensweise bei der Validierung"
    {
      const pVgGeplant = T.findP(doc, (p) => {
        const txt = T.paragraphText(p).trim();
        return txt.startsWith("Die Validierungsstrategie ist im Validierungsplan") && txt.endsWith("Die Validierung wurde wie im Validierungsplan beschrieben durchgeführt.");
      });
      const pVgAngepasstIntro = T.findP(doc, (p) => T.paragraphText(p).startsWith("Die Validierungsstrategie ist im Validierungsplan") && T.paragraphText(p).includes("folgendermaßen angepasst"));
      const pVgKapTitel = T.findP(doc, (p) => T.paragraphText(p).trim() === "Kap. 2.0 Titel");
      const pVgBeschreibung = T.findP(doc, (p) => T.paragraphText(p).trim() === "Angepasste Strategie hier beschreiben");
      let pVgEllipse = null;
      if (pVgBeschreibung) {
        const paras = T.bodyParagraphs(doc);
        const idx = paras.indexOf(pVgBeschreibung);
        if (idx !== -1 && idx + 1 < paras.length && T.paragraphText(paras[idx + 1]).trim() === "...") pVgEllipse = paras[idx + 1];
      }
      const wieGeplant = proj.vorgehensweise_wie_geplant;
      if (pVgGeplant && pVgAngepasstIntro && (wieGeplant === "ja" || wieGeplant === "nein")) {
        T.entferneOderZwischen(doc, pVgGeplant, pVgAngepasstIntro);
        if (wieGeplant === "ja") {
          for (const r of T.paragraphRuns(pVgGeplant)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Kap. 3 Vorgehensweise");
          T.addTagRun(doc, pVgGeplant, tag);
          T.merkeNummer(ctx, tag, "Kap. 3 Vorgehensweise: wie im CS-VP geplant durchgeführt (Projekt-DB: vorgehensweise_wie_geplant)", "Ja");
          ctx.changes.push(["Kap. 3 Vorgehensweise: 'wie geplant'-Satz beibehalten, 'angepasst'-Block + 'Oder' entfernt", "(beide Alternativen im Template)", `[${tag}] beibehalten`]);
          for (const p of [pVgAngepasstIntro, pVgKapTitel, pVgBeschreibung, pVgEllipse]) if (p) T.markAsDeleted(doc, p);
        } else {
          for (const r of T.paragraphRuns(pVgAngepasstIntro)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          T.markAsDeleted(doc, pVgGeplant);
          if (pVgKapTitel) ctx.skipped.push(["Kap. 3 Vorgehensweise: 'Kap. 2.0 Titel'-Platzhalter", "Kein DB-Feld für einen neuen Kapiteltitel vorgesehen -> bleibt unangetastet."]);
          if (pVgBeschreibung && proj.vorgehensweise_anpassung_beschreibung) {
            const tag = T.nr(ctx, "Kap. 3 Vorgehensweise");
            const wert = proj.vorgehensweise_anpassung_beschreibung;
            const runs = T.paragraphRuns(pVgBeschreibung);
            for (let i = 1; i < runs.length; i++) T.setRunText(doc, runs[i], "");
            if (runs.length) {
              T.setRunText(doc, runs[0], `[${tag}] ${wert}`);
              T.setRunHighlight(doc, runs[0], "yellow");
              T.setRunColor(doc, runs[0], null);
            }
            T.addTagRun(doc, pVgAngepasstIntro, T.nr(ctx, "Kap. 3 Vorgehensweise"));
            T.merkeNummer(ctx, tag, "Kap. 3 Vorgehensweise: Beschreibung der Anpassung (Projekt-DB: vorgehensweise_anpassung_beschreibung)", wert);
            ctx.changes.push(["Kap. 3 Vorgehensweise: 'angepasst'-Block beibehalten, Beschreibung eingesetzt, 'wie geplant'-Satz + 'Oder' entfernt", "Angepasste Strategie hier beschreiben", `[${tag}] ${wert}`]);
          }
          if (pVgEllipse) T.markAsDeleted(doc, pVgEllipse);
        }
      } else if (pVgGeplant && pVgAngepasstIntro) {
        ctx.skipped.push(["Kap. 3 Vorgehensweise: wie geplant/angepasst?", "vorgehensweise_wie_geplant nicht in der Projekt-DB gesetzt -> beide Alternativen bleiben unangetastet."]);
      }
    }

    // ============================================================ 10. Kap. 4.12 "Änderungen während der Validierung" / Tabelle 6
    {
      const pAendJa = T.findP(doc, (p) => T.paragraphText(p).startsWith("Während der Validierung wurden die folgenden Ändrungen"));
      const pAendFormblatt = T.findP(doc, (p) => T.paragraphText(p).startsWith("Bei Änderungen an den Anforderungen"));
      const pAendFormblattListe = T.findP(doc, (p) => T.paragraphText(p).trim() === "Liste der Formblätter:");
      const pAendFormblattDesc = T.findP(doc, (p) => T.paragraphText(p).trim() === "...");
      const pAendFormblattFolge = T.findP(doc, (p) => T.paragraphText(p).startsWith("Die Änderungen haben keinen Einfluss"));
      const pAendNein = T.findP(doc, (p) => T.paragraphText(p).trim() === "Während der Validierung wurden keine Änderungen an dem System / den Anforderungen vorgenommen.");
      for (const p of [pAendFormblatt, pAendFormblattListe, pAendFormblattDesc, pAendFormblattFolge]) if (p) T.markAsDeleted(doc, p);
      if (proj.unexpected_events && proj.unexpected_events.length) {
        if (pAendJa) {
          for (const r of T.paragraphRuns(pAendJa)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Tabelle 6");
          T.addTagRun(doc, pAendJa, tag);
          T.merkeNummer(ctx, tag, "Kap. 4.12: Änderungen während der Validierung - Einleitungssatz beibehalten", `${proj.unexpected_events.length} Einträge`);
        }
        if (pAendNein) T.markAsDeleted(doc, pAendNein);
        for (const t of T.bodyTables(doc)) {
          const header = T.tableHeaderTexts(t);
          if (arrEq(header, ["Titel", "Dokumenten-Nr.", "Version"])) {
            const rows = T.tableRows(t);
            const refRow = rows[1];
            for (const ev of proj.unexpected_events) {
              const newRow = T.addTableRow(doc, t);
              const cells = T.rowCells(newRow);
              const werte = [ev.titel, ev.dokumenten_nr, ev.version || ""];
              werte.forEach((wert, ci) => {
                T.setCellValue(doc, ctx, cells[ci], wert, `Tabelle 6: Änderungen/Unexpected Events - ${ev.dokumenten_nr} (Projekt-DB: unexpected_event)`, { markBlack: true, bereich: "Tabelle 6" });
              });
            }
            const refCells = T.rowCells(refRow);
            T.markAsDeleted(doc, T.cellParagraphs(refCells[0])[0]);
            T.markAsDeleted(doc, T.cellParagraphs(refCells[1])[0]);
            ctx.skipped.push(["Tabelle 6: Beispielzeile 'Titel des CRs'", "Nur die Beispielzeile durchgestrichen, nicht real entfernt (Konvention)."]);
            break;
          }
        }
      } else {
        if (pAendJa) T.markAsDeleted(doc, pAendJa);
        if (pAendNein) {
          for (const r of T.paragraphRuns(pAendNein)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Tabelle 6");
          T.addTagRun(doc, pAendNein, tag);
          T.merkeNummer(ctx, tag, "Kap. 4.12: Änderungen während der Validierung - 'keine Änderungen' beibehalten", "keine");
        }
      }
    }

    // ============================================================ 10b. Kap. 5 Zusammenfassung: neues System vs. Folgeprojekt
    {
      const paras = T.bodyParagraphs(doc);
      const idxNeu = paras.findIndex((p) => {
        const txt = T.paragraphText(p).trim();
        return txt.startsWith("Bei eines neuen Systems") || txt.startsWith("Bei einem neuen Systems");
      });
      let idxOder5 = -1;
      if (idxNeu !== -1) {
        for (let i = idxNeu + 1; i < paras.length; i++) {
          if (T.paragraphText(paras[i]).trim() === "Oder") {
            idxOder5 = i;
            break;
          }
        }
      }
      const idxFolgeStart = paras.findIndex((p) => T.paragraphText(p).trim() === "Beschreibung für welche Zwecke das System freigegeben ist.");
      const idxFolgeEnd = paras.findIndex((p) => T.paragraphText(p).trim() === "Bei V2.0 Erweiterung der Zwecke um den Inhalt des CCs.");
      if (idxNeu !== -1 && idxOder5 !== -1 && idxFolgeStart !== -1 && idxFolgeEnd !== -1) {
        const blockNeu = paras.slice(idxNeu, idxOder5);
        const pOder5 = paras[idxOder5];
        const blockFolge = paras.slice(idxFolgeStart, idxFolgeEnd + 1);
        const istFolge = proj.ist_folgeprojekt;
        if (istFolge === "nein") {
          for (const p of blockNeu) for (const r of T.paragraphRuns(p)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Kap. 5 Zusammenfassung");
          T.addTagRun(doc, blockNeu[blockNeu.length - 1], tag);
          T.merkeNummer(ctx, tag, "Kap. 5 Zusammenfassung: neues System - Business-Continuity-Bewertung (Projekt-DB: ist_folgeprojekt=nein)", "neues System");
          ctx.changes.push(["Kap. 5 Zusammenfassung: 'neues System'-Block beibehalten, 'Folgeprojekt'-Block + 'Oder' entfernt", "(beide Alternativen im Template)", `[${tag}] beibehalten`]);
          T.markAsDeleted(doc, pOder5);
          for (const p of blockFolge) T.markAsDeleted(doc, p);
        } else if (istFolge === "ja") {
          for (const p of blockNeu) T.markAsDeleted(doc, p);
          T.markAsDeleted(doc, pOder5);
          for (const p of blockFolge) for (const r of T.paragraphRuns(p)) if (T.runText(r)) T.setRunHighlight(doc, r, "yellow");
          const tag = T.nr(ctx, "Kap. 5 Zusammenfassung");
          T.addTagRun(doc, blockFolge[blockFolge.length - 1], tag);
          T.merkeNummer(ctx, tag, "Kap. 5 Zusammenfassung: Folgeprojekt - Zweck-Erweiterung um CC-Inhalt (Projekt-DB: ist_folgeprojekt=ja)", "Folgeprojekt");
          ctx.changes.push(["Kap. 5 Zusammenfassung: 'Folgeprojekt'-Block beibehalten, 'neues System'-Block + 'Oder' entfernt", "(beide Alternativen im Template)", `[${tag}] beibehalten`]);
        } else {
          ctx.skipped.push(["Kap. 5 Zusammenfassung: neues System vs. Folgeprojekt", "ist_folgeprojekt nicht gesetzt -> beide Blöcke bleiben unangetastet."]);
        }
      } else {
        ctx.skipped.push(["Kap. 5 Zusammenfassung: neues System vs. Folgeprojekt", "Erwartete Absätze nicht (vollständig) gefunden -> nicht automatisiert."]);
      }
    }

    // ============================================================ 11. Grauen Text (#A6A6A6) im gesamten Dokument durchstreichen/entfernen
    {
      let grauMarkiert = T.stripGrey(doc, T.bodyParagraphs(doc));
      for (const t of T.bodyTables(doc)) {
        for (const row of T.tableRows(t)) {
          for (const cell of T.rowCells(row)) {
            grauMarkiert += T.stripGrey(doc, T.cellParagraphs(cell));
          }
        }
      }
      ctx.changes.push(["Grauer Text (#A6A6A6) im gesamten Dokument entfernt", `${grauMarkiert} Absätze/Zellen betroffen`, "[entfernt (gemischte Absätze: durchgestrichen)]"]);
    }

    // ============================================================ Fertig: serialisieren + zurueckschreiben
    const serialized = T.serializeXmlWithProlog(doc, prolog);
    zip.file("word/document.xml", serialized);
    const out = await zip.generateAsync({ type: "uint8array" });
    // Debug-Info (Zuordnungstabelle-Rohdaten) am Ergebnis anhaengen, falls der
    // Aufrufer sie einsehen will - aendert NICHTS an der Rueckgabe selbst
    // (Uint8Array), siehe Aufgabenstellung.
    out.docxFillDebug = ctx;
    return out;
  }

  global.DocxFillVB = { fill, berechneKiReifegrad, KI_REIFEGRAD_MATRIX };
})(typeof window !== "undefined" ? window : globalThis);
