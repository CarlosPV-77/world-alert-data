// Temporary: checks which Telegram channels and Bluesky queries answer from Vercel without an account.
const CH = ["bbcbreaking","BNONews","insiderpaper","reuters","Reuters_World","ajenglish","AlJazeeraEnglish","cnnbrk","france24_en","dwnews","euronews","elpais","rtvenoticias","europapress","wartranslated","KyivIndependent_official","Faytuks","sentdefender","IntelDoge","GeoConfirmed","QudsNen","nexta_live","nexta_tv","UkraineNow","ukrainenowenglish","bellingcat","AFP","afpfr","BreakingNews","disclosetv","WorldNews","worldnewsnow","news_of_the_world","Middle_East_Spectator","warmonitors","CIG_telegram","AuroraIntel","OSINTtechnical","ElijahMagnier","manniefabian","idfofficial","SputnikInt","times_of_israel","haaretzcom","noticias_de_ultima_hora","emergencias112","EMSC_CSEM","earthquake_alert","quakes"];
export default async function handler(req, res) {
  const out = {};
  await Promise.all(CH.map(async (c) => {
    try {
      const r = await fetch(`https://t.me/s/${c}`, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      const t = await r.text();
      const n = (t.match(/tgme_widget_message_text/g) || []).length;
      const times = [...t.matchAll(/datetime="([^"]+)"/g)].map((m) => m[1]);
      out[c] = { s: r.status, n, last: times.at(-1) || null };
    } catch (e) { out[c] = { error: String(e.message || e) }; }
  }));
  const b = await fetch("https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=terremoto&sort=latest&limit=5&lang=es").then(async (r) => ({ s: r.status, j: await r.json() })).catch((e) => ({ e: e.message }));
  out._bsky = { s: b.s, posts: (b.j?.posts || []).map((p) => [p.indexedAt, p.record?.text?.slice(0, 120)]) };
  res.status(200).json(out);
}
