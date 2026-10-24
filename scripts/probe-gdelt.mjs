// Throwaway probe: which request shapes does GDELT's file host answer with 200?
const u = "http://data.gdeltproject.org/gdeltv2/20261024000000.export.CSV.zip";
const variants = {
  plain: {},
  worldalert: { "User-Agent": "WorldAlert/1.0 (personal hazard map)" },
  curlUA: { "User-Agent": "curl/8.5.0" },
  identity: { "Accept-Encoding": "identity" },
  curlLike: { "User-Agent": "curl/8.5.0", "Accept-Encoding": "identity", Accept: "*/*" },
};
for (const [k, h] of Object.entries(variants)) {
  try { const r = await fetch(u, { headers: h }); console.log(k, r.status, r.headers.get("server"), r.headers.get("content-length")); }
  catch (e) { console.log(k, "ERR", e.message, e.cause?.code); }
  await new Promise((r) => setTimeout(r, 2000));
}
const https = await import("node:http");
await new Promise((res) => https.get(u, (r) => { console.log("node:http", r.statusCode, r.headers.server); r.resume(); r.on("end", res); }).on("error", (e) => { console.log("node:http ERR", e.message); res(); }));
