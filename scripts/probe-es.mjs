// One-off check run on GitHub: builds the Galician municipality table, commits it, then runs every
// Spanish official source and prints what each returned.
import { execSync } from "node:child_process";
const sh = (c) => execSync(c, { stdio: "inherit" });
sh("node scripts/gen-concellos.mjs");
sh(`git config user.name "world-alert-bot" && git config user.email "world-alert-bot@users.noreply.github.com" && git add site/api/_concellos.json && (git diff --cached --quiet || (git commit -m "Add Galician municipality positions for MeteoGalicia warnings" && git push origin HEAD:${process.env.GITHUB_REF_NAME}))`);
sh("npm install --no-audit --no-fund --silent");
const { SPAIN_SOURCES } = await import("../site/api/_spain.js");
for (const [k, fn] of Object.entries(SPAIN_SOURCES)) {
  const t = Date.now();
  try {
    const ev = await fn();
    const sev = {}; for (const e of ev) sev[e.sev] = (sev[e.sev] || 0) + 1;
    console.log(`\n== ${k}: ${ev.length} events in ${Date.now() - t} ms, sev ${JSON.stringify(sev)}`);
    for (const e of ev.slice(0, 6)) console.log(JSON.stringify(e).slice(0, 500));
  } catch (e) { console.log(`\n== ${k}: ERROR ${e.stack}`); }
}
