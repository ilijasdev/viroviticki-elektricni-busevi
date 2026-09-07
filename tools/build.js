const fs = require('fs');
const DATA = JSON.parse(fs.readFileSync('data/stops.json','utf8'));
const POS  = JSON.parse(fs.readFileSync('data/pos.json','utf8'));

/* Ručni ispravci — slučajevi koje automatika ne može razriješiti.
   Utemeljeni na EY shemama linija (nove_slike/) i redoslijedu rute. */
const OVERRIDE = {
  // Osječka: manji kućni broj je bliže centru, veći prema Čemernici
  'Osječka ulica 133|Virovitica'               : [45.81780, 17.43060],
  'Osječka ulica 54|Virovitica'                : [45.82337, 17.40663],
  // Bilogorska u Golu Brdu ima vlastitu numeraciju, odvojenu od one u Sv. Đurađu
  'Bilogorska ulica 88|Golo Brdo'              : [45.82942, 17.32482], // okretište Golo Brdo
  'Bilogorska ulica 4|Golo Brdo'               : [45.82690, 17.33200], // par uz Tavelića 89
  // Mihovila 5 je povratni par stajališta Mihovila 22, ne uz okretište
  'Ulica svetog Mihovila 5|Rezovačke Krčevine' : [45.79281, 17.39749],
};
Object.assign(POS, OVERRIDE);

/* Nazivi stajališta — prema shemama EY; adresa ostaje uz naziv u aplikaciji. */
const NAME = {
  'Ulica 30. svibnja 29A|Milanovac'             : 'Milanovac okretište',
  'Ulica 30. svibnja 3|Milanovac'               : 'Milanovac',
  'Ulica 30. svibnja 4|Milanovac'               : 'Milanovac',
  'Ulica Vatroslava Lisinskog 6|Virovitica'     : 'Vatroslava Lisinskog',
  'Ulica Vatroslava Lisinskog 1|Virovitica'     : 'Vatroslava Lisinskog',
  'Ulica Vatroslava Lisinskog 172|Virovitica'   : 'Sv. Križa',
  'Ulica Vatroslava Lisinskog 170|Virovitica'   : 'Sv. Križa',
  'Ulica Zlatnog polja 63|Virovitica'           : 'Zlatnog polja',
  'Ulica Zlatnog polja 82|Virovitica'           : 'Zlatnog polja',
  'Vukovarska cesta|Virovitica'                 : 'Vukovarska',
  'Ulica Zbora narodne garde 29|Virovitica'     : 'Zbora narodne garde',
  'Ulica Zbora narodne garde 4|Virovitica'      : 'Zbora narodne garde',
  'Ulica Nikole Tesle 4|Virovitica'             : 'COOR',
  'Ulica Tomaša Masaryka 21|Virovitica'         : 'Masarykova',
  'Ulica Tomaša Masaryka 22|Virovitica'         : 'Masarykova',
  'Ulica Tomaša Masaryka 3|Virovitica'          : 'Masarykova - sjever',
  'Trg bana Josipa Jelačića 6|Virovitica'       : 'Trg bana J. Jelačića',
  'Trg Ljudevita Patačića 3|Virovitica'         : 'Trg Lj. Patačića',
  'Ulica Ferde Rusana 20|Virovitica'            : 'Autobusni kolodvor',
  'Ulica Ferde Rusana 26|Virovitica'            : 'Autobusni kolodvor',
  'Ulica Matije Gupca 65|Virovitica'            : 'Matije Gupca',
  'Ulica Vlahe Bukovca 13|Virovitica'           : 'III. OŠ',
  'Ulica kardinala Franje Kuharića 1|Čemernica' : 'Čemernica okretište',
  'Osječka ulica 133|Virovitica'                : 'Osječka',
  'Osječka ulica 54|Virovitica'                 : 'Osječka',
  'Ulica Stjepana Radića 149|Virovitica'        : 'Željeznički kolodvor',
  'Ulica Stjepana Radića 118A|Virovitica'       : 'Željeznički kolodvor',
  'Ulica Đure Dečaka|Virovitica'                : 'Čarobna šuma',
  'Ulica Josipa Jurja Strossmayera 36|Virovitica': 'Strossmayerova',
  'Ulica Josipa Jurja Strossmayera 37|Virovitica': 'Strossmayerova',
  'Vinogradska ulica 2|Virovitica'              : 'Vinogradska',
  'Vinogradska ulica 7|Virovitica'              : 'Vinogradska',
  'Vinogradska ulica 50|Virovitica'             : 'Preradovićeva',
  'Vinogradska ulica 83|Virovitica'             : 'Preradovićeva',
  'Ulica Franje Fujsa 42|Virovitica'            : 'Gradsko groblje',
  'Zagrebačka ulica 66|Virovitica'              : 'Zagrebačka',
  'Bilogorska ulica 88|Golo Brdo'               : 'Golo Brdo okretište',
  'Bilogorska ulica 4|Golo Brdo'                : 'Sv. Petra i Pavla',
  'Ulica svetog Nikole Tavelića 89|Podgorje'    : 'Sv. Petra i Pavla',
  'Ulica svetog Nikole Tavelića 33|Podgorje'    : 'Nikole Tavelića',
  'Ulica svetog Nikole Tavelića 24|Podgorje'    : 'Nikole Tavelića',
  'Ulica svetog Nikole Tavelića 4|Podgorje'     : 'Podgorje',
  'Vinogradska ulica 4|Podgorje'                : 'Podgorje',
  'Bilogorska ulica 46|Sveti Đurađ'             : 'Bilogorska',
  'Bilogorska ulica 41|Sveti Đurađ'             : 'Bilogorska',
  'Mlinska ulica 1|Sveti Đurađ'                 : 'Sveti Đurađ',
  'Ulica Antunovac 25|Virovitica'               : 'Antunovac',
  'Ulica Đure Baričeka 38|Virovitica'           : 'Đure Baričeka',
  'Ulica Ivana Gundulića 60|Virovitica'         : 'Gundulićeva',
  'Ulica Ivana Gundulića 67|Virovitica'         : 'Gundulićeva',
  'Ulica dr. Andrije Štampara 22|Virovitica'    : 'Andrije Štampara',
  'Ulica Sajmište 2|Virovitica'                 : 'Sajmište',
  'Vinkovačka cesta 10|Virovitica'              : 'Vinkovačka',
  'Vinkovačka cesta 13|Virovitica'              : 'Vinkovačka',
  'Ulica Novi Rezovac 8|Virovitica'             : 'Novi Rezovac',
  'Ulica Novi Rezovac 1|Virovitica'             : 'Novi Rezovac',
  'Ulica Lanište 2|Rezovac'                     : 'Rezovac okretište',
  'Ulica Rezovački vinogradi 22|Rezovac'        : 'Rezovački vinogradi',
  'Ulica Rezovački vinogradi 29|Rezovac'        : 'Rezovački vinogradi',
  'Ulica svetog Mihovila 22|Rezovačke Krčevine' : 'Sv. Mihovila',
  'Ulica svetog Mihovila 5|Rezovačke Krčevine'  : 'Sv. Mihovila',
  'Ulica svetog Mihovila 78|Rezovačke Krčevine' : 'Rezovačke Krčevine',
};

