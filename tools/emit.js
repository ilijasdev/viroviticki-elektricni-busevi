/* Sastavlja app/js/routes.js iz routes-new.json (linije 1-3) i stare
   geometrije noćne linije iz zatečenog routes.js. */
const fs = require('fs');
const path = require('path');

const APP = require('path').join(__dirname, '..', 'app');
const NEW = JSON.parse(fs.readFileSync('data/routes-new.json', 'utf8'));

/* stara noćna linija */
const oldSrc = fs.readFileSync(path.join(APP, 'js/routes.js'), 'utf8');
const OLD = new Function(oldSrc + '; return ROUTES;')();
// skripta se smije pokretati više puta: noćna je ili u starom obliku
// (ROUTES.n.stops) ili u već pretvorenom (ROUTES.n.A.stops)
const n = OLD.n.stops ? OLD.n : OLD.n.A;

/* Noćna shema je starija i dio stajališta zove drukčije nego novi
   službeni popis. Ujednačavamo nazive da se isto stajalište u
   aplikaciji ne pojavljuje dvaput. */
const NIGHT_RENAME = {
  'Čemernica'     : 'Čemernica okretište',
  'Jože Jurišića' : 'Strossmayerova'
};

NEW.n = {
  A: {
    from: n.stops[0].name,
    to  : n.stops[n.stops.length - 1].name,
    code: 'N',
    km  : n.km || null,
    min : n.min || null,
    stops: n.stops.map((s, i) => ({
      code : 'N' + (i + 1),
      name : NIGHT_RENAME[s.name] || s.name,
      addr : '',
      place: 'Virovitica',
      kind : (i === 0 || i === n.stops.length - 1) ? 'okretiste' : 'stajaliste',
      ll   : s.ll
    })),
    path: n.path
  }
};

const head = `/* =============================================================
   Rute, stajališta i geometrija — GENERIRANO, ne uređuj ručno.

   Stajališta i njihov redoslijed po smjerovima preuzeti su iz službenog
   popisa lokacija stajališta (EY, kolovoz 2026.) — naziv ulice i kućni broj
   za svako stajalište. Koordinate su dobivene pridruživanjem tih adresa
   geometriji ulica iz OpenStreetMapa, pa su približne (red veličine 50-150 m).
   Geometrija vožnje po cestama izračunata je OSRM-om.

   Struktura:  ROUTES[idLinije][smjer] = { from, to, code, km, min, stops[], path[] }
               stops[] = { code, name, addr, place, kind, ll }
   ============================================================= */
const ROUTES = `;

fs.writeFileSync(path.join(APP, 'js/routes.js'), head + JSON.stringify(NEW) + ';\n');

let total = 0;
for (const L in NEW) for (const d in NEW[L]) total += NEW[L][d].stops.length;
console.log('routes.js zapisan:', (fs.statSync(path.join(APP, 'js/routes.js')).size / 1024 | 0), 'KB');
console.log('linije:', Object.keys(NEW).join(', '), '| ukupno unosa stajalista:', total);
for (const L in NEW) for (const d in NEW[L])
  console.log('  ' + L + '/' + d + ': ' + NEW[L][d].stops.length + ' stajalista, ' +
              NEW[L][d].km + ' km, ' + NEW[L][d].min + ' min');
