// Dump the raw HTML of the teletext content block, to write the parser against it.
for (const p of ["noticias/102", "noticias/103", "noticias/120"]) {
  const t = await (await fetch(`https://www.rtve.es/teletexto/${p}/`, { headers: { "user-agent": "Mozilla/5.0" } })).text();
  const a = t.indexOf("desear navegar"), b = t.indexOf("Atajos r", a);
  console.log(`\n==== ${p}\n` + t.slice(a, b).replace(/\n\s*\n+/g, "\n").slice(0, 9000));
}
