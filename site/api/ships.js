// AIS ships from AISStream (free key, stored in Vercel as AISSTREAM_API_KEY). The stream is a websocket,
// so each call listens for a few seconds inside the requested box and returns the last report of every ship heard.
import WebSocket from "ws";

const STREAM = "wss://stream.aisstream.io/v0/stream";
const KINDS = ["PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport", "ShipStaticData", "StaticDataReport"];
const MAX = 4000;
// "2026-10-24 15:20:01.123456789 +0000 UTC" -> milliseconds.
const utc = (x) => { const m = String(x || "").match(/^(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d)/); return (m && Date.parse(`${m[1]}T${m[2]}Z`)) || Date.now(); };
const num = (x) => (Number.isFinite(+x) ? +x : null);

// AIS ship type codes (ITU-R M.1371) folded into the few kinds the map colours.
function kindOf(t) {
  if (t == null) return null;
  if (t === 30) return "pesca";
  if (t === 35) return "militar";
  if (t === 51 || t === 58) return "rescate";
  if (t >= 60 && t <= 69) return "pasaje";
  if (t >= 70 && t <= 79) return "carga";
  if (t >= 80 && t <= 89) return "petrolero";
  if (t === 36 || t === 37) return "recreo";
  if (t === 31 || t === 32 || t === 52) return "remolcador";
  return "otro";
}

export default async function handler(req, res) {
  const key = process.env.AISSTREAM_API_KEY;
  if (!key) return res.status(503).json({ error: "Falta la clave AISSTREAM_API_KEY en Vercel" });
  let [w, s, e, n] = String(req.query.bbox || "-180,-85,180,85").split(",").map(Number);
  if (![w, s, e, n].every(Number.isFinite)) return res.status(400).json({ error: "bbox no válido" });
  s = Math.max(-90, Math.min(90, s)); n = Math.max(-90, Math.min(90, n));
  if (e - w >= 360) { w = -180; e = 180; }
  w = ((w + 540) % 360) - 180; e = ((e + 540) % 360) - 180;
  // A view across the antimeridian becomes two boxes. AISStream wants [lat, lon] corners.
  const boxes = w <= e ? [[[s, w], [n, e]]] : [[[s, w], [n, 180]], [[s, -180], [n, e]]];
  const secs = Math.max(2, Math.min(12, +req.query.secs || 7));

  const ships = new Map();
  let error = null, msgs = 0;
  await new Promise((done) => {
    const ws = new WebSocket(STREAM);
    const stop = setTimeout(() => ws.terminate(), secs * 1000);
    ws.on("open", () => ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: boxes, FilterMessageTypes: KINDS })));
    ws.on("message", (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.error) { error = String(m.error); ws.terminate(); return; }
      const meta = m.MetaData || {}, mmsi = meta.MMSI;
      if (!mmsi) return;
      msgs++;
      const body = m.Message?.[m.MessageType] || {};
      const sh = ships.get(mmsi) || (ships.size < MAX ? { mmsi } : null);
      if (!sh) return;
      const name = String(meta.ShipName || body.Name || body.ReportA?.Name || "").replace(/@+/g, "").trim();
      if (name) sh.name = name;
      if (m.MessageType === "ShipStaticData") {
        sh.type = body.Type; sh.dest = String(body.Destination || "").replace(/@+/g, "").trim() || undefined;
        sh.call = String(body.CallSign || "").replace(/@+/g, "").trim() || undefined;
        if (body.ImoNumber) sh.imo = body.ImoNumber;
        const d = body.Dimension; if (d) sh.len = (d.A || 0) + (d.B || 0) || undefined;
      } else if (m.MessageType === "StaticDataReport") {
        if (body.ReportB?.ShipType) sh.type = body.ReportB.ShipType;
      } else {
        const lat = num(meta.latitude ?? body.Latitude), lon = num(meta.longitude ?? body.Longitude);
        if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
        Object.assign(sh, { lat, lon, sog: num(body.Sog), cog: num(body.Cog), hdg: body.TrueHeading === 511 ? null : num(body.TrueHeading),
          st: body.NavigationalStatus ?? sh.st, t: utc(meta.time_utc) });
      }
      ships.set(mmsi, sh);
    });
    ws.on("error", (err) => { error = err.message; });
    ws.on("close", () => { clearTimeout(stop); done(); });
  });

  const list = [...ships.values()].filter((x) => x.lat != null).map((x) => ({ ...x, kind: kindOf(x.type) }));
  if (!list.length && error) return res.status(502).json({ error: `AISStream: ${error}` });
  res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
  res.status(200).json({ generated: new Date().toISOString(), secs, msgs, ships: list, error });
}
