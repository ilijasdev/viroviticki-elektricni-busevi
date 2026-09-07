# Virovitički električni autobusi — web aplikacija

Statična web aplikacija (HTML + CSS + vanilla JavaScript). Nema buildanja,
frameworka ni API ključeva.

Sučelje je radna ploha koja stane u jedan zaslon: gore filtar linija, ispod
tri plohe — stajališta, karta i polasci. Na uskim zaslonima plohe se izmjenjuju
donjom trakom.

## Pokretanje

Otvori `index.html` u pregledniku ili posluži mapu lokalnim serverom
(preporučeno, zbog geolokacije i keširanja):

    python -m http.server 8000

pa otvori http://localhost:8000

Za objavu prekopiraj cijelu mapu `app/` na bilo koji statični hosting
(GitHub Pages, Netlify, Nginx…).

## Struktura

    index.html            ljuska: zaglavlje, tri plohe, svjetlosni okvir
    css/style.css         stilovi, tokeni, tamna tema, prijelomne točke
    js/data.js            linije, opisi, RADNO VRIJEME, CIJENE KARATA  ← ovdje se uređuje
    js/routes.js          stajališta, adrese i geometrija ruta (GENERIRANO)
    js/app.js             stanje, prikazi i karta
    img/                  fotografija autobusa + službene sheme linija
    vendor/leaflet/       Leaflet 1.9.4 (BSD-2), lokalno

## Sučelje

- **Filtar linija** (vrh) — `Sve linije`, `1`, `2`, `3`, `Noćna`. Uz svaku
  liniju piše radno vrijeme. Tipke `0`–`3` i `N` prebacuju linije, `/`
  skače u tražilicu.
- **Stajališta** (lijevo) — redom vožnje za odabranu liniju, s oznakom
  stajališta (npr. `I12`), adresom i vrstom (stajalište / ugibalište /
  okretište). Prekidač smjera A/B je iznad popisa. U pregledu `Sve linije`
  popis je abecedni indeks svih stajališta s pilulama linija. Zvjezdica
  sprema favorite (localStorage), tipka ★ filtrira samo njih.
- **Karta** (sredina) — Leaflet + OpenStreetMap. Klik na stajalište u popisu
  približava kartu i otvara oblačić; prelazak mišem osvjetljava marker.
- **Polasci** (desno) — radno vrijeme linije, podaci o liniji sa službenom
  shemom (klik → puni zaslon) i cjenik karata. Kad se u `js/data.js` upišu
  stvarna vremena polazaka, ovdje se pojave i oni.
- **U blizini** — geolokacija; popis se pretvara u deset najbližih stajališta
  s udaljenostima.

## Podaci

### Stajališta i rute

Redoslijed stajališta po smjerovima, njihove adrese (ulica i kućni broj),
oznake (`S1`, `J13`, `Z11/I1`, `I20/Z4`…) i vrsta preuzeti su iz službenog
popisa lokacija autobusnih stajališta (EY, kolovoz 2026.), zajedno s
grafičkim shemama linija u `img/`.

Koordinate su izvedene tako da su te adrese pridružene geometriji ulica iz
OpenStreetMapa: kandidati su ograničeni na naselje iz adrese, položaj se
odredi relaksacijom po redoslijedu rute, a stajališta na istoj ulici razmaknu
se po kućnom broju. Točnost je reda veličine 50–150 m. Nekoliko slučajeva
koje automatika ne može razriješiti (ulice kojih nema u OSM-u — Đure Dečaka,
Franje Fujsa, Đure Baričeka — te vlastita numeracija Bilogorske u Golu Brdu)
upisano je ručno. Vožnja po cestama izračunata je OSRM-om.

Najbolje trajno rješenje: unijeti stvarna stajališta u OpenStreetMap
(`highway=bus_stop`) — tada ih dobiva i ova aplikacija i svi ostali.

### Vozni red — namjerno ga nema

Službena vremena polazaka po stajalištima još nisu objavljena. Aplikacija
zato **ne prikazuje i ne izračunava** pojedinačna vremena — prikazuje samo
ono što je Grad objavio, u polju `hours` svake linije:

    hours: { when: "6:00 – 22:30", freq: "otprilike svakih 45 min", days: "svaki dan" }

Kad službeni vozni red stigne, dodaj liniji polje `schedule` sa stvarnim
vremenima po danima. Aplikacija ga tada sama prikaže i počne računati
sljedeći polazak:

    schedule: {
      radni:    ["06:00", "06:45", "07:30"],
      subota:   ["07:00", "08:00"],
      nedjelja: []
    }

Nemoj generirati vremena iz razmaka — bolje je nemati ih nego imati
izmišljena.

### Cijene karata

Službeni cjenik Grada Virovitice, u `js/data.js` (`FARES`).

## Licence i izvori

- Karta, ulice i geokodiranje: **© OpenStreetMap** suradnici, licenca **ODbL**.
  Atribucija je vidljiva na karti i mora ostati.
- Rute po cestama: **OSRM** nad OSM podacima.
- **Leaflet 1.9.4** — BSD-2-Clause.
- Sheme linija (`img/shema-*.jpg`) — izvor: EYS.

## Što još treba

1. **Službeni vozni red** — dodati `schedule` po liniji (vidi gore).
2. **Točne koordinate stajališta** — najbolje kroz OpenStreetMap.
3. **Noćna linija** — njezina ruta i stajališta još su iz starije sheme
   (`img/shema-n.jpg`) i nisu dio novog službenog popisa.
