# tools — izgradnja podataka o stajalištima i rutama

Ove skripte proizvode `app/js/routes.js`. Pokreću se iz mape `tools/`
(`node <skripta>.js`), redom, i trebaju internet. Osim Node.js-a nema
ovisnosti.

Izvor istine je `data/stops.json` — prijepis službenog popisa lokacija
autobusnih stajališta (EY, kolovoz 2026.) iz `nove_slike/`: za svaku liniju
i smjer oznaka stajališta, ulica s kućnim brojem, naselje i vrsta.

## Redoslijed

| # | skripta | radi | zapisuje |
|---|---------|------|----------|
| 1 | `overpass.js` | dohvaća adresne točke i geometriju imenovanih cesta iz OSM-a | `data/addr.json`, `data/streets.json` |
| 2 | `places.js` | dohvaća centroide naselja iz OSM-a | `data/places.json` |
| 3 | `geocode.js` | geokodira svaku adresu Nominatimom (1 upit/s) | `data/geo.json` |
| 4 | `resolve3.js` | pridružuje adrese geometriji ulica i računa koordinate | `data/pos.json` |
| 5 | `build.js` | ručni ispravci, nazivi stajališta, ruta po cestama (OSRM) | `data/routes-new.json` |
| 6 | `emit.js` | spaja s noćnom linijom i piše aplikacijski modul | `app/js/routes.js` |

Koraci 1–3 dohvaćaju s mreže i sporo su (geokodiranje traje oko dvije
minute). Ako su njihovi izlazi u `data/` već tu, dovoljno je pokrenuti
4 → 5 → 6.

## Kako `resolve3.js` određuje položaj

Nominatim za većinu adresa vraća centroid ulice, ne kućni broj, pa se
koordinate izvode iz geometrije:

1. Segmenti ceste s istim imenom spoje se u **povezane komponente** (krajevi
   bliži od 40 m). Tako se razlikuju istoimene ulice u različitim naseljima.
2. Za svaku skupinu (ulica + naselje) bira se jedna komponenta — ona najbliža
   centroidu naselja i susjednim stajalištima na ruti.
3. **Relaksacija**: svako stajalište iterativno se pomiče na točku svoje ulice
   najbližu težištu susjednih stajališta u redoslijedu vožnje.
4. Stajališta na istoj ulici razmaknu se **po kućnom broju** duž osi ulice,
   ali samo kad se brojevi bitno razlikuju (razlika ≥ 15 i omjer ≥ 2);
   inače se spoje u jedan par A/B. Orijentaciju bira ona koja daje kraću
   ukupnu rutu.

Adrese koje Nominatim razriješi na zgradu ili objekt (a ne na cestu)
fiksiraju se i ne pomiču.

## Ručni ispravci

U `build.js`, s obrazloženjem uz svaki unos:

- **Ulice kojih nema u OSM-u** — Đure Dečaka (Čarobna šuma), Franje Fujsa,
  Đure Baričeka. Položaj je procijenjen iz susjednih stajališta i shema.
- **Osječka** — manji kućni broj je bliže centru, veći prema Čemernici.
- **Bilogorska u Golu Brdu** — ima numeraciju odvojenu od one u Svetom Đurađu.
- **Sv. Mihovila 5** — povratni par stajališta Sv. Mihovila 22, ne okretišta.

Tu je i tablica naziva stajališta (`NAME`), usklađena sa shemama linija.
Adresa se u aplikaciji svejedno prikazuje uz naziv.

## Točnost

Red veličine 50–150 m. Trajno bolje rješenje je unijeti stvarna stajališta u
OpenStreetMap kao `highway=bus_stop`.
