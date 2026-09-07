const fs = require('fs');
const BBOX = '45.74,17.26,45.88,17.50';
const UA = { 'User-Agent': 'virovitica-bus-webapp/1.0 (open data, local build)', 'Content-Type': 'text/plain' };
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function ask(q, file) {
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, { method: 'POST', headers: UA, body: q });
      if (!r.ok) { console.log(url, 'HTTP', r.status); continue; }
      const t = await r.text();
      fs.writeFileSync(file, t);
      const j = JSON.parse(t);
      console.log(file, '->', j.elements.length, 'elemenata,', (t.length / 1024 | 0), 'KB');
      return j;
    } catch (e) { console.log(url, 'greška:', e.message); }
  }
  return null;
}

(async () => {
  // 1) adresne točke (kućni brojevi)
  await ask(`[out:json][timeout:120];
    ( nwr["addr:housenumber"]["addr:street"](${BBOX}); );
    out center tags;`, 'data/addr.json');

  // 2) imenovane ceste s geometrijom
  await ask(`[out:json][timeout:120];
    ( way["highway"]["name"](${BBOX}); );
    out geom tags;`, 'data/streets.json');
})();
