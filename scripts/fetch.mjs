// Fetches the requested sources and writes data/<source>.json for the World Alert map.
import { mkdirSync, writeFileSync } from "node:fs";
import { collect } from "../site/api/_sources.js";

const wanted = (process.env.SOURCES || "all").trim() || "all";
const feed = await collect({ src: wanted });
mkdirSync("data", { recursive: true });
for (const [src, st] of Object.entries(feed.status)) {
  const events = feed.events.filter((e) => e.id && sourceOf(e) === src).map((e) => (e.desc ? { ...e, desc: e.desc.slice(0, 400) } : e));
  writeFileSync(`data/${src}.json`, JSON.stringify({ generated: feed.generated, status: { [src]: st }, events }));
  console.log(src, st.ok ? `${events.length} events` : `ERROR ${st.error}`);
}

function sourceOf(e) {
  const p = e.id.split(":")[0];
  if (p === "gdelt") return e.cat === "atentado" ? "atentados" : "conflictos";
  return { usgs: "usgs", gdacs: "gdacs", tsunami: "tsunami", nhc: "nhc", nga: "navarea", gvp: "volcanes", nws: "nws", aemet: "aemet" }[p];
}
