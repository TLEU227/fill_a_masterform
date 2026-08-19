#!/usr/bin/env node
/* Baut aus app_template.html + app.js + Schema/Seed-SQL + sql.js (Engine+WASM)
 * eine einzige, eigenstaendige app.html - keine externen Dateien nötig,
 * funktioniert auch per Doppelklick (file://) ohne CORS-Probleme, weil
 * die WASM-Datei nicht per fetch/XHR nachgeladen, sondern als Base64
 * direkt mitgeliefert wird.
 *
 * Die App verwaltet ZWEI unabhaengige Datenbanken (System-DB + Projekt-DB,
 * siehe KONZEPT.md Abschnitt 2.1) mit demselben generischen schema.sql, aber
 * unterschiedlicher Start-Feldliste. Optional koennen fertige .sqlite-
 * Dateien als Startdatenbanken eingebettet werden, dann entfaellt der
 * Anlegen/Öffnen-Dialog fuer die jeweilige DB beim Start.
 *
 * Nutzung:
 *   node build.js
 *     -> app.html, beide DBs leer (Schema+Seed, keine Daten)
 *   node build.js --system=pfad/system.sqlite --projekt=pfad/projekt.sqlite --out=ausgabe.html
 *     -> mit eingebetteten Startdatenbanken (jeweils optional weglassbar)
 *
 * WICHTIG: eine mit echten Daten befuellte Ausgabedatei NICHT ins Git-Repo
 * aufnehmen (siehe KONZEPT.md - Code ins Repo, echte Daten bleiben lokal).
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DB_DIR = path.join(ROOT, "..", "db");

function parseArgs(argv) {
  const out = { system: null, projekt: null, out: "app.html" };
  for (const arg of argv) {
    const m = arg.match(/^--(system|projekt|out)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));

const template = fs.readFileSync(path.join(ROOT, "app_template.html"), "utf8");
const appJs = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const schemaSql = fs.readFileSync(path.join(DB_DIR, "schema.sql"), "utf8");
const seedSql = fs.readFileSync(path.join(DB_DIR, "seed_field_definitions.sql"), "utf8");
const projektSeedSql = fs.readFileSync(path.join(DB_DIR, "seed_field_definitions_projekt.sql"), "utf8");
const sqljsLib = fs.readFileSync(path.join(ROOT, "vendor", "sqljs", "sql-wasm.js"), "utf8");
const wasmB64 = fs.readFileSync(path.join(ROOT, "vendor", "sqljs", "sql-wasm.wasm")).toString("base64");
const starterSystemDbB64 = args.system ? fs.readFileSync(args.system).toString("base64") : "";
const starterProjektDbB64 = args.projekt ? fs.readFileSync(args.projekt).toString("base64") : "";

let out = template;
out = out.replace(
  'const SCHEMA_SQL = /*__SCHEMA_SQL__*/"";',
  `const SCHEMA_SQL = ${JSON.stringify(schemaSql)};`
);
out = out.replace(
  'const SEED_SQL = /*__SEED_SQL__*/"";',
  `const SEED_SQL = ${JSON.stringify(seedSql)};`
);
out = out.replace(
  'const PROJEKT_SEED_SQL = /*__PROJEKT_SEED_SQL__*/"";',
  `const PROJEKT_SEED_SQL = ${JSON.stringify(projektSeedSql)};`
);
out = out.replace(
  'const WASM_B64 = /*__WASM_B64__*/"";',
  `const WASM_B64 = ${JSON.stringify(wasmB64)};`
);
out = out.replace(
  'const STARTER_DB_B64 = /*__STARTER_DB_B64__*/"";',
  `const STARTER_DB_B64 = ${JSON.stringify(starterSystemDbB64)};`
);
out = out.replace(
  'const STARTER_PROJEKT_DB_B64 = /*__STARTER_PROJEKT_DB_B64__*/"";',
  `const STARTER_PROJEKT_DB_B64 = ${JSON.stringify(starterProjektDbB64)};`
);
out = out.replace("/*__SQLJS_LIB__*/", sqljsLib);
out = out.replace('<script src="app.js"></script>', `<script>\n${appJs}\n</script>`);

const outPath = path.resolve(ROOT, args.out); // resolve statt join: erlaubt auch absolute Ausgabepfade
fs.writeFileSync(outPath, out);
console.log(
  "Gebaut:", outPath, "(", (out.length / 1024 / 1024).toFixed(2), "MB )",
  args.system ? "- System-DB mit Daten" : "- System-DB leer",
  args.projekt ? "- Projekt-DB mit Daten" : "- Projekt-DB leer"
);
