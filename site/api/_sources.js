// World Alert sources: official hazard feeds and geolocated news, normalized to one event shape.
import { XMLParser } from "fast-xml-parser";
import { inflateRawSync, gunzipSync } from "node:zlib";
import { social } from "./_social.js";
import { accidents } from "./_accidents.js";
import { notAlert, slugText } from "./_notalert.js";

const UA = "WorldAlert/1.0 (personal hazard map)";
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", removeNSPrefix: false });

const BROWSER_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function get(url, type = "json", ua) {
  const r = await fetch(url, { headers: { "User-Agent": ua || (url.includes("volcano.si.edu") ? BROWSER_UA : UA), Accept: type === "json" ? "application/json, application/geo+json" : "application/xml, text/xml, */*" }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  if (type === "text") return r.text();
  if (type === "buffer") return Buffer.from(await r.arrayBuffer());
  return type === "json" ? r.json() : xml.parse(await r.text());
}

const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const txt = (x) => (x == null ? "" : typeof x === "object" ? String(x["#text"] ?? "") : String(x));
const num = (x) => { const n = parseFloat(x); return Number.isFinite(n) ? n : null; };
const iso = (x) => { const d = new Date(x); return isNaN(d) ? null : d.toISOString(); };
const clip = (s, n = 400) => { s = String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

function ngaDate(s) { const m = String(s || "").match(/(\d{2})(\d{2})(\d{2})Z (\w{3}) (\d{4})/); return m ? iso(`${m[1]} ${m[4]} ${m[5]} ${m[2]}:${m[3]}:00 UTC`) : null; }

// GDELT 2.0 event files: machine-coded news events with coordinates, one file every 15 min.
// The GEO 2.0 API was retired (404), so we read the raw export.CSV.zip files instead.
// A place reported by one outlet stays unverified; several outlets count as confirmed.
const GDELT_BASE = "http://data.gdeltproject.org/gdeltv2/";

// Each export.CSV.zip holds a single deflated entry; read it without a zip library.
function unzipOne(buf) {
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error("not a zip");
  const method = buf.readUInt16LE(8), nameLen = buf.readUInt16LE(26), extraLen = buf.readUInt16LE(28);
  const body = buf.subarray(30 + nameLen + extraLen);
  return method === 0 ? body.toString("utf8") : inflateRawSync(body).toString("utf8");
}

function gdeltStamps(latest, n) {
  const m = String(latest).match(/(\d{14})\.export\.CSV\.zip/);
  if (!m) throw new Error("no export file in lastupdate.txt");
  const s = m[1], t = Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12));
  return Array.from({ length: n }, (_, i) => new Date(t - i * 15 * 60000).toISOString().replace(/[-:T]/g, "").slice(0, 14));
}

const gdeltCache = new Map(); // stamp -> promise of parsed rows, so both news sources share one download

function gdeltRows(stamp) {
  if (!gdeltCache.has(stamp)) gdeltCache.set(stamp, loadGdelt(stamp).catch((e) => { gdeltCache.delete(stamp); throw e; }));
  return gdeltCache.get(stamp);
}

// Some cloud hosts get a 404 for a file another host can read, so try the other scheme and a browser agent too.
async function gdeltZip(stamp) {
  const path = `${stamp}.export.CSV.zip`, errs = [];
  for (const [base, ua] of [[GDELT_BASE, UA], [GDELT_BASE.replace("http:", "https:"), UA], [GDELT_BASE, BROWSER_UA]]) {
    const r = await fetch(base + path, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(12000) }).catch((e) => ({ ok: false, status: e.message }));
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    errs.push(`${r.status}${base.startsWith("https") ? " https" : ""}${ua === BROWSER_UA ? " browser" : ""}`);
  }
  throw new Error(errs.join(", "));
}

async function loadGdelt(stamp) {
  return unzipOne(await gdeltZip(stamp))
    .split("\n").filter(Boolean).map((l) => l.split("\t"))
    .map((f) => ({
      root: f[28], code: f[26], articles: num(f[33]) || 1, tone: num(f[34]),
      geoType: f[f.length - 10], place: f[f.length - 9], cc: f[f.length - 8], lat: num(f[f.length - 5]), lon: num(f[f.length - 4]),
      added: f[f.length - 2], url: f[f.length - 1]?.trim(),
    }))
    .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon) && e.place);
}

