// One-off probe: prints a sample of each Spanish official source so the parsers match their real shape.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
async function show(label, url, fn) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
    const t = await r.text();
    console.log(`\n===== ${label} ${r.status} ${t.length}B ${r.headers.get("content-type")}`);
    console.log(fn ? fn(t) : t.slice(0, 3000));
  } catch (e) { console.log(`\n===== ${label} ERROR ${e.message}`); }
}
const d = new Date(), Y = d.getUTCFullYear(), M = String(d.getUTCMonth() + 1).padStart(2, "0"), D = String(d.getUTCDate()).padStart(2, "0");
await show("IGN", "https://www.ign.es/ign/RssTools/sismologia.xml", (t) => t.slice(0, 2500));
await show("DGT", "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v37.xml", (t) => {
  const i = t.indexOf("<sit:situation ");
  const recs = t.match(/<sit:situationRecord [^>]*>/g) || [];
  const types = {}; for (const r of recs) { const m = r.match(/xsi:type="([^"]+)"/); types[m?.[1]] = (types[m?.[1]] || 0) + 1; }
  const sev = {}; for (const m of t.matchAll(/<sit:severity>([^<]+)</g)) sev[m[1]] = (sev[m[1]] || 0) + 1;
  const causes = {}; for (const m of t.matchAll(/<sit:causeType>([^<]+)</g)) causes[m[1]] = (causes[m[1]] || 0) + 1;
  const acc = t.indexOf('xsi:type="sit:Accident"');
  const clo = t.search(/roadOrCarriagewayOrLaneManagementType>roadClosed/);
  return `records ${recs.length}\ntypes ${JSON.stringify(types)}\nseverity ${JSON.stringify(sev)}\ncauses ${JSON.stringify(causes)}\n--- first situation:\n${t.slice(i, i + 5000)}\n--- accident:\n${acc > 0 ? t.slice(acc - 600, acc + 3500) : "none"}\n--- closure:\n${clo > 0 ? t.slice(clo - 3000, clo + 400) : "none"}`;
});
await show("CAT plans meta", "https://analisi.transparenciacatalunya.cat/api/views/wj9c-j6vf.json", (t) => { const j = JSON.parse(t); return JSON.stringify({ name: j.name, desc: j.description, cols: j.columns?.map((c) => [c.fieldName, c.name, c.dataTypeName, c.description]) }, null, 1).slice(0, 4000); });
await show("CAT history search", "https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=protecci%C3%B3%20civil%20plans&limit=8", (t) => { const j = JSON.parse(t); return j.results?.map((r) => `${r.resource.id} | ${r.resource.name} | ${r.resource.updatedAt}`).join("\n"); });
await show("CANARIAS cat feed", "https://www3.gobiernodecanarias.org/noticias/category/consejerias/politica-territorial-cohesion-territorial-y-aguas/alertas-politica-territorial-cohesion-territorial-y-aguas/feed/", (t) => t.slice(0, 4000));
await show("EUSKADI byDate", `https://api.euskadi.eus/traffic/v1.0/incidences/byDate/${Y}/${M}/${D}`, (t) => t.slice(0, 2500));
await show("MADRID", "https://informo.madrid.es/informo/tmadrid/incid_aytomadrid.xml", (t) => { const n = (t.match(/<Incidencia>/g) || []).length; const tipos = {}; for (const m of t.matchAll(/<nom_tipo_incidencia>([^<]+)</g)) tipos[m[1]] = (tipos[m[1]] || 0) + 1; return `n ${n}\n${JSON.stringify(tipos)}\n${t.slice(0, 2500)}`; });
