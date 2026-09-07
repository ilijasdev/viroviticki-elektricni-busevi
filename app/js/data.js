/* =============================================================
   Virovitički električni autobusi — sadržaj

   Redoslijed stajališta, adrese i geometrija ruta žive u js/routes.js
   (generirano). Ovdje su nazivi linija, boje, opisi, radno vrijeme,
   cijene karata i informativni sadržaj.

   ⚠ Aplikacija NAMJERNO ne prikazuje vremena polazaka.
     Službeni vozni red po stajalištima još nije objavljen, a jedino
     što je Grad objavio je okvir radnog vremena i učestalosti — to je
     u "hours" niže. Ništa se ne izračunava niti pretpostavlja.

     Kad vozni red stigne, vidi "KAKO DODATI VOZNI RED" na dnu datoteke.
   ============================================================= */

/* Datum početka prometovanja — koristi se za oznaku "kreće danas". */
const START_DATE = "2026-09-07";

const LINES = [
  {
    id: "1",
    short: "1",
    name: "Linija 1",
    color: "#1668d6",
    scheme: "img/shema-1.jpg",
    area: "Milanovac — centar — III. OŠ",
    desc: "Povezuje Milanovac i Sv. Križa preko Vukovarske i centra s Autobusnim kolodvorom, " +
          "Matije Gupca i III. osnovnom školom.",
    hours: { when: "6:00 – 22:30", freq: "otprilike svakih 45 min", days: "svaki dan" }
  },
  {
    id: "2",
    short: "2",
    name: "Linija 2",
    color: "#0f9d58",
    scheme: "img/shema-2.jpg",
    area: "Čemernica — centar — Gradsko groblje",
    desc: "Istok–zapad: od okretišta u Čemernici Osječkom i pokraj Željezničkog kolodvora " +
          "kroz centar do Vinogradske, Preradovićeve i Gradskog groblja.",
    hours: { when: "6:00 – 22:30", freq: "otprilike svakih 45 min", days: "svaki dan" }
  },
  {
    id: "3",
    short: "3",
    name: "Linija 3",
    color: "#e8710a",
    scheme: "img/shema-3.jpg",
    area: "Golo Brdo — centar — Rezovačke Krčevine",
    desc: "Najduža linija: od Gola Brda preko Podgorja i Svetog Đurađa u centar, " +
          "pa dalje na Sajmište, Vinkovačku i u Rezovac te Rezovačke Krčevine.",
    hours: { when: "6:00 – 22:30", freq: "otprilike svakih 45 min", days: "svaki dan" }
  },
  {
    id: "n",
    short: "N",
    name: "Noćna linija",
    color: "#6c4bd8",
    night: true,
    scheme: "img/shema-n.jpg",
    area: "Objedinjena noćna ruta",
    desc: "Objedinjena ruta koja povezuje naselja obuhvaćena dnevnim linijama 1, 2 i 3.",
    hours: { when: "22:30 – 4:50", freq: "učestalost nije objavljena", days: "vikendom" }
  }
];

/* Ono što je Grad objavio o prometovanju — prikazuje se doslovno,
   bez izvođenja pojedinačnih polazaka. */
const SERVICE = {
  dnevne: "Dnevne linije prometuju približno od 6 do 22:30 sati, a autobusi na stajališta " +
          "dolaze otprilike svakih 45 minuta.",
  nocna : "Noćna vožnja predviđena je vikendom, od 22:30 do 4:50 sati.",
  vozniRed: "Službeni vozni red po stajalištima još nije objavljen."
};

/* ---------------------------------------------------------------
   CIJENE KARATA — službeni cjenik Grada Virovitice
   --------------------------------------------------------------- */
const FARES = {
  pojedinacne: [
    { name: "Jednosatna karta", price: "1,00 €", note: "vrijedi 60 minuta od kupnje" },
    { name: "Dnevna karta",     price: "3,50 €", note: "vrijedi do kraja kalendarskog dana" }
  ],
  mjesecne: [
    { name: "Građanska i radnička",  price: "25 €" },
    { name: "Umirovljenička",        price: "15 €" },
    { name: "Učenička i studentska", price: "10 €" },
    { name: "Osnovnoškolska",        price: "5 €" },
    { name: "Socijalna",             price: "5 €" }
  ],
  kartica: { name: "Personalizirana kartica", price: "6,70 €", note: "jednokratno, pri izradi" },
  gdje: "Kartice se izrađuju u Poslovnom parku Virovitica, Trg bana Josipa Jelačića 21."
};

/* ---------------------------------------------------------------
   INFORMATIVNE KARTICE
   --------------------------------------------------------------- */
const FACTS = [
  {
    tag: "Vozni park",
    title: "Pet novih električnih vozila",
    body: "Na četiri linije prometuju tri električna minibusa i dva električna autobusa."
  },
  {
    tag: "Naplata",
    title: "Aplikacija i validatori u rujnu i listopadu",
    body: "Tijekom rujna i listopada postupno se uvode mobilna aplikacija za iOS i Android " +
          "te validatori u autobusima."
  },
  {
    tag: "Područje",
    title: "Grad i prigradska naselja",
    body: "Prijevoz pokriva Viroviticu i prigradska naselja. Korija i Jasenaš nisu obuhvaćeni " +
          "jer su u nadležnosti županije."
  }
];

/* ===============================================================
   KAKO DODATI VOZNI RED KAD BUDE OBJAVLJEN

   Svakoj liniji dodaj polje "schedule" s pravim vremenima polazaka
   po danima. Aplikacija tada sama prikaže vozni red i sljedeći
   polazak; dok polja nema, prikazuje se samo radno vrijeme iz "hours".

     schedule: {
       radni:    ["06:00", "06:45", "07:30"],
       subota:   ["07:00", "08:00"],
       nedjelja: []
     }

   Nemoj generirati vremena iz razmaka — bolje je nemati ih nego
   imati izmišljena.
   =============================================================== */