const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
// GDELT gives no headline, only the article link; most links end in a slug that is the headline in lower case:
// ".../2026/10/24/gunmen-open-fire-in-karak-church-12928681" -> "Gunmen open fire in karak church". Empty when no slug reads like one.
function headlineOf(u) {
  let segs;
  try { segs = decodeURIComponent(new URL(u).pathname).split("/"); } catch { return ""; }
  const words = (seg) => seg.replace(/\.(s?html?|php|aspx?|cms)$/i, "").split(/[-_+]+/)
    .filter((w) => w && !/^\d{4,}$/.test(w) && !(/\d/.test(w) && /[a-z]/i.test(w) && w.length >= 6));
  const best = segs.map(words).sort((a, b) => b.length - a.length)[0] || [];
  if (best.length < 4) return "";
  const t = best.join(" ");
  return clip(t.charAt(0).toUpperCase() + t.slice(1), 160);
}
const gdeltTime = (s) => iso(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:00Z`);

// CAMEO codes: 18 assault (attacks, bombings), 19 fight (armed clashes), 20 mass violence.
const isAtentado = (e) => e.root === "18";

// Wording that matches what the CAMEO code actually says, so a generic code is not read as a battle.
const CAMEO_LABEL = {
  "180": "Violencia", "181": "Secuestro", "182": "Agresión", "183": "Atentado con explosivos",
  "184": "Rehenes", "185": "Asesinato selectivo", "186": "Atentado suicida",
  "190": "Actividad militar", "191": "Bloqueo", "192": "Ocupación de territorio",
  "193": "Combates con armas ligeras", "194": "Fuego de artillería o blindados", "195": "Ataque aéreo o con misiles",
  "196": "Alto el fuego roto", "200": "Violencia masiva", "201": "Represión masiva", "202": "Matanza",
  "203": "Arma de destrucción masiva",
};
const isConflicto = (e) => e.root === "19" || e.root === "20";

async function gdeltNews(cat, keep, files = 4) {
  const latest = await get(`${GDELT_BASE}lastupdate.txt`, "text");
  const stamps = gdeltStamps(latest, files);
  const rows = [], errs = [];
  let loaded = 0;
  for (const s of stamps) {
    try { rows.push(...(await gdeltRows(s))); loaded++; } catch (e) { errs.push(`${s}: ${e.message}`); }
  }
  if (!loaded) throw new Error(errs.join(" / "));
  const window = loaded * 15 >= 60 ? "la última hora" : `los últimos ${loaded * 15} min`;
  const groups = new Map();
  // Article links whose slug reads like a study, an explainer or clickbait are not incidents.
  for (const e of rows.filter((r) => keep(r) && !notAlert(slugText(r.url)))) {
    const key = `${e.place}|${e.lat.toFixed(1)}|${e.lon.toFixed(1)}`;
    const g = groups.get(key) || { approx: e.geoType === "1" || e.geoType === "2" || e.geoType === "5", place: e.place, cc: e.cc, lat: e.lat, lon: e.lon, n: 0, articles: 0, time: null, domains: new Set(), url: null, codes: new Map() };
    g.n++; g.articles += e.articles;
    g.codes.set(e.code, (g.codes.get(e.code) || 0) + e.articles);
    const t = gdeltTime(e.added);
    if (t && (!g.time || t > g.time)) g.time = t;
    const d = domainOf(e.url);
    if (d) { g.domains.add(d); if (!g.url) g.url = e.url; }
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => {
    const outlets = [...g.domains];
    const top = [...g.codes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const label = CAMEO_LABEL[top] || CAMEO_LABEL[top.slice(0, 3)] || (cat === "atentado" ? "Ataque violento" : "Actividad militar");
    return {
      id: `gdelt:${cat}:${g.place}:${g.lat.toFixed(1)},${g.lon.toFixed(1)}`, cat,
      title: `${label}: ${clip(g.place, 90)}`,
      desc: `${g.n} ${g.n === 1 ? "suceso" : "sucesos"} codificados por GDELT en ${window}, con ${g.articles} ${g.articles === 1 ? "artículo" : "artículos"} de prensa${outlets.length ? ` (${outlets.slice(0, 4).join(", ")})` : ""}.`,
      lat: g.lat, lon: g.lon, approx: g.approx || undefined, time: g.time || new Date().toISOString(),
      sev: g.articles >= 40 ? 4 : g.articles >= 15 ? 3 : g.articles >= 5 ? 2 : 1,
      articles: g.articles, outlets: outlets.slice(0, 6), url: g.url, headline: (g.url && headlineOf(g.url)) || undefined, src: "GDELT (prensa)",
      verified: outlets.length >= 2, vlabel: outlets.length >= 2 ? `${outlets.length} medios` : "1 medio",
    };
  });
}

// AEMET Meteoalerta: the public warnings page links a tar.gz of GeoJSON files, one per hour of the
// next two days (Península y Baleares, Canarias), with each warned zone as a polygon. No API key.
const AEMET_PAGE = "https://www.aemet.es/es/eltiempo/prediccion/avisos";

function untar(buf) {
  const files = [];
  for (let o = 0; o + 512 <= buf.length;) {
    const name = buf.toString("utf8", o, o + 100).replace(/\0.*$/s, "");
    if (!name) break;
    const size = parseInt(buf.toString("utf8", o + 124, o + 136).replace(/\0.*$/s, "").trim() || "0", 8);
    files.push({ name, body: buf.subarray(o + 512, o + 512 + size) });
    o += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

// Zone outlines are surveyed in detail; a ~100 m grid is plenty on the map and keeps the feed small.
function thinRing(ring) {
  const out = [];
  for (const [x, y] of ring) {
    const pt = [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000], last = out[out.length - 1];
    if (!last || Math.abs(last[0] - pt[0]) + Math.abs(last[1] - pt[1]) >= 0.004) out.push(pt);
  }
  if (out.length > 2) out.push(out[0]);
  return out.length >= 4 ? out : null;
}
function thinGeom(g) {
  if (g?.type === "Polygon") { const r = g.coordinates.map(thinRing).filter(Boolean); return r.length ? { type: "Polygon", coordinates: r } : null; }
  if (g?.type === "MultiPolygon") { const p = g.coordinates.map((poly) => poly.map(thinRing).filter(Boolean)).filter((poly) => poly.length); return p.length ? { type: "MultiPolygon", coordinates: p } : null; }
  return null;
}
function centerOf(g) {
  const pts = (g.type === "Polygon" ? [g.coordinates[0]] : g.coordinates.map((p) => p[0])).flat();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}
const AEMET_SEV = { amarillo: 2, naranja: 3, rojo: 4 };

async function aemet() {
  const page = await get(AEMET_PAGE, "text", BROWSER_UA);
  const link = page.match(/\/es\/geojson\/download\/avisos\/[^"']+\.tar\.gz/)?.[0];
  if (!link) throw new Error("la página de avisos no enlaza la descarga GeoJSON");
  const files = untar(gunzipSync(await get("https://www.aemet.es" + link, "buffer", BROWSER_UA)));
  const out = new Map();
  for (const f of files) {
    if (!f.name.endsWith(".geojson")) continue;
    let fc; try { fc = JSON.parse(f.body.toString("utf8")); } catch { continue; }
    for (const ft of fc.features || []) {
      const p = ft.properties || {};
      const geom = thinGeom(ft.geometry);
      if (!geom) continue;
      for (const code of (p.Fen_avisos || []).map((c) => String(c).trim()).filter(Boolean)) {
        const id = p[`Identf_${code}`] || `${p.COD_Z}:${code}:${p[`Onset_${code}`]}`;
        if (out.has(`aemet:${id}`)) continue;
        const color = txt(p[`Sev_${code}`]).trim(), what = txt(p[code]).trim() || code;
        const [lon, lat] = centerOf(geom);
        out.set(`aemet:${id}`, {
          id: `aemet:${id}`, cat: "aviso_es", title: `Aviso ${color.toLowerCase()} por ${what.toLowerCase()} · ${p.Nombre_zona}`,
          desc: clip(p[`Des_${code}`] || p[`Resum_${code}`], 400), lat, lon, poly: geom,
          time: iso(p[`Onset_${code}`]), until: iso(p[`Expire_${code}`]), sev: AEMET_SEV[color.toLowerCase()] || 1,
          level: `${color} · ${what}`, country: p.Provincia ? `${p.Provincia} (España)` : "España",
          prob: p[`Prb_${code}`], url: AEMET_PAGE, src: "AEMET",
        });
      }
    }
  }
  return [...out.values()];
}

// GDELT answers 404 to Vercel's servers but not to GitHub's, so on Vercel the news layers come
// from the copy the "gdelt" workflow publishes every 15 minutes on the repo's live branch.
const MIRROR = "https://raw.githubusercontent.com/CarlosPV-77/world-alert-data/live/";

async function news(src, cat, keep) {
  if (!process.env.VERCEL) return gdeltNews(cat, keep);
  const d = await get(`${MIRROR}${src}.json`);
  const st = d.status?.[src];
  if (st && !st.ok && !d.events?.length) throw new Error(`copia de GitHub: ${st.error}`);
  return d.events || [];
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

  async aemet() { return aemet(); },

  async conflictos() { return news("conflictos", "conflicto", isConflicto); },
  async atentados() { return news("atentados", "atentado", isAtentado); },

  async mastodon(q) { return social("mastodon", q); },
  async bluesky(q) { return social("bluesky", q); },
  async telegram(q) { return social("telegram", q); },

  async aereos() { return accidents("aereo"); },
  async maritimos() { return accidents("naval"); },
};

export async function collect(q = {}) {
  const wanted = String(q.src || "all").split(",").flatMap((s) => (s === "all" ? Object.keys(SOURCES) : [s])).filter((s) => SOURCES[s]);
  const results = await Promise.allSettled(wanted.map((s) => SOURCES[s](q)));
  const status = {}, events = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") { status[wanted[i]] = { ok: true, n: r.value.length }; events.push(...r.value.map((e) => ({ verified: true, ...e }))); }
    else status[wanted[i]] = { ok: false, error: [r.reason?.message || r.reason, r.reason?.cause?.code || r.reason?.cause?.message].filter(Boolean).join(": ").slice(0, 200) };
  });
  return { generated: new Date().toISOString(), status, events };
}
