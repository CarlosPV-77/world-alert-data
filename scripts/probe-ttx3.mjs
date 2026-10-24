// Print the RSS terms section of the RTVE legal notice.
const r = await fetch('https://www.rtve.es/comunes/aviso_legal.html', { headers: { 'user-agent': 'Mozilla/5.0' } });
const t = new TextDecoder('latin1').decode(await r.arrayBuffer()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const i = t.indexOf('CONDICIONES LEGALES DEL SERVICIO RSS');
console.log(t.slice(i, i + 4000));
