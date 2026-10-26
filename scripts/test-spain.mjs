// Runs the official Spanish sources named in SOURCES (all by default) and prints what each returned.
import { execSync } from "node:child_process";
execSync("npm install --no-audit --no-fund --silent", { stdio: "inherit" });
const { SPAIN_SOURCES } = await import("../site/api/_spain.js");
const want = (process.env.SOURCES || "clm112,clmplanes,cyl112,canarias").split(",").filter(Boolean);
for (const [k, fn] of Object.entries(SPAIN_SOURCES)) {
  if (want.length && !want.includes(k)) continue;
  const t = Date.now();
  try {
    const ev = await fn();
    console.log(`\n== ${k}: ${ev.length} events in ${Date.now() - t} ms`);
    for (const e of ev.slice(0, 5)) console.log(JSON.stringify(e).slice(0, 420));
  } catch (e) { console.log(`\n== ${k}: ERROR ${e.stack}`); }
}
