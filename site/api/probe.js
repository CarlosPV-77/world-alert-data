// Temporary: checks which social sources answer from Vercel without an account.
const URLS = {
  mastodon: "https://mastodon.social/api/v1/timelines/tag/earthquake?limit=3",
  mastodon_es: "https://mastodon.social/api/v1/timelines/tag/terremoto?limit=3",
  bsky_public: "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=earthquake&limit=3",
  bsky_api: "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=earthquake&limit=3",
  telegram: "https://t.me/s/bbcbreaking",
  reddit_rss: "https://www.reddit.com/r/worldnews/new/.rss",
  reddit_json: "https://www.reddit.com/r/worldnews/new.json?limit=3",
  old_reddit_rss: "https://old.reddit.com/r/worldnews/new/.rss",
};
export default async function handler(req, res) {
  const out = {};
  await Promise.all(Object.entries(URLS).map(async ([k, u]) => {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" }, signal: AbortSignal.timeout(10000) });
      const t = await r.text();
      out[k] = { status: r.status, len: t.length, head: t.slice(0, 300) };
    } catch (e) { out[k] = { error: String(e.message || e) }; }
  }));
  res.status(200).json(out);
}
