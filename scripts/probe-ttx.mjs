// Probe RTVE web teletext and RTVE feeds from a GitHub runner.
const urls = (process.env.TTX_URLS || [
  'https://www.rtve.es/television/teletexto/100/',
  'https://www.rtve.es/television/teletexto/101/',
  'https://www.rtve.es/television/teletexto/190/',
  'https://www.rtve.es/rss/temas_noticias.xml',
  'https://www.rtve.es/api/noticias.json',
  'https://www.rtve.es/robots.txt',
].join(' ')).split(/\s+/).filter(Boolean);
const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
for (const u of urls) {
  console.log('\n==== ' + u);
  try {
    const r = await fetch(u, { headers: { 'user-agent': ua }, redirect: 'follow' });
    const t = await r.text();
    console.log('HTTP', r.status, r.headers.get('content-type'), t.length + 'B', 'final', r.url);
    const refs = [...new Set([...t.matchAll(/(?:href|src|data-[a-z-]+)=["']([^"']+)["']/g)].map(m => m[1])
      .filter(s => /teletexto|ttx|api|json|xml|rss|\.js/i.test(s)))].slice(0, 80);
    console.log('REFS', refs.join('\n  '));
    const urlsInJs = [...new Set([...t.matchAll(/https?:\/\/[^"'\s<>]*(?:teletexto|ttx|api)[^"'\s<>]*/gi)].map(m => m[0]))].slice(0, 40);
    console.log('INLINE URLS', urlsInJs.join('\n  '));
    const text = t.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log('TEXT', text.slice(0, 3000));
  } catch (e) { console.log('ERR', e.message); }
  await new Promise(r => setTimeout(r, 3000));
}