const missing = [];
for (const L in DATA) for (const d in DATA[L]) for (const s of DATA[L][d].stops) {
  const k = s[1] + '|' + s[2];
  if (!NAME[k]) missing.push(k);
  if (!POS[k])  missing.push('POS ' + k);
}
if (missing.length) { console.error('NEDOSTAJE:', [...new Set(missing)]); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function osrm(coords) {
  const s = coords.map(c => c[1] + ',' + c[0]).join(';');
  const url = 'https://router.project-osrm.org/route/v1/driving/' + s +
              '?overview=full&geometries=geojson&continue_straight=true';
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (j.code === 'Ok') return j.routes[0];
    } catch (e) { /* pokušaj ponovno */ }
    await sleep(1500);
  }
  return null;
}

(async () => {
  const OUT = {};
  for (const L in DATA) {
    OUT[L] = {};
    for (const d in DATA[L]) {
      const dir = DATA[L][d];
      const stops = dir.stops.map(s => ({
        code : s[0],
        name : NAME[s[1] + '|' + s[2]],
        addr : s[1],
        place: s[2],
        kind : s[3],
        ll   : POS[s[1] + '|' + s[2]]
      }));
      await sleep(1200);
      const r = await osrm(stops.map(s => s.ll));
      const path = r ? r.geometry.coordinates.map(c => [ +c[1].toFixed(5), +c[0].toFixed(5) ])
                     : stops.map(s => s.ll);
      OUT[L][d] = {
        from: dir.from, to: dir.to, code: dir.code,
        km : r ? +(r.distance / 1000).toFixed(1) : null,
        min: r ? Math.round(r.duration / 60) : null,
        stops, path
      };
      console.log('Linija ' + L + ' smjer ' + d + ': ' + stops.length + ' stajalista, ' +
                  OUT[L][d].km + ' km, ' + OUT[L][d].min + ' min voznje, ' + path.length + ' tocaka');
    }
  }
  fs.writeFileSync('data/routes-new.json', JSON.stringify(OUT));
  console.log('\nroutes-new.json zapisan, ' + (fs.statSync('data/routes-new.json').size / 1024 | 0) + ' KB');
})();
