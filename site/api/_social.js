// Social posts read without an account: Mastodon hashtag timelines, Bluesky public search and the
// web preview of public Telegram channels. Posts rarely carry coordinates, so the place is read from
// the text with a small gazetteer (Natural Earth cities, regions and countries). Everything is unverified.
import { readFileSync } from "node:fs";
import { aftermath, isIncident, notAlert } from "./_notalert.js";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const DAY = 24 * 3600e3;

// name -> [[lat, lon, country, kind (0 city, 1 country, 2 region), population], ...]
let GAZ;
const gaz = () => (GAZ ||= JSON.parse(readFileSync(new URL("./_gazetteer.json", import.meta.url), "utf8")));

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const clean = (s) => String(s || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&nbsp;/g, " ")
  .replace(/[ \t]+/g, " ").trim();

// What the post is about. Checked in order, so a missile strike reads as conflict before "explosion" reads as attack.
const TOPICS = [
  ["tsunami", "tsunami", "Tsunami", /tsunami/i],
  ["volcan", "volcano", "Volcán", /volc[aá]n|volcano|erupci[oó]n|eruption|ash cloud|ceniza volc/i],
  ["sismo", "quake", "Terremoto", /terremoto|sismo|se[ií]smo|earthquake|quake|tremor de terra|temblor/i],
  ["ciclon", "cyclone", "Ciclón", /hurac[aá]n|hurricane|typhoon|tif[oó]n|cicl[oó]n|cyclone|tropical storm|tormenta tropical/i],
  ["meteo", "tornado", "Tornado", /tornad/i],
  ["inundacion", "flood", "Inundación", /inundaci|flood|riada|crecida|\bdana\b|crue/i],
  ["incendio", "fire", "Incendio", /wildfire|bushfire|forest fire|incendio forestal|incendie|incendio/i],
  ["conflicto", "clash", "Combates", /airstrike|air strike|ataque a[eé]reo|bombarde|shelling|artiller|missile|misil|drone (?:strike|attack)|ataque con drones|clashes|combates|offensive|ofensiva|frontline|frente de|troops|tropas|rocket fire|cohetes/i],
  ["atentado", "blast", "Atentado", /atentado|terror|explosi[oó]n|explosion|car bomb|coche bomba|suicide bomb|mass shooting|tiroteo|gunman|stabbing|apu[ñn]al|hostage|reh[eé]n/i],
];
const topicOf = (t) => TOPICS.find(([, , , re]) => re.test(t));

// Earthquake bots repeat the seismic networks word for word; the USGS layer already has those.
const isQuakeBot = (t) => /(\b(m[blsw]?v?|mww?)\s?\d([.,]\d+)?\b|magnitu[dr]e?\W{0,6}(de\s*)?\d)/i.test(t)
  && /(\bkm\b|UTC|hace \d|\bago\b|depth|profundidad|epicent|\d{1,2}:\d{2}|USGS|EMSC|GFZ|INETER|sismol|detected)/i.test(t);

// Region names that are also everyday words ("Coast", "Islands", "Southern"…) say nothing about the place on their own.
const GENERIC = new Set("islands island coast coastal southern northern eastern western central capital national north south east west north east lakes river valley mountain mountains highlands lowlands border upper lower greater interior littoral centre center metropolitan federal special region frontier sur norte este oeste centro costa islas frontera sierra valle rio capital oriental occidental".split(" "));
const PREP = new Set("in off near at outside en frente cerca junto costa costas de del a".split(" "));
// "Malaga Street", "calle Málaga", "Rue de Paris": a street or district named after a place is not that place.
const STREET_AFTER = new Set("street st avenue ave road rd drive dr boulevard blvd lane ln court ct terrace parkway pkwy highway hwy square circle crescent alley county township".split(" "));
const STREET_BEFORE = new Set("calle c avenida avda av paseo plaza ronda carrera travesia rua rue via viale strasse".split(" "));
const SPANISH = /(^|\s)(que|los|las|del|el|en|por|una|para|con|está|según|hoy|y)(\s|$)/i;

