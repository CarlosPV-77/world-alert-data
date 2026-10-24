// Official Spanish alerts by level: national (IGN, DGT), regional (Catalonia, Canarias, Galicia, Euskadi)
// and local (Madrid city). All open feeds without a key; each event says which level and body issued it.
import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "node:fs";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", removeNSPrefix: true });

async function get(url, type = "json") {
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const t = await r.text();
  return type === "json" ? JSON.parse(t) : type === "xml" ? xml.parse(t) : t;
}

const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const txt = (x) => (x == null ? "" : typeof x === "object" ? String(x["#text"] ?? "") : String(x)).trim();
const num = (x) => { const n = parseFloat(x); return Number.isFinite(n) ? n : null; };
const iso = (x) => { const d = new Date(x); return isNaN(d) ? null : d.toISOString(); };
const clip = (s, n = 400) => { s = String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const HOUR = 3600e3;
let CONC;   // Galician municipality code -> [lat, lon], read once
const concellos = () => (CONC ||= JSON.parse(readFileSync(new URL("./_concellos.json", import.meta.url), "utf8")));

// Spanish feeds give wall-clock times in Madrid without a zone: "2026-10-24T21:02:06".
function madrid(s) {
  const m = String(s || "").match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/) ||
    String(s || "").match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return iso(s);
  const [y, mo, d] = m[1].length === 4 ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
  const asUtc = Date.UTC(+y, +mo - 1, +d, +m[4], +m[5], +(m[6] || 0));
  const wall = new Date(new Date(asUtc).toLocaleString("en-US", { timeZone: "Europe/Madrid" }) + " UTC");
  return new Date(asUtc - (wall - asUtc)).toISOString();
}

// First value found under `key` anywhere inside a parsed XML node.
function deep(o, key) {
  if (!o || typeof o !== "object") return undefined;
  if (key in o) return o[key];
  for (const v of Object.values(o)) { const r = deep(v, key); if (r !== undefined) return r; }
  return undefined;
}

