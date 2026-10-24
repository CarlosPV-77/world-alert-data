// World Alert sources: official hazard feeds and geolocated news, normalized to one event shape.
import { XMLParser } from "fast-xml-parser";

const UA = "WorldAlert/1.0 (personal hazard map)";
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", removeNSPrefix: false });

const BROWSER_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function get(url, type = "json") {
  const r = await fetch(url, { headers: { "User-Agent": url.includes("volcano.si.edu") ? BROWSER_UA : UA, Accept: type === "json" ? "application/json, application/geo+json" : "application/xml, text/xml, */*" }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return type === "json" ? r.json() : xml.parse(await r.text());
}

const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const txt = (x) => (x == null ? "" : typeof x === "object" ? String(x["#text"] ?? "") : String(x));
const num = (x) => { const n = parseFloat(x); return Number.isFinite(n) ? n : null; };
const iso = (x) => { const d = new Date(x); return isNaN(d) ? null : d.toISOString(); };
const clip = (s, n = 400) => { s = String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

function ngaDate(s) { const m = String(s || "").match(/(\d{2})(\d{2})(\d{2})Z (\w{3}) (\d{4})/); return m ? iso(`${m[1]} ${m[4]} ${m[5]} ${m[2]}:${m[3]}:00 UTC`) : null; }

// GDELT GEO 2.0: news articles of the last 24 h geolocated by GDELT, grouped by place.
// One article is unverified; several articles from different outlets count as confirmed.
async function gdelt(cat, query) {
  const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&mode=PointData&format=GeoJSON&timespan=24h&maxpoints=500`;
  const d = await get(url);
  const day = new Date().toISOString().slice(0, 10);
  return arr(d.features).map((f) => {
    const p = f.properties || {}, [lon, lat] = f.geometry?.coordinates || [];
    const links = [...String(p.html || "").matchAll(/<a href="([^"]+)"[^>]*title="([^"]*)"/g)].map((m) => ({ url: m[1], title: m[2].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'") }));
    const domains = [...new Set(links.map((l) => { try { return new URL(l.url).hostname.replace(/^www\./, ""); } catch { return ""; } }).filter(Boolean))];
    const n = num(p.count) || links.length || 1;
    const top = links[0];
    return {
      id: `gdelt:${cat}:${day}:${p.name}`, cat, title: `${p.name}: ${clip(top?.title || "noticias", 120)}`,
      desc: links.slice(0, 5).map((l) => "• " + clip(l.title, 110)).join(" "), lat, lon,
      time: new Date().toISOString(), sev: n >= 30 ? 4 : n >= 10 ? 3 : n >= 3 ? 2 : 1, articles: n, outlets: domains.slice(0, 6),
      url: top?.url, src: "GDELT (prensa)", verified: domains.length >= 2, vlabel: domains.length >= 2 ? `${domains.length} medios` : "1 medio",
    };
  }).filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon));
}

function quakeSev(m) { return m >= 7 ? 4 : m >= 6 ? 3 : m >= 4.5 ? 2 : 1; }

const SOURCES = {
  async usgs(q) {
    const range = q.range === "week" ? "4.5_week" : "2.5_day";
    const d = await get(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${range}.geojson`);
    return d.features.map((f) => {
      const p = f.properties, [lon, lat, depth] = f.geometry.coordinates;
      return { id: "usgs:" + f.id, cat: "sismo", title: `M${p.mag?.toFixed(1)} · ${p.place || "Sin ubicación"}`, lat, lon, time: new Date(p.time).toISOString(), updated: new Date(p.updated).toISOString(), sev: Math.max(quakeSev(p.mag || 0), { yellow: 2, orange: 3, red: 4 }[p.alert] || 0), mag: p.mag, depth, tsunami: !!p.tsunami, url: p.url, src: "USGS" };
    });
  },

  async gdacs() {
    const d = await get("https://www.gdacs.org/xml/rss.xml", "xml");
    const cats = { EQ: "sismo", TC: "ciclon", FL: "inundacion", VO: "volcan", DR: "sequia", WF: "incendio", TS: "tsunami" };
    return arr(d?.rss?.channel?.item).map((it) => {
      let lat = num(it["geo:Point"]?.["geo:lat"]), lon = num(it["geo:Point"]?.["geo:long"]);
      if (lat == null && it["georss:point"]) [lat, lon] = txt(it["georss:point"]).trim().split(/\s+/).map(Number);
      const type = txt(it["gdacs:eventtype"]), lvl = txt(it["gdacs:alertlevel"]);
      return { id: `gdacs:${type}${txt(it["gdacs:eventid"])}`, cat: cats[type] || "otro", title: clip(txt(it.title), 160), desc: clip(it.description), lat, lon, time: iso(txt(it["gdacs:fromdate"]) || txt(it.pubDate)), updated: iso(txt(it.pubDate)), until: iso(txt(it["gdacs:todate"])), sev: { Green: 1, Orange: 3, Red: 4 }[lvl] || 1, level: lvl, country: txt(it["gdacs:country"]), current: txt(it["gdacs:iscurrent"]) === "true", url: txt(it.link), src: "GDACS" };
    }).filter((e) => e.lat != null && e.lon != null);
  },

  async tsunami() {
    const out = [];
    for (const [feed, center] of [["PAAQAtom", "NTWC"], ["PHEBAtom", "PTWC"]]) {
      const d = await get(`https://www.tsunami.gov/events/xml/${feed}.xml`, "xml");
      for (const e of arr(d?.feed?.entry)) {
        const lat = num(txt(e["geo:lat"])), lon = num(txt(e["geo:long"]));
        if (lat == null || lon == null) continue;
        const body = clip(txt(e.summary) || txt(e.content), 600);
        const m = body.match(/Category:\s*(Warning|Advisory|Watch|Threat|Information)/i);
        const cat = (m?.[1] || "Information").toLowerCase();
        const link = arr(e.link).map((l) => l?.["@href"]).find(Boolean);
        out.push({ id: `tsunami:${txt(e.id)}`, cat: "tsunami", title: clip(txt(e.title), 160), desc: body, lat, lon, time: iso(txt(e.updated)), updated: iso(txt(e.updated)), sev: { warning: 4, threat: 4, advisory: 3, watch: 2, information: 1 }[cat], level: cat, url: link || "https://www.tsunami.gov", src: center });
      }
    }
    return out;
  },

  async nhc() {
    const d = await get("https://www.nhc.noaa.gov/CurrentStorms.json");
    const names = { HU: "Huracán", TS: "Tormenta tropical", TD: "Depresión tropical", STS: "Tormenta subtropical", SD: "Depresión subtropical", PTC: "Ciclón potencial", PC: "Ciclón postropical" };
    return arr(d.activeStorms).map((s) => {
      const kt = num(s.intensity) || 0;
      return { id: `nhc:${s.id}`, cat: "ciclon", title: `${names[s.classification] || s.classification} ${s.name}`, desc: `Viento ${kt} kt (${Math.round(kt * 1.852)} km/h), presión ${s.pressure} mb, rumbo ${s.movementDir}° a ${s.movementSpeed} kt.`, lat: num(s.latitudeNumeric), lon: num(s.longitudeNumeric), time: iso(s.lastUpdate), updated: iso(s.lastUpdate), sev: kt >= 96 ? 4 : kt >= 64 ? 3 : kt >= 34 ? 2 : 1, wind: kt, url: s.publicAdvisory?.url || "https://www.nhc.noaa.gov", src: "NOAA NHC" };
    });
  },

  async navarea() {
    const d = await get("https://msi.nga.mil/api/publications/broadcast-warn?output=json&status=A");
    const re = /(\d{1,2})-(\d{1,2}(?:\.\d+)?)\s*([NS])\s+(\d{1,3})-(\d{1,2}(?:\.\d+)?)\s*([EW])/;
    return arr(d["broadcast-warn"]).map((w) => {
      const m = String(w.text || "").match(re);
      if (!m) return null;
      const lat = (+m[1] + +m[2] / 60) * (m[3] === "S" ? -1 : 1), lon = (+m[4] + +m[5] / 60) * (m[6] === "W" ? -1 : 1);
      const area = { "4": "NAVAREA IV", "12": "NAVAREA XII", A: "HYDROLANT", P: "HYDROPAC", C: "Ártico" }[w.navArea] || `Área ${w.navArea}`;
      return { id: `nga:${w.navArea}-${w.msgYear}-${w.msgNumber}`, cat: "maritimo", title: `${area} ${w.msgNumber}/${String(w.msgYear).slice(-2)} · ${clip(String(w.text).split("\n")[0], 90)}`, desc: clip(w.text, 700), lat, lon, time: ngaDate(w.issueDate), sev: /MISSILE|ROCKET|GUNNERY|HAZARDOUS|MINE|PIRA/i.test(w.text) ? 3 : 2, url: "https://msi.nga.mil/NavWarnings", src: "NGA MSI", approx: true };
    }).filter(Boolean);
  },

  async volcanes() {
    const d = await get("https://volcano.si.edu/news/WeeklyVolcanoRSS.xml", "xml");
    return arr(d?.rss?.channel?.item).map((it) => {
      const [lat, lon] = txt(it["georss:point"]).trim().split(/\s+/).map(Number);
      const desc = clip(it.description, 600);
      return { id: `gvp:${txt(it.link) || txt(it.title)}`, cat: "volcan", title: clip(txt(it.title), 140), desc, lat, lon, time: iso(txt(it.pubDate)), sev: /New Activity|Unrest/i.test(txt(it.title) + desc) ? 3 : 2, url: txt(it.link), src: "Smithsonian GVP" };
    }).filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon));
  },

  async nws() {
    const d = await get("https://api.weather.gov/alerts/active?status=actual&severity=Extreme,Severe");
    return arr(d.features).map((f) => {
      const p = f.properties, g = f.geometry;
      if (!g) return null;
      const ring = g.type === "Polygon" ? g.coordinates[0] : g.type === "MultiPolygon" ? g.coordinates[0][0] : null;
      if (!ring) return null;
      const lon = ring.reduce((a, c) => a + c[0], 0) / ring.length, lat = ring.reduce((a, c) => a + c[1], 0) / ring.length;
      return { id: `nws:${p.id}`, cat: "meteo", title: `${p.event} · ${clip(p.areaDesc, 80)}`, desc: clip(p.headline || p.description, 500), lat, lon, time: iso(p.sent), until: iso(p.expires), sev: p.severity === "Extreme" ? 4 : 3, url: "https://alerts.weather.gov", src: "NOAA NWS" };
    }).filter(Boolean);
  },

  async conflictos() { return gdelt("conflicto", "theme:ARMEDCONFLICT"); },
  async atentados() { return gdelt("atentado", "theme:TERROR"); },
};

export async function collect(q = {}) {
  const wanted = String(q.src || "all").split(",").flatMap((s) => (s === "all" ? Object.keys(SOURCES) : [s])).filter((s) => SOURCES[s]);
  const results = await Promise.allSettled(wanted.map((s) => SOURCES[s](q)));
  const status = {}, events = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") { status[wanted[i]] = { ok: true, n: r.value.length }; events.push(...r.value.map((e) => ({ verified: true, ...e }))); }
    else status[wanted[i]] = { ok: false, error: String(r.reason?.message || r.reason).slice(0, 200) };
  });
  return { generated: new Date().toISOString(), status, events };
}
