# Virovitički električni autobusi

Web aplikacija s linijama, stajalištima, kartom i voznim redom gradskog
prijevoza u Virovitici. Statična stranica — HTML, CSS i vanilla JavaScript,
bez buildanja, frameworka i API ključeva.

Gradski prijevoz na električni pogon krenuo je 7. rujna 2026. na tri dnevne
linije i jednu noćnu.

## Sadržaj

    app/          web aplikacija (ovo se objavljuje)
    tools/        skripte koje grade podatke o stajalištima i rutama
    nove_slike/   službeni popis lokacija stajališta i sheme linija (EY)

Detalji su u [`app/README.md`](app/README.md) (sučelje, uređivanje voznog
reda i cjenika) i [`tools/README.md`](tools/README.md) (kako nastaju
koordinate stajališta).

## Pokretanje lokalno

    cd app
    python -m http.server 8000

pa otvori http://localhost:8000

## Sučelje

Radna ploha koja stane u jedan zaslon: gore filtar linija, ispod tri plohe —
stajališta, karta i polasci. Na uskim zaslonima plohe se izmjenjuju donjom
trakom. Svijetla i tamna tema.

## Podaci

- **Stajališta** — redoslijed po smjerovima, adrese, oznake i vrsta iz
  službenog popisa lokacija autobusnih stajališta (EY, kolovoz 2026.).
- **Koordinate** — izvedene pridruživanjem tih adresa geometriji ulica iz
  OpenStreetMapa; točnost je reda veličine 50–150 m.
- **Rute** — izračunate OSRM-om po OSM cestama.
- **Cijene karata** — službeni cjenik Grada Virovitice.
- **Vozni red** — **okviran**. Službena vremena po stajalištima još nisu
  objavljena, pa se polasci generiraju iz objavljenog okvira (dnevne linije
  približno 6–22:30 svakih 45 minuta, noćna vikendom 22:30–4:50). To je i u
  aplikaciji jasno označeno.

## Licence

- Karta, ulice i geokodiranje: **© OpenStreetMap** suradnici, licenca
  **ODbL**. Atribucija je vidljiva u aplikaciji i mora ostati.
- Rute: **OSRM** nad OSM podacima.
- **Leaflet 1.9.4** — BSD-2-Clause.
- Sheme linija i popis stajališta — izvor: EYS.
