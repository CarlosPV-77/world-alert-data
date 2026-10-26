// One-off probe: shows where regional emergency home pages talk about active alerts or plans.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const PAGES = {
  "Valenciana 112": "https://www.112cv.gva.es/es/",
  "Valenciana emergencias": "https://emergencias.gva.es/es/",
  "Castilla y León 112": "https://112.jcyl.es/web/es/emergencias-castilla-leon.html",
  "Baleares 112": "https://www.caib.es/sites/112/es/portada-8673/",
  "Murcia 112": "https://www.112rmurcia.es/",
  "Asturias 112": "https://www.112asturias.es/",
  "Madrid ASEM112": "https://www.comunidad.madrid/seguridad-emergencias-asem-112",
};
const RE = /preemergencia|prealerta|alerta|situaci[oó]n operativa|nivel \d|plan .{0,30}activ|emergencias? (en curso|activas)/gi;
for (const [k, u] of Object.entries(PAGES)) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    const b = (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
    const plain = b.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    console.log(`\n===== ${k} ${r.status} ${plain.length} chars`);
    const hits = [...plain.matchAll(RE)].slice(0, 6).map((m) => "  …" + plain.slice(Math.max(0, m.index - 120), m.index + 160) + "…");
    console.log(hits.join("\n") || "  (no alert words)");
    const links = [...new Set([...b.matchAll(/href=["']([^"']*(?:alert|aviso|emergenc|incident|rss|feed|json|plan)[^"']*)["']/gi)].map((m) => m[1]))].slice(0, 20);
    console.log("  links:", links.join(" | "));
  } catch (e) { console.log(`\n===== ${k} ERROR ${e.message}`); }
}