const SMALL = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "a"]);
const titleCase = (s) => String(s).toLowerCase().split(/\s+/).map((w, i) => (i && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");

// ---------- national ----------

// IGN: earthquakes in and around Spain over the last ten days, smaller ones than USGS lists.
// "Se ha producido un terremoto de magnitud 2.7 en SE PRIARANZA DEL BIERZO.LE en la fecha 23/10/2026 10:50:00 ..."
async function ign() {
  const d = await get("https://www.ign.es/ign/RssTools/sismologia.xml", "xml");
  return arr(d?.rss?.channel?.item).map((it) => {
    const desc = txt(it.description), lat = num(txt(it.lat)), lon = num(txt(it.long));
    const m = desc.match(/magnitud\s+([\d.]+)\s+en\s+(.+?)\s+en la fecha\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/i);
    if (!m || lat == null || lon == null) return null;
    const mag = +m[1];
    // Place names come in capitals, with a direction ("SE") in front and the province code after a dot.
    let [, , place] = m, prov = "";
    const pm = place.match(/^(.*)\.([A-Z]{1,3})$/);
    if (pm) [, place, prov] = pm;
    const dir = place.match(/^([NSEW]{1,3})\s+(.*)$/);
    const name = (dir ? `${dir[1]} ` : "") + titleCase(dir ? dir[2] : place) + (prov ? ` (${prov})` : "");
    return {
      id: `ign:${txt(it.guid).split("evid=")[1] || txt(it.guid)}`, cat: "es_nac", pic: "quake",
      title: `Terremoto M${mag.toFixed(1)} · ${name}`, desc, lat, lon, mag,
      time: iso(`${m[5]}-${m[4]}-${m[3]}T${m[6].padStart(2, "0")}:${m[7]}:${m[8]}Z`),
      sev: mag >= 5 ? 4 : mag >= 4 ? 3 : mag >= 3 ? 2 : 1, level: `Magnitud ${mag.toFixed(1)}`,
      country: "España", url: txt(it.link), src: "IGN",
    };
  }).filter(Boolean);
}

// DGT: every incident on the roads it manages (all of Spain but Catalonia and Euskadi), refreshed each minute.
// Most are roadworks; only accidents, closures not due to works, weather and road damage are kept.
const DGT_CAUSE = {
  accident: "Accidente", poorEnvironment: "Meteorología adversa", environmentalObstruction: "Obstáculo natural",
  infrastructureDamageObstruction: "Daños en la vía", obstruction: "Obstáculo en la vía", vehicleObstruction: "Vehículo detenido",
  roadMaintenance: "Obras", roadOrCarriagewayOrLaneManagement: "Regulación del tráfico",
};
const DGT_DETAIL = {
  flooding: "inundación", snowfall: "nieve", snowDrifts: "nieve", heavySnowfall: "nevada intensa", ice: "hielo", blackIce: "hielo", fog: "niebla",
  denseFog: "niebla densa", strongWinds: "viento fuerte", gales: "temporal", rockfalls: "desprendimiento", landslips: "corrimiento de tierras",
  mudslide: "barro", fallenTrees: "árboles caídos", fire: "incendio", forestFire: "incendio forestal", smokeHazard: "humo", avalanches: "aludes",
  heavyRain: "lluvia intensa", hail: "granizo", visibilityReduced: "poca visibilidad", subsidence: "hundimiento", earthquakeDamage: "daños por terremoto",
  objectOnTheRoad: "objeto en la calzada", animalsOnTheRoad: "animales en la calzada", spillageOnTheRoad: "vertido en la calzada", oilOnRoad: "aceite en la calzada",
  vehicleOnFire: "vehículo en llamas", brokenDownVehicle: "avería", overturnedVehicle: "vehículo volcado", chainsOrSnowTyresMandatory: "cadenas obligatorias",
};
const DGT_KEEP = new Set(["accident", "poorEnvironment", "environmentalObstruction", "infrastructureDamageObstruction"]);

async function dgt() {
  const d = await get("https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v37.xml", "xml");
  const out = [];
  for (const s of arr(deep(d, "situation"))) {
    for (const r of arr(s.situationRecord)) {
      const cause = txt(r.cause?.causeType), sevTxt = txt(r.severity), mgmt = txt(r.roadOrCarriagewayOrLaneManagementType);
      const closed = mgmt === "roadClosed";
      if (!(DGT_KEEP.has(cause) || sevTxt === "highest" || sevTxt === "high" || (closed && cause !== "roadMaintenance"))) continue;
      if (cause === "roadMaintenance") continue;
      const pt = arr(deep(r.locationReference, "pointCoordinates"))[0];
      const lat = num(txt(pt?.latitude)), lon = num(txt(pt?.longitude));
      if (lat == null || lon == null) continue;
      const detail = Object.values(r.cause?.detailedCauseType || {}).map(txt).map((k) => DGT_DETAIL[k]).find(Boolean);
      const road = txt(deep(r.locationReference, "roadName")), pk = txt(deep(r.locationReference, "kilometerPoint"));
      const town = txt(deep(r.locationReference, "municipality")), prov = txt(deep(r.locationReference, "province"));
      const region = txt(deep(r.locationReference, "autonomousCommunity"));
      const what = (DGT_CAUSE[cause] || "Incidencia") + (detail ? ` (${detail})` : "");
      const sev = cause === "accident" || closed || sevTxt === "highest" ? 3 : 2;
      const vt = r.validity?.validityTimeSpecification || {};
      out.push({
        id: `dgt:${s["@id"]}`, cat: "es_nac", pic: cause === "accident" || cause === "vehicleObstruction" ? "car" : "road",
        title: `${what}${closed ? " · carretera cortada" : ""} · ${[road && `${road}${pk ? ` km ${pk}` : ""}`, town].filter(Boolean).join(", ")}`,
        desc: clip([what, closed ? "Carretera cortada" : mgmt === "laneClosures" ? "Carriles cortados" : "", road && `${road}${pk ? ` (km ${pk})` : ""}`, [town, prov, region].filter(Boolean).join(", ")].filter(Boolean).join(". ") + "."),
        lat, lon, time: iso(txt(vt.overallStartTime) || txt(r.situationRecordCreationTime)), updated: iso(txt(r.situationRecordVersionTime)),
        until: iso(txt(vt.overallEndTime)) || undefined, sev, level: closed ? "Corte" : what,
        country: prov ? `${prov} (España)` : "España", url: "https://infocar.dgt.es/etraffic/", src: "DGT",
      });
      break;   // one marker per situation
    }
  }
  return out;
}

// ---------- regional ----------

// Catalonia: civil-protection plans in prealerta, alerta or emergència, published by Protecció Civil as they change.
// Empty when nothing is active. Plans cover the whole region unless the CECAT notice says otherwise.
const CAT_PIC = { INUNCAT: "flood", VENTCAT: "wind", NEUCAT: "snow", INFOCAT: "fire", SISMICAT: "quake", ALLAUCAT: "snow", CAMCAT: "coast", PROCICAT: "siren" };
const PHASE_SEV = { prealerta: 2, alerta: 3, "alerta màxima": 4, emergència: 4, emergencia: 4 };

async function catalunya() {
  const rows = await get("https://analisi.transparenciacatalunya.cat/resource/wj9c-j6vf.json");
  return rows.filter((r) => !/^no$/i.test(r.plaactivat || "")).map((r) => {
    const acr = String(r.plaacronim || "").trim(), fase = String(r.plafase || "").trim();
    const pdf = typeof r.comunicatpdf === "object" ? r.comunicatpdf?.url : r.comunicatpdf;
    return {
      id: `cat:${acr}:${fase}:${r.fasedatahora}`, cat: "es_aut", pic: CAT_PIC[acr.toUpperCase()] || "siren",
      title: `${acr || "Pla"} en ${fase.toLowerCase() || "activació"} · ${r.planom || "Protecció Civil de Catalunya"}`,
      desc: clip(r.descripcio || r.planom, 500), lat: 41.8, lon: 1.6, approx: true,
      time: madrid(r.fasedatahora), sev: PHASE_SEV[fase.toLowerCase()] || 2, level: fase || "Activat",
      country: "Cataluña (España)", url: pdf || "https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/", src: "Protecció Civil de Catalunya",
    };
  });
}

// Canarias: the regional government declares prealerta, alerta and emergencia situations in its news portal.
// A later "fin"/"finaliza" note for the same hazard closes the earlier ones; notes older than four days are dropped.
const ISLAS = { "el hierro": [27.74, -18.02], "la palma": [28.68, -17.86], "la gomera": [28.1, -17.23], tenerife: [28.29, -16.62], "gran canaria": [27.96, -15.59], fuerteventura: [28.36, -14.05], lanzarote: [29.04, -13.63] };
const HAZARD = [[/coster|oleaje|mar de fondo/i, "costeros"], [/viento/i, "viento"], [/lluvi|precipit/i, "lluvias"], [/temperatura|calor/i, "calor"], [/incendio/i, "incendios"], [/calima|polvo/i, "calima"], [/nev|nieve/i, "nevadas"], [/tormenta/i, "tormentas"]];

async function canarias() {
  const d = await get("https://www3.gobiernodecanarias.org/noticias/category/consejerias/politica-territorial-cohesion-territorial-y-aguas/alertas-politica-territorial-cohesion-territorial-y-aguas/feed/", "xml");
  const items = arr(d?.rss?.channel?.item).map((it) => ({ it, t: Date.parse(txt(it.pubDate)) })).sort((a, b) => b.t - a.t);
  const ended = new Set(), out = [];
  for (const { it, t } of items) {
    if (!(t > Date.now() - 96 * HOUR)) continue;
    const title = txt(it.title), body = txt(it.encoded) || txt(it.description);
    const hz = HAZARD.find(([re]) => re.test(title))?.[1] || "otros";
    const isEnd = /finaliza|fin de la|fin del|desactiva|da por concluid|levanta/i.test(title);
    if (isEnd) { ended.add(hz); continue; }
    if (ended.has(hz) || !/alerta|emergencia/i.test(title)) continue;
    ended.add(hz);   // only the newest note per hazard
    const scope = (body.match(/Ámbito territorial:?\s*<\/strong>\s*<\/p>\s*<p>(.*?)<\/p>/is)?.[1] || body).toLowerCase();
    const isl = Object.keys(ISLAS).filter((k) => scope.includes(k));
    const [lat, lon] = isl.length === 1 ? ISLAS[isl[0]] : [28.3, -15.8];
    const phase = /emergencia/i.test(title) ? "Emergencia" : /alerta m[aá]xima/i.test(title) ? "Alerta máxima" : /prealerta/i.test(title) && !/pasando a alerta|eleva.*alerta/i.test(title) ? "Prealerta" : "Alerta";
    out.push({
      id: `canarias:${txt(it.guid).split("p=")[1] || txt(it.link)}`, cat: "es_aut", title, desc: clip(body, 600),
      lat, lon, approx: isl.length !== 1, time: iso(txt(it.pubDate)), sev: PHASE_SEV[phase.toLowerCase()] || 3, level: phase,
      country: isl.length === 1 ? `${titleCase(isl[0])} (España)` : "Canarias (España)", url: txt(it.link), src: "Gobierno de Canarias · Emergencias",
    });
  }
  return out;
}

// MeteoGalicia: warnings per municipality for today and the next two days. Municipalities with the same
// warning, level and start in one province become one event, placed at their average position.
const MG_COLOR = { 1: "amarillo", 2: "naranja", 3: "rojo" };
const GAL_PROV = { 15: "A Coruña", 27: "Lugo", 32: "Ourense", 36: "Pontevedra" };

async function meteogalicia() {
  const d = await get("https://servizos.meteogalicia.gal/mgrss/predicion/adversos/jsonAvisosConcellos.action?dia=-1");
  const groups = new Map();
  for (const day of arr(d.listaDiaConcellos)) for (const a of arr(day.listaAvisosConcellos)) {
    const lvl = +a.idNivel;
    if (!lvl) continue;
    const code = String(a.idconcello ?? a.idConcello ?? "").padStart(5, "0"), prov = code.slice(0, 2);
    const key = `${prov}:${a.idTipoAlerta}:${lvl}:${a.dataIni}`;
    if (!groups.has(key)) groups.set(key, { a, lvl, prov, towns: [], pts: [] });
    const g = groups.get(key);
    g.towns.push(a.nomeConcello);
    if (concellos()[code]) g.pts.push(concellos()[code]);
  }
  return [...groups.entries()].map(([key, g]) => {
    const pts = g.pts.length ? g.pts : [[42.75, -7.9]];
    const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length, lon = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const color = MG_COLOR[g.lvl], what = String(g.a.tipoalerta_es || "fenómeno adverso").toLowerCase();
    const where = g.towns.length === 1 ? g.towns[0] : `${g.towns.length} concellos de ${GAL_PROV[g.prov] || "Galicia"}`;
    const list = g.towns.slice(0, 25).join(", ") + (g.towns.length > 25 ? ` y ${g.towns.length - 25} más` : "");
    return {
      id: `meteogalicia:${key}`, cat: "es_aut", title: `Aviso ${color} por ${what} · ${where}`,
      desc: clip(`Aviso ${color} de MeteoGalicia por ${what}. Concellos: ${list}.`, 700), lat, lon, approx: g.towns.length > 1,
      time: madrid(g.a.dataIni), until: madrid(g.a.dataFin) || undefined, updated: madrid(g.a.dataAviso) || undefined,
      sev: g.lvl + 1, level: `${titleCase(color)} · ${what}`, country: `${GAL_PROV[g.prov] || "Galicia"} (España)`,
      url: "https://www.meteogalicia.gal/web/predicion/avisos", src: "MeteoGalicia",
    };
  });
}

// Euskadi: Tráfico del Gobierno Vasco, the roads DGT does not cover. The API lists every incident opened
// today with no end time, so only those of the last twelve hours with a colour level or an accident are kept.
const EUS_SEV = { Amarillo: 2, Rojo: 3, Negro: 4 };

async function euskadi() {
  const [y, m, dd] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()).split("-");
  const base = `https://api.euskadi.eus/traffic/v1.0/incidences/byDate/${y}/${m}/${dd}`;
  const first = await get(base);
  const pages = Math.min(first.totalPages || 1, 15);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => get(`${base}?_page=${i + 2}`).catch(() => ({}))));
  const all = [first, ...rest].flatMap((p) => arr(p.incidences));
  const seen = new Set();
  return all.filter((i) => {
    if (seen.has(i.incidenceId)) return false;
    seen.add(i.incidenceId);
    const t = Date.parse(madrid(i.startDate));
    return t > Date.now() - 12 * HOUR && (i.incidenceType === "Accidente" || EUS_SEV[i.incidenceLevel] || /meteorol|vialidad invernal|puerto/i.test(i.incidenceType || ""));
  }).map((i) => {
    const lat = num(i.latitude), lon = num(i.longitude);
    const what = i.incidenceType + (i.cause && i.cause !== i.incidenceType ? ` (${String(i.cause).toLowerCase()})` : "");
    return lat == null || lon == null ? null : {
      id: `euskadi:${i.incidenceId}`, cat: "es_aut", pic: i.incidenceType === "Accidente" ? "car" : /meteorol|vialidad/i.test(i.incidenceType) ? undefined : "road",
      title: `${what} · ${[i.road && `${i.road}${i.pkStart ? ` km ${i.pkStart}` : ""}`, i.cityTown || titleCase(i.province || "")].filter(Boolean).join(", ")}`,
      desc: clip(`${what}. ${i.road || ""}${i.pkStart ? ` km ${i.pkStart}` : ""}${i.direction ? `, sentido ${i.direction}` : ""}. Nivel ${String(i.incidenceLevel || "blanco").toLowerCase()}.`),
      lat, lon, time: madrid(i.startDate), sev: EUS_SEV[i.incidenceLevel] || 2, level: `Nivel ${String(i.incidenceLevel || "blanco").toLowerCase()}`,
      country: `${titleCase(i.province || "Euskadi")} (España)`, url: "https://www.trafikoa.eus", src: "Tráfico Euskadi",
    };
  }).filter(Boolean);
}

