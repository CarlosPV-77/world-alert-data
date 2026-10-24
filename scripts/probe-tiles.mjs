// Throwaway: saves a few OpenFreeMap tiles and glyphs to the "testdata" branch for offline map tests.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const D = "/tmp/td";
const tj = await (await fetch("https://tiles.openfreemap.org/planet")).json();
mkdirSync(D, { recursive: true }); writeFileSync(`${D}/planet.json`, JSON.stringify(tj));
const tpl = tj.tiles[0];
const want = [];
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z), lat2y = (lat, z) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z);
const box = (z, w, s, e, n) => { for (let x = lon2x(w, z); x <= lon2x(e, z); x++) for (let y = lat2y(n, z); y <= lat2y(s, z); y++) want.push([z, x, y]); };
box(2, -30, 20, 50, 70); box(3, -20, 25, 40, 60); box(4, -12, 34, 6, 45); box(5, -10, 35, 5, 44); box(6, -10, 35.5, 4.5, 44); box(7, -5, 39, -2.5, 41.5); box(8, -4.2, 40, -3.2, 40.8); box(9, -3.9, 40.2, -3.4, 40.6); box(10, -3.8, 40.3, -3.5, 40.55);
console.log("tiles", want.length);
for (const [z, x, y] of want) {
  const r = await fetch(tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y));
  mkdirSync(`${D}/t/${z}/${x}`, { recursive: true }); writeFileSync(`${D}/t/${z}/${x}/${y}.pbf`, Buffer.from(await r.arrayBuffer()));
}
for (const font of ["Noto Sans Regular", "Noto Sans Bold", "Noto Sans Italic"]) for (const range of ["0-255", "256-511", "8192-8447"]) {
  const r = await fetch(`https://tiles.openfreemap.org/fonts/${encodeURIComponent(font)}/${range}.pbf`);
  mkdirSync(`${D}/fonts/${font}`, { recursive: true }); writeFileSync(`${D}/fonts/${font}/${range}.pbf`, Buffer.from(await r.arrayBuffer()));
  console.log(font, range, r.status);
}
execSync(`cd ${D} && git init -q -b testdata && git add . && git -c user.name=bot -c user.email=bot@users.noreply.github.com commit -qm testdata && git push -qf "$(cd $GITHUB_WORKSPACE && git config --get remote.origin.url)" testdata`, { stdio: "inherit", env: { ...process.env, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader", GIT_CONFIG_VALUE_0: execSync("cd $GITHUB_WORKSPACE && git config --get http.https://github.com/.extraheader").toString().trim() } });
console.log("pushed");
