// World Alert bridge: returns the requested sources as one normalized list.
import { collect } from "./_sources.js";
import { checkTelegram } from "./_social.js";

export default async function handler(req, res) {
  const q = req.query || {};
  // ?tgcheck=<channel> checks a Telegram channel before Ajustes adds it.
  if (q.tgcheck) {
    let out;
    try { out = await checkTelegram(q.tgcheck); } catch (e) { out = { ok: false, error: `Telegram no respondió (${e.message}).` }; }
    res.setHeader("Cache-Control", "s-maxage=300");
    return res.status(200).json(out);
  }
  const feed = await collect(q);
  if (q.compact) for (const e of feed.events) if (e.desc) e.desc = e.desc.slice(0, 220);
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  res.status(200).json(feed);
}