// Reads place names from the text: hashtags or capitalised words, longest phrase first.
function placeOf(text, lang) {
  const g = gaz();
  const body = text.replace(/https?:\/\/\S+/g, " ").replace(/@[\w.]+/g, " ");
  const words = [...body.matchAll(/(#?)([\p{L}\p{M}][\p{L}\p{M}'’-]*)/gu)].map((m) => ({ tag: !!m[1], w: m[2] }));
  const hits = [];
  for (let i = 0; i < words.length;) {
    let found = 0;
    for (let n = Math.min(4, words.length - i); n >= 1 && !found; n--) {
      const first = words[i];
      if (!first.tag && !/^\p{Lu}/u.test(first.w)) continue;
      const key = norm(words.slice(i, i + n).map((x) => x.w).join(" "));
      if (n === 1 && GENERIC.has(key)) continue;
      // A place right after "in", "off", "near", "en", "frente a"… is where it happened, not who is talked about.
      const prev = norm(words[i - 1]?.w || "");
      const before = /^(de|del|di|da|do|du|des|of)$/.test(prev) ? norm(words[i - 2]?.w || "") : prev;
      if (STREET_AFTER.has(norm(words[i + n]?.w || "")) || STREET_BEFORE.has(before)) continue;
      if (g[key]) { hits.push({ key, cands: g[key], at: PREP.has(prev) }); found = n; }
    }
    i += found || 1;
  }
  if (!hits.length) return null;
  const countries = new Set(hits.flatMap((h) => h.cands.filter((x) => x[3] === 1).map((x) => x[2])));
  const es = lang?.startsWith("es") || (!lang && SPANISH.test(text));
  let best = null, bestKey = "", bestScore = -1;
  for (const { key, cands, at } of hits) for (const c of cands) {
    // A city beats a region, a region beats a country; a place inside a country also named wins.
    let s = c[3] === 0 ? 3 : c[3] === 2 ? 2 : 1;
    if (c[3] !== 1 && countries.has(c[2])) s += 4;
    if (es && c[2] === "España" && c[3] !== 1) s += 2;
    if (cands[0] === c) s += 0.5;
    if (at) s += 1.5;
    s += Math.min(0.4, (c[4] || 0) / 5e7);
    if (s > bestScore) { bestScore = s; best = c; bestKey = key; }
  }
  const name = best[3] === 1 ? best[2] : bestKey.replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase()).replace(/ (Of|De|Del|La|Las|Los|El|The)\b/g, (m) => m.toLowerCase());
  return { lat: best[0], lon: best[1], country: best[2], name };
}

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${r.status} ${new URL(url).hostname}`);
  return r.json();
}
async function settle(jobs) {
  const res = await Promise.allSettled(jobs);
  const ok = res.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
  if (!ok.length && res.length) throw new Error(res.find((r) => r.status === "rejected")?.reason?.message || "sin respuesta");
  return ok;
}

const MASTODON_TAGS = ["earthquake", "terremoto", "sismo", "tsunami", "volcano", "wildfire", "incendio", "flood", "inundaciones", "hurricane", "breakingnews", "ultimahora"];
async function mastodon() {
  return settle(MASTODON_TAGS.map(async (tag) => {
    const list = await getJson(`https://mastodon.social/api/v1/timelines/tag/${tag}?limit=40`);
    return list.map((s) => ({
      net: "Mastodon", id: s.uri || s.id, time: s.created_at, lang: s.language, url: s.url || s.uri,
      author: s.account?.acct || s.account?.username || "", text: clean(s.content), bot: !!s.account?.bot,
    })).filter((p) => !p.bot);
  }));
}

const BSKY_QUERIES = ["terremoto", "earthquake", "explosión", "explosion", "airstrike", "bombardeo", "wildfire", "incendio forestal", "flood", "inundación", "hurricane", "tsunami", "atentado", "volcano"];
async function bluesky() {
  return settle(BSKY_QUERIES.map(async (q) => {
    const d = await getJson(`https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&sort=latest&limit=50`);
    return (d.posts || []).map((p) => ({
      net: "Bluesky", id: p.uri, time: p.record?.createdAt || p.indexedAt, lang: p.record?.langs?.[0], author: p.author?.handle || "",
      url: `https://bsky.app/profile/${p.author?.handle}/post/${String(p.uri).split("/").pop()}`, text: String(p.record?.text || ""),
    }));
  }));
}

// Neutral news channels in Spanish or English and Carlos's war alert channels; the list can be changed in Ajustes.
export const TELEGRAM_DEFAULT = ["france24_es", "elconfidencial", "france24_en", "insiderpaper", "WorldNews", "KyivIndependent_official",
  "guerrasdelmundo24h", "Zona_militar", "descifrandolaguerra", "entre_guerras", "ULTIMA_HORA", "warmonitors", "wartranslated"];
async function telegram(q) {
  const chans = String(q.tg || "").split(",").map((s) => s.trim().replace(/^@|^https?:\/\/t\.me\/(s\/)?/g, "")).filter((s) => /^\w{4,64}$/.test(s));
  return settle((chans.length ? chans : TELEGRAM_DEFAULT).slice(0, 20).map(async (ch) => {
    const r = await fetch(`https://t.me/s/${ch}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`${r.status} t.me/${ch}`);
    const html = await r.text();
    return html.split('class="tgme_widget_message_wrap').slice(1).map((b) => {
      const post = b.match(/data-post="([^"]+)"/)?.[1];
      const text = b.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
      const time = b.match(/<time[^>]+datetime="([^"]+)"/)?.[1];
      return post && text && time ? { net: "Telegram", id: post, time, author: ch, url: `https://t.me/${post}`, text: clean(text) } : null;
    }).filter(Boolean);
  }));
}

