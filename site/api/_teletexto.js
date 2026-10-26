// RTVE teletext on the web: the national (102) and international (120) indexes list each story with its
// page number, and every story page holds a headline, about 100 words and the time it was written.
// The place is read from the text with the social layer's gazetteer, so positions are approximate.
// Use follows RTVE's syndication terms: headline and summary only, a link back, "Información de rtve.es".
import { placeOf, topicOf } from "./_social.js";
import { aftermath, isIncident, notAlert } from "./_notalert.js";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const BASE = "https://www.rtve.es/teletexto/noticias/";
const INDEXES = [["102", "Nacional"], ["120", "Internacional"]];
// Carlos finds RTVE reliable except on the current Prime Minister; those stories are shown as uncontrasted.
const PRESIDENT = /\bPedro S[aá]nchez\b|\bS[aá]nchez\b|presidente del Gobierno|\bMoncloa\b/i;
const MADRID = { lat: 40.4168, lon: -3.7038, country: "España", name: "España" };

const clean = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&").replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í").replace(/&oacute;/g, "ó")
  .replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/\s+/g, " ").trim();

async function page(path) {
  const r = await fetch(BASE + path + "/", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${r.status} teletexto ${path}`);
  return r.text();
}

// Index page -> [{page, title, section}], section being the heading above it ("GUERRA EN ORIENTE PRÓXIMO").
export function parseIndex(html) {
  const list = html.slice(html.indexOf('class="block_basic"'));
  const out = [];
  let section = "";
  for (const li of list.split("<li").slice(1)) {
    const head = li.match(/<span class="title_index">([\s\S]*?)<\/span>/);
    if (head) { section = clean(head[1]); continue; }
    const m = li.match(/href="\/teletexto\/noticias\/(\d{3})\/"[^>]*>\s*<span class="list_item_title">([\s\S]*?)<\/span>/);
    if (m && m[1] !== "101") out.push({ page: m[1], title: clean(m[2]), section });
    if (li.includes("</ul>")) break;
  }
  return out;
}

// Story page -> {body, hm}: the paragraphs after the uppercase headline, and the "22:00" stamp.
export function parseStory(html) {
  const block = html.slice(html.indexOf('class="block_detail"'));
  const paras = [...block.slice(0, block.indexOf("</div>")).matchAll(/<p( class="[^"]*")?>([\s\S]*?)<\/p>/g)];
  const more = paras.find((p) => /more/.test(p[1] || ""));
  const body = paras.slice(1).filter((p) => p !== more).map((p) => clean(p[2])).join(" ");
  const hm = more && clean(more[2]).match(/(\d{1,2}):(\d{2})\s*\/\s*RTVE/);
  return { body, hm: hm ? [+hm[1], +hm[2]] : null };
}

// "22:00" on the page is Madrid time today, or yesterday when that is still ahead of now.
export function madridTime([h, m], now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(now).map((p) => [p.type, p.value]));
  const offset = Date.UTC(+parts.year, parts.month - 1, +parts.day, +parts.hour, +parts.minute) - Math.floor(now / 60000) * 60000;
  let t = Date.UTC(+parts.year, parts.month - 1, +parts.day, h, m) - offset;
  if (t > +now + 5 * 60000) t -= 24 * 3600e3;
  return new Date(t).toISOString();
}

export async function teletexto() {
  const indexes = await Promise.all(INDEXES.map(async ([p, area]) => parseIndex(await page(p)).map((s) => ({ ...s, area }))));
  const stories = indexes.flat();
  if (!stories.length) throw new Error("índice del teletexto vacío");
  const res = await Promise.allSettled(stories.map(async (s) => ({ ...s, ...parseStory(await page(s.page)) })));
  const now = new Date();
  return res.filter((r) => r.status === "fulfilled").map(({ value: s }) => {
    const text = `${s.title}. ${s.body}`;
    // National stories stay in Spain: a Spanish politician speaking in Athens is still national news.
    const found = placeOf(text, s.area === "Nacional" ? "es" : "xx");
    const place = s.area === "Nacional" ? (found?.country === "España" ? found : MADRID) : found;
    if (!place) return null;
    // The topic comes from the headline and first sentence; later sentences give background
    // ("los rehenes", "la guerra") that would mislabel a protest as an attack.
    const first = s.body.split(/(?<=\.)\s/)[0];
    const lead = topicOf(`${s.title}. ${first}`);
    const topic = lead || (/GUERRA|CONFLICTO/.test(s.section) ? topicOf("combates") : null);
    // Only a story that reports the event itself is an alert for the map and the ticker; "El Papa condena el atentado",
    // a trial or a war-section story about talks is news, kept for the newspaper.
    const news = !lead || (lead[0] === "conflicto" || lead[0] === "atentado" ? !isIncident(s.title, first) : notAlert(s.title) || aftermath(s.title));
    const president = PRESIDENT.test(text);
    const where = place.name && place.name !== place.country ? `${place.name} (${place.country})` : place.country;
    return {
      id: `teletexto:${s.page}:${s.title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, "-").slice(0, 60)}`,
      cat: "teletexto", topic: topic?.[0], pic: topic?.[1], title: s.title, news: news || undefined,
      desc: s.body.slice(0, 600), section: [s.area, s.section && s.section !== s.area.toUpperCase() ? s.section : ""].filter(Boolean).join(" · "),
      lat: place.lat, lon: place.lon, approx: true, country: place.country, place: where,
      time: s.hm ? madridTime(s.hm, now) : now.toISOString(),
      sev: topic ? (["conflicto", "atentado", "tsunami", "sismo", "volcan", "ciclon"].includes(topic[0]) ? 3 : 2) : 1,
      url: `${BASE}${s.page}/`, src: "Teletexto RTVE",
      verified: !president, vlabel: president ? undefined : "Teletexto de RTVE",
      caution: president ? "habla del presidente del Gobierno" : undefined,
    };
  }).filter(Boolean);
}
