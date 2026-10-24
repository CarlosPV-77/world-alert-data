// When GDELT fails, the fresh file holds no events. Keep the news of the last good run instead, marked with
// the error and the time they came in, so the map keeps showing them and says why they are not fresh.
import { readFileSync, writeFileSync } from "node:fs";

const MIRROR = "https://raw.githubusercontent.com/CarlosPV-77/world-alert-data/live/";
for (const src of process.argv.slice(2)) {
  const file = `data/${src}.json`, d = JSON.parse(readFileSync(file, "utf8"));
  const st = d.status?.[src];
  if (st?.ok !== false || d.events?.length) continue;
  const prev = await fetch(MIRROR + `${src}.json`, { signal: AbortSignal.timeout(20000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!prev?.events?.length) { console.log(src, "failed and there is no earlier copy to keep"); continue; }
  const lastGood = prev.status?.[src]?.lastGood || prev.generated;
  writeFileSync(file, JSON.stringify({ generated: d.generated, status: { [src]: { ok: false, error: st.error, lastGood } }, events: prev.events }));
  console.log(src, `failed; kept ${prev.events.length} events from ${lastGood}`);
}
