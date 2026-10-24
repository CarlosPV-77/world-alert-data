// Second pass: RTVE teletext article pages, service pages and RSS candidates.
const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const dec = s => s.replace(/&nbsp;/g, ' ').replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, '&');
const strip = t => dec(t.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
async function get(u) {
  const r = await fetch(u, { headers: { 'user-agent': ua } });
  const t = await r.text();
  console.log('\n==== ' + u + '\nHTTP', r.status, r.headers.get('content-type'), t.length + 'B', 'lm', r.headers.get('last-modified'), 'cache', r.headers.get('cache-control'));
  return t;
}
const body = (t, a = 'Código de la página', n = 1800) => { const s = strip(t); const i = s.indexOf(a); return s.slice(i < 0 ? 0 : i, (i < 0 ? 0 : i) + n); };
for (const p of ['noticias/103', 'noticias/124', 'noticias/102', 'noticias/120', 'sos/598', 'riesgo-incendios/540', 'trafico/600', 'tiempo/301', 'prensa/185']) {
  try { const t = await get('https://www.rtve.es/teletexto/' + p + '/'); console.log(body(t)); } catch (e) { console.log('ERR', e.message); }
  await new Promise(r => setTimeout(r, 2000));
}
try { const t = await get('https://www.rtve.es/mod_pf_teletexto'); console.log(t.slice(0, 800)); } catch (e) { console.log('ERR', e.message); }
try { const t = await get('https://js.rtve.es/pages/pf-teletexto/2.12.2/js/config'); console.log(t.slice(0, 2500)); } catch (e) { console.log('ERR', e.message); }
try {
  const t = await get('https://www.rtve.es/noticias/');
  console.log('RSS LINKS', [...new Set([...t.matchAll(/["'](https?:\/\/[^"']*?(?:\.rss|\.xml|rss)[^"']*)["']/gi)].map(m => m[1]))].slice(0, 30).join('\n  '));
} catch (e) { console.log('ERR', e.message); }
for (const u of ['https://www.rtve.es/api/noticias.rss', 'https://www.rtve.es/api/tematicas/1144/noticias.rss', 'https://www.rtve.es/rss/', 'https://www.rtve.es/sitemaps/sitemaps-news.xml']) {
  try { const t = await get(u); console.log(strip(t).slice(0, 900)); } catch (e) { console.log('ERR', e.message); }
}
try { const t = await get('https://www.rtve.es/comunes/aviso_legal.html'); console.log(body(t, 'propiedad', 2500)); } catch (e) { console.log('ERR', e.message); }