// Every post of the last day from the chosen channels, for the newspaper's Telegram section: no topic or place
// filter here, unlike the map. The place, when the text names one, only says whether the post is about Spain.
export async function telegramPosts(q) {
  const now = Date.now();
  return (await telegram(q)).filter((p) => now - Date.parse(p.time) <= DAY).map((p) => {
    const place = placeOf(p.text, null);
    const lang = /[\u0400-\u04ff]/.test(p.text) ? "ru" : SPANISH.test(p.text) ? "es" : "en";
    return { id: `tgpost:${p.id}`, channel: p.author, time: p.time, url: p.url, text: p.text.slice(0, 700), lang,
      place: place ? (place.name && place.name !== place.country ? `${place.name} (${place.country})` : place.country) : "", spain: place?.country === "España" };
  }).sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
}

// Tells whether a name is a public Telegram channel that can be read without an account, and its title.
// t.me/s/ answers 200 only for public channels; groups, users, private and missing channels redirect.
export async function checkTelegram(name) {
  const ch = String(name || "").trim().replace(/^@|^https?:\/\/t\.me\/(s\/)?/, "").replace(/\/.*$/, "");
  if (!/^\w{4,64}$/.test(ch)) return { ok: false, channel: ch, error: "Nombre no válido: entre 4 y 64 letras, números o guiones bajos." };
  const r = await fetch(`https://t.me/s/${ch}`, { headers: { "User-Agent": UA }, redirect: "manual", signal: AbortSignal.timeout(8000) });
  if (r.status !== 200) return { ok: false, channel: ch, error: "No es un canal público de Telegram o no existe." };
  const html = await r.text();
  const title = clean(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] || ch);
  return { ok: true, channel: ch, title, posts: html.includes("tgme_widget_message_wrap") };
}

// Groups posts about the same topic and place into one map marker.
function toEvents(posts, net) {
  const groups = new Map(), now = Date.now();
  for (const p of posts) {
    const t = Date.parse(p.time);
    if (!p.text || !Number.isFinite(t) || now - t > DAY) continue;
    const topic = topicOf(p.text);
    if (!topic || ((topic[0] === "sismo" || topic[0] === "tsunami") && isQuakeBot(p.text)) || notAlert(p.text)) continue;
    // Reactions, arrests and talks about an attack, or posts that only name one, are not the attack.
    if (topic[0] === "conflicto" || topic[0] === "atentado" ? !isIncident(p.text) : aftermath(p.text)) continue;
    const place = placeOf(p.text, p.lang);
    if (!place) continue;
    const key = `${topic[0]}|${place.lat.toFixed(1)}|${place.lon.toFixed(1)}`;
    const g = groups.get(key) || { topic, place, posts: [], seen: new Set() };
    if (g.seen.has(p.id)) continue;
    g.seen.add(p.id); g.posts.push({ ...p, t });
    groups.set(key, g);
  }
  return [...groups.values()].map(({ topic, place, posts: ps }) => {
    ps.sort((a, b) => b.t - a.t);
    const authors = new Set(ps.map((p) => p.author)).size;
    const where = place.name && place.name !== place.country ? `${place.name} (${place.country})` : place.country;
    return {
      id: `${net.toLowerCase()}:${topic[0]}:${place.lat.toFixed(1)},${place.lon.toFixed(1)}`, cat: "redes", topic: topic[0], pic: topic[1],
      title: `${topic[2]} · ${where}`,
      desc: ps[0].text.slice(0, 400),
      lat: place.lat, lon: place.lon, approx: true, country: place.country,
      time: new Date(ps[ps.length - 1].t).toISOString(), updated: new Date(ps[0].t).toISOString(),
      sev: authors >= 5 ? 3 : authors >= 2 ? 2 : 1,
      url: ps[0].url, src: net, verified: false, social: true,
      posts: ps.slice(0, 5).map((p) => ({ net: p.net, author: p.author, time: new Date(p.t).toISOString(), url: p.url, text: p.text.slice(0, 280) })),
      npost: ps.length, nauthor: authors,
    };
  });
}

export async function social(net, q) {
  const posts = net === "mastodon" ? await mastodon() : net === "bluesky" ? await bluesky() : await telegram(q);
  return toEvents(posts, { mastodon: "Mastodon", bluesky: "Bluesky", telegram: "Telegram" }[net]);
}
export { placeOf, topicOf };
