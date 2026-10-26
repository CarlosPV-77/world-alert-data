// Air and sea accidents from the press: Google News RSS searches in English and Spanish, no key.
// Headlines rarely carry coordinates, so the place is read from the text with the same gazetteer as
// the social layer. A story counts as confirmed when two or more outlets report it.
import { XMLParser } from "fast-xml-parser";
import { placeOf } from "./_social.js";
import { aftermath, notAlert } from "./_notalert.js";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
const HOURS = 48;

const KINDS = {
  aereo: {
    queries: [
      ["en", '"plane crash" OR "aircraft crash" OR "helicopter crash" OR "emergency landing" OR "plane crashed" OR "jet crashed"'],
      ["es", '"accidente aéreo" OR "se estrella" avioneta OR helicóptero OR avión OR "aterrizaje de emergencia" OR "accidente de avioneta"'],
    ],
    // A craft and something that went wrong must both be in the headline.
    craft: /\b(plane|aircraft|airliner|jet|helicopter|chopper|flight|airplane|cessna|boeing|airbus|avi[oó]n|avioneta|helic[oó]ptero|aeronave|vuelo|ultraligero|paramotor)\b/i,
    event: /\b(crash\w*|emergency landing|went down|missing|skid\w*|collid\w*|accident|estrell\w*|accidente|siniestro|aterrizaje de emergencia|desaparecid\w*|se precipit\w*)\b/i,
  },
  naval: {
    queries: [
      ["en", 'shipwreck OR "ship sinks" OR "ship sank" OR capsized OR "boat sinks" OR "ferry sinks" OR "vessel sank" OR "ship collision" OR "ship fire" OR "ran aground"'],
      ["es", 'naufragio OR "se hunde" barco OR buque OR pesquero OR patera OR cayuco OR "vuelca una embarcación" OR "colisión de buques" OR "encalla"'],
    ],
    craft: /\b(ship|vessel|boat|ferry|tanker|freighter|trawler|yacht|cargo ship|containership|boxship|barge|migrant|barco|buque|embarcaci[oó]n|pesquero|patera|cayuco|ferri|velero|lancha|petrolero|mercante|neum[aá]tica)\b/i,
    event: /\b(sank|sink\w*|capsiz\w*|shipwreck|wreck\w*|aground|collision|collid\w*|fire|blaze|explosion|missing|adrift|rescued|hund\w*|naufrag\w*|volc\w*|encall\w*|incendi\w*|colisi[oó]n|desaparecid\w*|rescat\w*|a la deriva)\b/i,
  },
};

// Old stories, features and figures of speech ("el naufragio del macronismo").
const NOT_NEWS = /\b(\d+ years|años despu[eé]s|aniversario|anniversary|documentar|movie|pel[ií]cula|novel|libro|book|museum|museo|laid to rest|remembered|recuerda|memorial|lawsuit|demanda|trial|juicio|verdict|sentencia|report finds|informe final|year since|years since|one year|un a[ñn]o|se cumple)\b/i;
const NUM = "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|dozens|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|decenas";
const DEATHS = new RegExp(`\\b(${NUM})\\s+(?:[\\w-]+\\s+){0,3}(?:dead|killed|die[ds]?|muertos|fallecidos|v[ií]ctimas mortales|mueren)|(?:kills?|killing|matan?|mueren|muere)\\s+(?:at least\\s+|al menos\\s+)?(${NUM})\\b`, "i");
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozens: 24, un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, decenas: 24 };
const toNum = (w) => (w ? (/^\d+$/.test(w) ? +w : WORDS[w.toLowerCase()] || 0) : 0);

async function search(lang, q) {
  const loc = lang === "es" ? "hl=es&gl=ES&ceid=ES:es" : "hl=en-US&gl=US&ceid=US:en";
  const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:2d`)}&${loc}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error(`${r.status} news.google.com`);
  const items = xml.parse(await r.text())?.rss?.channel?.item || [];
  return (Array.isArray(items) ? items : [items]).map((it) => {
    const outlet = typeof it.source === "object" ? String(it.source["#text"] || "") : String(it.source || "");
    const title = String(it.title || "").replace(new RegExp(`\\s+-\\s+${outlet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
    return { lang, title, outlet, url: String(it.link || ""), time: Date.parse(it.pubDate) };
  });
}

export async function accidents(kind) {
  const k = KINDS[kind];
  const res = await Promise.allSettled(k.queries.map(([lang, q]) => search(lang, q)));
  const items = res.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
  if (!items.length) throw new Error(res.find((r) => r.status === "rejected")?.reason?.message || "sin noticias");
  const now = Date.now(), groups = new Map();
  for (const it of items) {
    if (!Number.isFinite(it.time) || now - it.time > HOURS * 3600e3) continue;
    if (!k.craft.test(it.title) || !k.event.test(it.title) || NOT_NEWS.test(it.title) || notAlert(it.title) || aftermath(it.title)) continue;
    const place = placeOf(it.title, it.lang);
    if (!place) continue;
    const key = `${place.lat.toFixed(0)}|${place.lon.toFixed(0)}`;
    const g = groups.get(key) || { place, items: [], outlets: new Set() };
    if (g.items.some((x) => x.title === it.title)) continue;
    g.items.push(it); if (it.outlet) g.outlets.add(it.outlet);
    groups.set(key, g);
  }
  // A story placed only at country level joins a city or coast of that country reported by other outlets.
  for (const [key, g] of groups) {
    if (g.place.name !== g.place.country) continue;
    const finer = [...groups.values()].find((o) => o !== g && o.place.country === g.place.country && o.place.name !== o.place.country);
    if (finer) { finer.items.push(...g.items); g.outlets.forEach((o) => finer.outlets.add(o)); groups.delete(key); }
  }
  return [...groups.values()].map(({ place, items: list, outlets }) => {
    list.sort((a, b) => b.time - a.time);
    const deaths = Math.max(0, ...list.map((x) => { const m = x.title.match(DEATHS); return m ? toNum(m[1] || m[2]) : 0; }));
    const minor = list.every((x) => /emergency landing|aterrizaje de emergencia|rescued|rescat/i.test(x.title));
    const where = place.name && place.name !== place.country ? `${place.name} (${place.country})` : place.country;
    const n = outlets.size;
    return {
      id: `${kind}:${place.lat.toFixed(0)},${place.lon.toFixed(0)}`, cat: kind,
      title: `${kind === "aereo" ? "Accidente aéreo" : "Accidente marítimo"} · ${where}`,
      desc: list[0].title, lat: place.lat, lon: place.lon, approx: true, country: place.country,
      time: new Date(list[list.length - 1].time).toISOString(), updated: new Date(list[0].time).toISOString(),
      sev: deaths >= 20 ? 4 : deaths >= 1 ? 3 : minor ? 1 : 2,
      url: list[0].url, src: "Prensa (Google Noticias)", outlets: [...outlets].slice(0, 6), articles: list.length,
      headlines: list.slice(0, 5).map((x) => ({ title: x.title, outlet: x.outlet, url: x.url, time: new Date(x.time).toISOString(), lang: x.lang })),
      verified: n >= 2, vlabel: n >= 2 ? `${n} medios` : "1 medio",
    };
  });
}
