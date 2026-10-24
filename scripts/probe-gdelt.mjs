// Throwaway probe: shows the shape of a GDELT export file so the column mapping can be checked.
import { inflateRawSync } from "node:zlib";
const B = "http://data.gdeltproject.org/gdeltv2/";
const last = await (await fetch(B + "lastupdate.txt")).text();
console.log(last);
const stamp = last.match(/(\d{14})\.export\.CSV\.zip/)[1];
const buf = Buffer.from(await (await fetch(`${B}${stamp}.export.CSV.zip`)).arrayBuffer());
const nameLen = buf.readUInt16LE(26), extraLen = buf.readUInt16LE(28);
const csv = inflateRawSync(buf.subarray(30 + nameLen + extraLen)).toString("utf8");
const rows = csv.split("\n").filter(Boolean).map((l) => l.split("\t"));
console.log("rows", rows.length, "fields", [...new Set(rows.map((r) => r.length))]);
const counts = {};
for (const r of rows) counts[r[28]] = (counts[r[28]] || 0) + 1;
console.log("f[28] values", JSON.stringify(counts));
for (const r of rows.slice(0, 2)) console.log(r.map((v, i) => i + "=" + v).join(" | "));
const viol = rows.filter((r) => ["18", "19", "20"].includes(r[28]));
console.log("viol rows", viol.length);
for (const r of viol.slice(0, 3)) console.log(JSON.stringify({ root: r[28], code: r[26], art: r[33], place: r[r.length - 9], lat: r[r.length - 5], lon: r[r.length - 4], added: r[r.length - 2], url: r[r.length - 1] }));