// ---------- local ----------

// Madrid city: incidents on public roads from the city's traffic centre, mostly planned works. Only accidents,
// the air-pollution protocol and cuts not due to works are kept.
async function madridCity() {
  const d = await get("https://informo.madrid.es/informo/tmadrid/incid_aytomadrid.xml", "xml");
  const now = Date.now();
  return arr(d?.Incidencias?.Incidencia).filter((i) => {
    if (txt(i.incid_estado) !== "1") return false;
    const ini = Date.parse(madrid(txt(i.fh_inicio))), fin = Date.parse(madrid(txt(i.fh_final)));
    if (fin > ini && fin < now) return false;
    return txt(i.es_accidente) === "S" || txt(i.es_contaminacion) === "S" || (txt(i.es_obras) !== "S" && txt(i.incid_planificada) !== "S");
  }).map((i) => {
    const lat = num(txt(i.latitud)), lon = num(txt(i.longitud)), pol = txt(i.es_contaminacion) === "S";
    const what = pol ? `Protocolo de contaminación${txt(i.escenario_contaminacion) ? ` · escenario ${txt(i.escenario_contaminacion)}` : ""}` : txt(i.nom_tipo_incidencia);
    return lat == null || lon == null ? null : {
      id: `madrid:${txt(i.id_incidencia)}`, cat: "es_loc", pic: pol ? "fog" : txt(i.es_accidente) === "S" ? "car" : "road",
      title: `${what} · Madrid`, desc: clip([txt(i.descripcion), txt(i.descripcion_escenario), txt(i.medidas_escenario)].filter(Boolean).join(" "), 500),
      lat, lon, time: madrid(txt(i.fh_inicio)), until: Date.parse(madrid(txt(i.fh_final))) > Date.parse(madrid(txt(i.fh_inicio))) ? madrid(txt(i.fh_final)) : undefined,
      sev: pol || txt(i.es_accidente) === "S" ? 3 : 2, level: what, country: "Madrid (España)",
      url: "https://informo.madrid.es", src: "Ayuntamiento de Madrid",
    };
  }).filter(Boolean);
}

export const SPAIN_SOURCES = { ign, dgt, catalunya, canarias, meteogalicia, euskadi, madrid: madridCity };
