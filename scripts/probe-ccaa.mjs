// One-off probe: looks for RSS feeds of the regional emergency services not yet on the map.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const SITES = {
  "Castilla-La Mancha": ["https://112.castillalamancha.es/", "https://112.castillalamancha.es/comunicacion"],
  "Murcia": ["https://www.112rmurcia.es/"],
  "Asturias": ["https://www.112asturias.es/", "https://www.asturias.es/web/112asturias"],
  "Cantabria": ["https://www.112cantabria.es/"],
  "Extremadura": ["https://www.112extremadura.com/", "https://www.juntaex.es/web/112"],
  "Aragón": ["https://www.aragon.es/-/112-aragon", "https://www.aragon.es/organismos/departamento-de-hacienda-interior-y-administracion-publica/direccion-general-de-interior-y-emergencias"],
  "Baleares": ["https://www.caib.es/sites/emergencies/es/", "https://www.emergencias.caib.es/", "https://www.caib.es/sites/112/es/"],
  "Valenciana": ["https://www.112cv.gva.es/", "https://emergencias.gva.es/", "https://www.gva.es/es/inicio/area_de_prensa"],
  "La Rioja": ["https://www.larioja.org/emergencias/es", "https://www.larioja.org/larioja-client/cm/noticias"],
  "Navarra": ["https://www.navarra.es/es/emergencias", "https://www.navarra.es/es/noticias"],
  "Madrid (Comunidad)": ["https://www.comunidad.madrid/servicios/seguridad-emergencias-asem-112", "https://www.comunidad.madrid/noticias"],
  "Andalucía": ["https://www.juntadeandalucia.es/organismos/presidenciasanidadyemergencias.html", "https://www.juntadeandalucia.es/presidencia/portavoz/"],
  "Castilla y León": ["https://112.jcyl.es/", "https://comunicacion.jcyl.es/web/es/sala-prensa.html", "https://www.jcyl.es/web/es/emergencias.html"],
  "Ceuta": ["https://www.ceuta.es/ceuta/"],
  "Melilla": ["https://www.melilla.es/"],
};
const SUFFIX = ["rss.xml", "feed/", "rss", "?format=feed&type=rss"];
async function get(u) {
  const r = await fetch(u, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
  return { status: r.status, url: r.url, body: await r.text() };
}
const isFeed = (x) => /<rss|<feed|<rdf:RDF/i.test(x.body.slice(0, 2000));
function items(b) {
  return [...b.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].slice(0, 4).map((m) => {
    const t = (m[0].match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const d = (m[0].match(/<(pubDate|updated|dc:date)>([^<]+)</i)?.[2] || "").trim();
    return `   - ${d} | ${t.slice(0, 120)}`;
  }).join("\n");
}
for (const [ca, urls] of Object.entries(SITES)) {
  console.log(`\n######## ${ca}`);
  for (const u of urls) {
    let p;
    try { p = await get(u); } catch (e) { console.log(`${u} ERROR ${e.message}`); continue; }
    console.log(`${u} -> ${p.status} ${p.url} ${p.body.length}B`);
    const links = new Set([...p.body.matchAll(/href=["']([^"']*(?:rss|feed|atom)[^"']*)["']/gi)]
      .map((m) => { try { return new URL(m[1].replace(/&amp;/g, "&"), p.url).href; } catch { return null; } }).filter(Boolean));
    for (const s of SUFFIX) links.add(new URL(s, p.url.endsWith("/") ? p.url : p.url + "/").href);
    for (const l of [...links].slice(0, 14)) {
      if (/twitter|facebook|x\.com|instagram|youtube|linkedin|\.css|\.js/i.test(l)) continue;
      try { const f = await get(l); if (f.status === 200 && isFeed(f)) console.log(` FEED ${l}\n${items(f.body)}`); } catch {}
    }
  }
}
