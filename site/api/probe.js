// Temporary: checks the Esri World Imagery metadata service.
export default async function handler(req, res) {
  const out = {};
  const base = "https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata/MapServer";
  const urls = {
    meta_root: "https://metadata.maptiles.arcgis.com/arcgis/rest/services?f=json",
    svc_root: "https://services.arcgisonline.com/arcgis/rest/services?f=json",
    wi_info: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer?f=json",
    wi_identify: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/identify?geometry=-3.70,40.42&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=1&mapExtent=-3.8,40.35,-3.6,40.5&imageDisplay=800,600,96&returnGeometry=false&f=json",
  };

  for (const [k, u] of Object.entries(urls)) {
    try { const r = await fetch(u, { signal: AbortSignal.timeout(10000) }); const t = await r.text(); out[k] = { s: r.status, cors: r.headers.get("access-control-allow-origin"), body: t.slice(0, 3000) }; }
    catch (e) { out[k] = { error: e.message }; }
  }
  res.status(200).json(out);
}
