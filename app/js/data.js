/* =============================================================
   Virovitički električni autobusi — sadržaj i vozni red

   Redoslijed stajališta, adrese i geometrija ruta žive u js/routes.js
   (generirano). Ovdje je sve ostalo: nazivi linija, boje, opisi,
   vozni red, cijene karata i informativni sadržaj.
   ============================================================= */

/* Datum početka prometovanja — koristi se za oznaku "kreće danas". */
const START_DATE = "2026-09-07";

/* ---------------------------------------------------------------
   VOZNI RED

   Službeni vozni red po stajalištima još nije objavljen. Grad je
   objavio samo okvir: dnevne linije voze približno od 6 do 22:30
   sati, s dolascima otprilike svakih 45 minuta, a noćna linija
   vikendom od 22:30 do 4:50. Polasci se zato generiraju iz tog
   okvira i u aplikaciji su jasno označeni kao okvirni.

   Kad stigne službeni vozni red, najbolje je "times" popuniti
   stvarnim vremenima — ako polje "times" postoji, koristi se
   umjesto first/last/headway.
   --------------------------------------------------------------- */
const DAN = {
  radni:    "Radni dan",
  subota:   "Subota",
  nedjelja: "Nedjelja i praznik"
};

const DNEVNI_RED = {
  radni:    { first: "06:00", last: "22:30", headway: 45 },
  subota:   { first: "06:00", last: "22:30", headway: 45 },
  nedjelja: { first: "06:00", last: "22:30", headway: 45 }
};

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
    schedule: DNEVNI_RED
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
    schedule: DNEVNI_RED
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
    schedule: DNEVNI_RED
  },
  {
    id: "n",
    short: "N",
    name: "Noćna linija",
    color: "#6c4bd8",
    night: true,
    scheme: "img/shema-n.jpg",
    area: "Objedinjena noćna ruta",
    desc: "Vikendom, objedinjena ruta koja povezuje naselja obuhvaćena dnevnim linijama 1, 2 i 3.",
    /* Noćna vozi samo vikendom (petak/subota u noć). */
    schedule: {
      radni:    null,
      subota:   { first: "22:30", last: "04:50", headway: 90 },
      nedjelja: { first: "22:30", last: "04:50", headway: 90 }
    }
  }
];

/* ---------------------------------------------------------------
   CIJENE KARATA — službeni cjenik Grada Virovitice
   --------------------------------------------------------------- */
const FARES = {
  pojedinacne: [
    { name: "Jednosatna karta", price: "1,00 €", note: "vrijedi 60 minuta od kupnje" },
    { name: "Dnevna karta",     price: "3,50 €", note: "vrijedi do kraja kalendarskog dana" }
  ],
  mjesecne: [
    { name: "Građanska i radnička", price: "25 €" },
    { name: "Umirovljenička",       price: "15 €" },
    { name: "Učenička i studentska", price: "10 €" },
    { name: "Osnovnoškolska",       price: "5 €" },
    { name: "Socijalna",            price: "5 €" }
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
    tag: "Radno vrijeme",
    title: "Od 6 do 22:30, svakih 45 minuta",
    body: "Dnevne linije voze približno od 6 do 22:30 sati, a autobusi na stajališta " +
          "dolaze otprilike svakih 45 minuta. Noćna vožnja predviđena je vikendom " +
          "od 22:30 do 4:50 sati."
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
