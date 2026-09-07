const fs = require('fs');
const DATA = JSON.parse(fs.readFileSync('data/stops.json','utf8'));
const UA = { 'User-Agent': 'virovitica-bus-webapp/1.0 (open data, local build)' };
const VIEWBOX = '17.26,45.88,17.50,45.74'; // lon1,lat1,lon2,lat2
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function nom(params) {
  const url = 'https://nominatim.openstreetmap.org/search?' + params + '&format=jsonv2&limit=1&countrycodes=hr';
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return null;
  const j = await r.json();
  return j && j[0] ? { ll: [+(+j[0].lat).toFixed(5), +(+j[0].lon).toFixed(5)], why: j[0].display_name, cls: j[0].category + '/' + j[0].type } : null;
}

// razlomi adresu na ulicu + kućni broj
function split(addr) {
  const m = addr.match(/^(.*?)\s+(\d+[A-Za-z]?)$/);
  return m ? { street: m[1], nr: m[2] } : { street: addr, nr: '' };
}

async function geocode(addr, place) {
  const { street, nr } = split(addr);
  const attempts = [];
  if (nr) attempts.push(`street=${encodeURIComponent(nr + ' ' + street)}&city=${encodeURIComponent(place)}`);
  if (nr) attempts.push(`q=${encodeURIComponent(addr + ', ' + place + ', Hrvatska')}&viewbox=${VIEWBOX}&bounded=1`);
  attempts.push(`q=${encodeURIComponent(street + ', ' + place + ', Hrvatska')}&viewbox=${VIEWBOX}&bounded=1`);
  attempts.push(`q=${encodeURIComponent(street + ', Virovitica, Hrvatska')}&viewbox=${VIEWBOX}&bounded=1`);
  for (let i = 0; i < attempts.length; i++) {
    await sleep(1100);
    try {
      const hit = await nom(attempts[i]);
      if (hit) return { ...hit, tier: i };
    } catch (e) { /* pokušaj sljedeći */ }
  }
  return null;
}

(async () => {
  const uniq = new Map();
  for (const L in DATA) for (const d in DATA[L]) for (const s of DATA[L][d].stops) {
    const key = s[1] + '|' + s[2];
    if (!uniq.has(key)) uniq.set(key, { addr: s[1], place: s[2] });
  }
  const out = {};
  let i = 0;
  for (const [key, v] of uniq) {
    i++;
    const hit = await geocode(v.addr, v.place);
    out[key] = hit;
    console.log(`${String(i).padStart(2)}/${uniq.size} [t${hit ? hit.tier : '-'}] ${key}  ->  ${hit ? hit.ll.join(',') + '  ' + hit.cls : 'NEMA'}`);
    fs.writeFileSync('data/geo.json', JSON.stringify(out, null, 1));
  }
  console.log('GOTOVO. Neuspjeli:', Object.entries(out).filter(([, v]) => !v).map(([k]) => k).join(' ; ') || 'nijedan');
})();
