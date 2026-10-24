// Temporary: checks free sources for air and sea accidents.
const URLS = {
  avherald_rss: "https://avherald.com/h?subscribe=rss",
  avherald_rss2: "http://avherald.com/rss",
  asn_rss: "https://aviation-safety.net/rss.php",
  asn_news: "https://news.aviation-safety.net/feed/",
  asn_wiki: "https://aviation-safety.net/wikibase/dblist.php?Country=&sorteer=datekey_desc",
  gnews_air: "https://news.google.com/rss/search?q=%22plane+crash%22+when:2d&hl=en-US&gl=US&ceid=US:en",
  gnews_es: "https://news.google.com/rss/search?q=%22accidente+a%C3%A9reo%22+OR+naufragio+when:2d&hl=es&gl=ES&ceid=ES:es",
  bing_air: "https://www.bing.com/news/search?q=plane+crash&format=rss",
  gdelt_doc: "https://api.gdeltproject.org/api/v2/doc/doc?query=%22plane%20crash%22&mode=artlist&format=json&maxrecords=5&timespan=2d",
  gcaptain: "https://gcaptain.com/feed/",
  maritime_exec: "https://maritime-executive.com/articles.rss",
  marinelink: "https://www.marinelink.com/news/rss",
  safety4sea: "https://safety4sea.com/feed/",
};
export default async function handler(req, res) {
  const out = {};
  await Promise.all(Object.entries(URLS).map(async ([k, u]) => {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" }, signal: AbortSignal.timeout(10000) });
      const t = await r.text();
      const titles = [...t.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)].slice(1, 6).map((m) => m[1].slice(0, 110));
      out[k] = { s: r.status, len: t.length, titles: titles.length ? titles : t.slice(0, 200) };
    } catch (e) { out[k] = { error: String(e.message || e) }; }
  }));
  res.status(200).json(out);
}
