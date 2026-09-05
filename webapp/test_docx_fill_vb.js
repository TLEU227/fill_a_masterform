/* Eigenstaendiges Verifikationsskript (NICHT Teil der npm-Test-Suite):
 * laedt test_docx_fill_vb.html im Browser (Chromium via Playwright), ruft
 * window.DocxFillVB.fill() mit GENAU DEN GLEICHEN Demo-Daten wie
 * fill_vb_demo8.py (SYS/PROJ) auf die echte CS-VB-Vorlage auf und speichert
 * das Ergebnis als .docx zur weiteren Pruefung mit python-docx.
 *
 * Aufruf: node test_docx_fill_vb.js
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const TEMPLATE_PATH = "/root/.claude/uploads/4bad0ed6-f59f-58ad-8101-0f3d1b25ac47/81561f39-FFICFQUMT0003543MDT__CSVB_Validierungsbericht_1.docx";
const OUT_PATH = "/tmp/claude-0/-home-user-fill-a-masterform/4bad0ed6-f59f-58ad-8101-0f3d1b25ac47/scratchpad/vb_analyse/CS-VB_JS_PORT_ERGEBNIS.docx";
const TEST_HTML = path.join(__dirname, "test_docx_fill_vb.html");

// ============================================================ Demo-Daten (1:1 identisch zu SYS/PROJ in fill_vb_demo8.py)
const SYS = {
  gebaeude: "G680", bereich: "MIB Produktion 2",
  systemname: "SPS Zentrifugentrockner PU4300A", mlcs_id: "1428",
  sw_name: "Simatic", sw_version: "V3.0.2",
  hersteller: "Fima", lieferantennummer: "OOZ000000062125",
  ki_vorhanden: "ja",
  ki_autonomie_stufe: "3",
  ki_steuerungsdesign_stufe: "4",
};

const PROJ = {
  ist_folgeprojekt: "ja",
  vorgaenger_dok_id: "QU-OPE-0000421", vorgaenger_version: "2.0",
  folgeversion: "3.0",
  vp_dok_id: "QU-OPE-0000999", vp_version: "3.0",
  systembewertung_dok_id: "QU-OPE-0000987", systembewertung_version: "2.0",
  fs_dok_id: "QU-OPE-0000655", fs_version: "2.0",
  ra_dok_id: "QU-OPE-0000888", ra_version: "1.0",
  testplan_dok_id: "QU-OPE-0000777", testplan_version: "1.0",
  change_control_nummer: "CC-2024-005123",
  history: [
    { version: "2.0", cc_nummer: "CC-2023-004500", beschreibung: "Anpassung der Rezeptverwaltung." },
    { version: "3.0", cc_nummer: "CC-2024-005123", beschreibung: "Retrofit PU4300A." },
  ],
  dq_offene_anforderungen: "nein",
  iq_offene_anforderungen: "ja",
  oq_offene_anforderungen: "nein",
  pq_offene_anforderungen: "nein",
  ppq_durchgefuehrt: "nein",
  vorgehensweise_wie_geplant: "nein",
  vorgehensweise_anpassung_beschreibung: "Die Testtiefe für die Rezeptparameter wurde von Mittel auf Hoch angehoben, nachdem sich im Rahmen der DQ zusätzliche kritische Parameter ergeben haben.",
  systembeschreibung_geaendert: "ja",
  systembeschreibung_aenderung_beschreibung: "Die Rezeptverwaltung wurde um eine zusätzliche Schnittstelle zur Prozessleitebene (TCP/IP) erweitert.",
  verantwortlichkeiten_geaendert: "nein",
  lieferanten_verantwortlichkeiten_geaendert: "nein",
  lieferantenbewertung_neu_durchgefuehrt: "nein",
  testprozess_angepasst: "nein",
  iq_offene_anforderungen_unkritisch: "ja",
  iq_offene_anforderungen_beschreibung: "Kosmetische Abweichung in der Log-Ausgabe (Zeitstempel-Format), ohne Einfluss auf die Datenintegrität.",
  oq_abschlussbericht_erstellt: "ja",
  pq_abschlussbericht_erstellt: "nein",
  ppq_abschlussbericht_erstellt: null,
  hds_erstellt: "nein",
  sds_erstellt: "ja", sds_dok_id: "QU-OPE-0004900", sds_version: "1.0",
  urs_tm_erstellt: "ja", urs_tm_dok_id: "QU-OPE-0004901", urs_tm_version: "1.0",
  dq_abschlussbericht_erstellt: "nein",
  iq_testvorschriften_erstellt: "ja", iq_testvorschriften_dok_id: "QU-OPE-0004902", iq_testvorschriften_version: "1.0",
  iq_abschlussbericht_erstellt: "ja", iq_abschlussbericht_dok_id: "QU-OPE-0004903", iq_abschlussbericht_version: "1.0",
  oq_testvorschriften_erstellt: "ja", oq_testvorschriften_dok_id: "QU-OPE-0004904", oq_testvorschriften_version: "1.0",
  oq_abschlussbericht_dok_id: "QU-OPE-0004905", oq_abschlussbericht_version: "1.0",
  pq_testplan_erstellt: "ja", pq_testplan_dok_id: "QU-OPE-0004906", pq_testplan_version: "1.0",
  afu_erstellt: "ja", afu_dok_id: "QU-OPE-0004907", afu_version: "1.0",
  wvd_datenflussdiagramm_erforderlich: "ja", wvd_datenflussdiagramm_dok_id: "QU-OPE-0004910",
  wvd_audit_trail_review_konzept_erforderlich: "ja", wvd_audit_trail_review_konzept_dok_id: "QU-OPE-0004911",
  wvd_berechtigungskonzept_erforderlich: "ja", wvd_berechtigungskonzept_dok_id: "QU-OPE-0004912",
  wvd_trainingsplan_erforderlich: "ja", wvd_trainingsplan_dok_id: "QU-OPE-0004913",
  wvd_ppq_begruendung: "PPQ für dieses Projekt nicht durchgeführt (siehe Kap. 4.10).",
  wvd_user_process_monitoring_erforderlich: "nein", wvd_user_process_monitoring_begruendung: "Im Rahmen der Risikobewertung wurde kein erhöhtes Datenintegritätsrisiko identifiziert, das ein gesondertes User Process Monitoring erfordert; der Standard-Audit-Trail ist ausreichend.",
  wvd_datenmigration_erforderlich: "nein", wvd_datenmigration_begruendung: "Im Rahmen dieses Change Controls werden keine Bestandsdaten aus einem Vorgängersystem übernommen; eine Datenmigration ist daher nicht erforderlich.",
  wvd_wartung_monitoring_erforderlich: "ja", wvd_wartung_monitoring_dok_id: "QU-OPE-0004914",
  wvd_archivierung_daten_erforderlich: "ja", wvd_archivierung_daten_dok_id: "QU-OPE-0004915",
  wvd_backup_restore_konzept_erforderlich: "nein", wvd_backup_restore_konzept_begruendung: "Die Datensicherung erfolgt vollständig über die zentrale IT-Infrastruktur gemäß den geltenden IT-Sicherheits-SOPs; ein systemspezifisches Konzept ist nicht erforderlich.",
  wvd_business_continuity_plan_erforderlich: "nein", wvd_business_continuity_plan_begruendung: "Das System ist gemäß Risikobewertung nicht als geschäftskritisch eingestuft; ein Business Continuity Plan ist daher nicht erforderlich.",
  wvd_incident_stoerungsmanagement_erforderlich: "ja", wvd_incident_stoerungsmanagement_dok_id: "QU-OPE-0004918",
  wvd_aenderungs_konfigurationsmanagement_erforderlich: "ja", wvd_aenderungs_konfigurationsmanagement_dok_id: "QU-OPE-0004919",
  wvd_logbuch_system_erforderlich: "ja", wvd_logbuch_system_dok_id: "QU-OPE-0004920",
  wvd_lieferantenbewertung_nachweis_erforderlich: "ja", wvd_lieferantenbewertung_nachweis_dok_id: "QU-OPE-0004921",
  wvd_quality_agreement_erforderlich: "nein", wvd_quality_agreement_begruendung: "Mit dem/der Lieferanten besteht bereits ein gültiges Quality Agreement, das diesen Systemumfang abdeckt und durch dieses Change Control unverändert gültig bleibt.",
  wvd_bedienungsanweisungen_erforderlich: "ja", wvd_bedienungsanweisungen_dok_id: "QU-OPE-0004922", wvd_bedienungsanweisungen_titel: "Bedienungsanweisung SPS Zentrifugentrockner PU4300A",
  wvd_bedienungshandbuch_erforderlich: "nein", wvd_bedienungshandbuch_begruendung: "Die Bedienung des Systems ändert sich gegenüber der Vorversion nicht; das bestehende Handbuch bleibt unverändert gültig.",
  unexpected_events: [
    { dokumenten_nr: "QU-OPE-0004821", titel: "Anpassung Rezeptparameter Trocknungszeit", version: "1.0" },
    { dokumenten_nr: "QU-OPE-0004822", titel: "Austausch fehlerhafter Temperatursensor", version: "1.0" },
  ],
};

async function main() {
  const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
  const templateBase64 = templateBuffer.toString("base64");

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    headless: true,
  });
  const page = await browser.newPage();
  page.on("console", (msg) => { if (msg.type() === "error") console.log("[console.error]", msg.text()); });
  page.on("pageerror", (err) => console.log("[pageerror]", err.message));

  await page.goto("file://" + TEST_HTML);

  const result = await page.evaluate(
    async ({ templateBase64, sys, proj }) => window.__runFill(templateBase64, sys, proj),
    { templateBase64, sys: SYS, proj: PROJ },
  );

  await browser.close();

  const outBuffer = Buffer.from(result.base64, "base64");
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, outBuffer);

  console.log("Fertig:", OUT_PATH, `(${outBuffer.length} Bytes)`);
  console.log("changes:", result.changesCount, "skipped:", result.skippedCount);
  console.log("Nummerierung (erste 10):");
  for (const [tag, label, wert] of result.numbering.slice(0, 10)) {
    console.log(` [${tag}] ${label} -> ${wert}`);
  }
}

main().catch((err) => {
  console.error("FEHLER:", err);
  process.exit(1);
});
