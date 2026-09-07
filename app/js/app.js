/* =============================================================
   Virovitički električni autobusi — aplikacija (vanilla JS)

   Jedan zaslon, tri plohe: popis stajališta, karta i polasci.
   Sve se izvodi iz stanja S; promjena stanja ponovno iscrtava
   samo plohe kojih se tiče. Karta se stvara jednom i ostaje živa.
   ============================================================= */
(function () {
  "use strict";

  /* ---------------- stanje ---------------- */

  const S = {
    line: "all",     // "all" | "1" | "2" | "3" | "n"
    dir : "A",       // smjer unutar linije
    day : dayKey(new Date()),
    q   : "",
    favOnly: false,
    near: null       // [lat, lon] kad korisnik traži najbliža stajališta
  };

  const LS = { fav: "vt.favoriti", theme: "vt.tema" };

  const el = {
    chips   : document.getElementById("lineFilter"),
    brandSub: document.getElementById("brandSub"),
    dirSwitch: document.getElementById("dirSwitch"),
    q       : document.getElementById("q"),
    favOnly : document.getElementById("btnFavOnly"),
    stops   : document.getElementById("stopsList"),
    stopsMeta: document.getElementById("stopsMeta"),
    info    : document.getElementById("infoPanel"),
    legend  : document.getElementById("mapLegend"),
    grid    : document.getElementById("grid"),
    tabs    : document.getElementById("mobileTabs"),
    toast   : document.getElementById("toast")
  };

  /* ---------------- pomoćno ---------------- */

  const esc = s => String(s == null ? "" : s)
    .replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pad   = n => (n < 10 ? "0" : "") + n;
  const toMin = t => { const p = t.split(":"); return +p[0] * 60 + +p[1]; };
  const hhmm  = m => pad(Math.floor((m % 1440) / 60)) + ":" + pad(m % 60);
  const lineById = id => LINES.find(l => l.id === id);

  function dayKey(d) { const w = d.getDay(); return w === 0 ? "nedjelja" : w === 6 ? "subota" : "radni"; }

  /* jedini smjerovi koje linija ima ("A", ili "A" i "B") */
  const dirsOf = id => Object.keys(ROUTES[id] || {});
  const dirOf  = (id, dir) => (ROUTES[id] || {})[dir] || (ROUTES[id] || {})[dirsOf(id)[0]];

  function distM(a, b) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    const x = Math.sin(dLat / 2) ** 2 +
              Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(x)));
  }
  const fmtM = d => d < 1000 ? d + " m" : (d / 1000).toFixed(1) + " km";

  const KIND = { okretiste: "okretište", ugibaliste: "ugibalište", stajaliste: "stajalište" };

  /* dijakritika van, sve malo — da tražilica nađe "durad" i "Đurađ" */
  const fold = s => String(s).toLowerCase()
    .replace(/[čć]/g, "c").replace(/đ/g, "d").replace(/š/g, "s").replace(/ž/g, "z");

  /* ---------------- favoriti ---------------- */

  const favs = {
    all() { try { return JSON.parse(localStorage.getItem(LS.fav)) || []; } catch (e) { return []; } },
    has(n) { return favs.all().indexOf(n) > -1; },
    toggle(n) {
      const a = favs.all(), i = a.indexOf(n);
      if (i > -1) a.splice(i, 1); else a.push(n);
      try { localStorage.setItem(LS.fav, JSON.stringify(a)); } catch (e) {}
      return i === -1;
    }
  };

  /* ---------------- indeks svih stajališta ---------------- */

  const INDEX = (() => {
    const m = new Map();
    LINES.forEach(line => dirsOf(line.id).forEach(d => {
      dirOf(line.id, d).stops.forEach(s => {
        if (!m.has(s.name)) m.set(s.name, { name: s.name, ll: s.ll, lines: [], addrs: [], places: [] });
        const e = m.get(s.name);
        if (e.lines.indexOf(line) < 0) e.lines.push(line);
        if (s.addr && e.addrs.indexOf(s.addr) < 0) e.addrs.push(s.addr);
        if (s.place && e.places.indexOf(s.place) < 0) e.places.push(s.place);
      });
    }));
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, "hr"));
  })();

  /* ---------------- vozni red ---------------- */

  function departures(line, day) {
    const s = line.schedule && line.schedule[day];
    if (!s) return [];
    if (s.times) return s.times.map(toMin);
    let a = toMin(s.first), b = toMin(s.last);
    if (b < a) b += 1440;                       // noćna linija prelazi ponoć
    const out = [];
    for (let t = a; t <= b; t += s.headway) out.push(t);
    return out;
  }

  /** sljedeći polazak od sada; vraća { at, mins, then[] } ili null */
  function nextDeparture(line, now) {
    now = now || new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    // jučerašnji polasci koji se prelijevaju preko ponoći
    const yst = new Date(now.getTime() - 86400000);
    const late = departures(line, dayKey(yst)).filter(t => t >= 1440).map(t => t - 1440);
    const today = departures(line, dayKey(now));
    const pool = late.concat(today);

    for (let i = 0; i < pool.length; i++) {
      if (pool[i] >= nowMin) {
        return { at: hhmm(pool[i]), mins: pool[i] - nowMin, then: pool.slice(i + 1, i + 3).map(hhmm) };
      }
    }
    return null;
  }

  function fmtIn(m) {
    if (m <= 0) return "polazi sada";
    if (m < 60) return "za " + m + " min";
    const h = Math.floor(m / 60), r = m % 60;
    return "za " + h + " h" + (r ? " " + r + " min" : "");
  }

  /* ---------------- karta ---------------- */

  let map = null;
  let pendingFit = null;                // uklapanje odgođeno dok je karta skrivena
  const layer = { routes: null, stops: null, me: null };
  const markers = new Map();          // "linija|smjer|indeks" -> Leaflet marker

  function initMap() {
    map = L.map("map", { zoomControl: true, scrollWheelZoom: true, attributionControl: true })
           .setView([45.8250, 17.3850], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    layer.routes = L.layerGroup().addTo(map);
    layer.stops  = L.layerGroup().addTo(map);
  }

  function icon(color, term, hot) {
    const d = term ? 15 : 11;
    return L.divIcon({
      className: "",
      html: '<div class="mk' + (term ? " term" : "") + (hot ? " hot" : "") + '" style="--c:' + color + '"></div>',
      iconSize: [d, d], iconAnchor: [d / 2, d / 2], popupAnchor: [0, -d / 2 - 2]
    });
  }

  /** koje linije/smjerove karta trenutno prikazuje */
  function activeViews() {
    if (S.line === "all") return LINES.map(l => ({ line: l, dir: dirsOf(l.id)[0], solo: false }));
    const l = lineById(S.line);
    return [{ line: l, dir: S.dir, solo: true }];
  }

  function drawMap(fit) {
    layer.routes.clearLayers();
    layer.stops.clearLayers();
    markers.clear();

    let bounds = null;
    activeViews().forEach(v => {
      const r = dirOf(v.line.id, v.dir);
      if (!r) return;

      const poly = L.polyline(r.path, {
        color: v.line.color,
        weight: v.solo ? 5 : 3.5,
        opacity: v.solo ? .95 : .8,
        lineJoin: "round", lineCap: "round"
      }).addTo(layer.routes);
      bounds = bounds ? bounds.extend(poly.getBounds()) : poly.getBounds();

      if (!v.solo) return;    // u pregledu svih linija markeri se crtaju iz indeksa
      r.stops.forEach((s, i) => {
        const term = i === 0 || i === r.stops.length - 1;
        const key = v.line.id + "|" + v.dir + "|" + i;
        const m = L.marker(s.ll, { icon: icon(v.line.color, term), keyboard: false, riseOnHover: true })
          .addTo(layer.stops)
          .bindPopup(popupHtml(v.line, r, s, i));
        m.on("popupopen", () => highlightRow(key));
        markers.set(key, m);
      });
    });

    /* pregled svih linija: po jedan marker za svako jedinstveno stajalište */
    if (S.line === "all") {
      INDEX.forEach(s => {
        const key = "idx|" + s.name;
        const m = L.marker(s.ll, { icon: icon(s.lines[0].color, false), keyboard: false, riseOnHover: true })
          .addTo(layer.stops)
          .bindPopup('<b>' + esc(s.name) + '</b><span class="muted">' +
            s.lines.map(l => esc(l.name)).join(" · ") +
            (s.addrs[0] ? "<br>" + esc(s.addrs[0]) : "") + '</span>');
        m.on("popupopen", () => highlightRow(key));
        markers.set(key, m);
      });
    }

    // invalidateSize MORA ići prije fitBounds: inače Leaflet računa zoom za
    // još neizmjeren spremnik. Ako je ploha karte skrivena (uski zasloni
    // prije prvog setPane), uklapanje se odgađa do trenutka kad se prikaže.
    if (fit && bounds) {
      map.invalidateSize();
      const sz = map.getSize();
      if (sz.x > 40 && sz.y > 40) { pendingFit = null; map.fitBounds(bounds, { padding: [34, 34] }); }
      else pendingFit = bounds;
    }
    drawLegend();
  }

  function popupHtml(line, r, s, i) {
    return '<b>' + esc(s.name) + '</b>' +
      '<span class="muted">' +
        esc(line.name) + " · " + esc(s.code) + " · " + (i + 1) + "/" + r.stops.length +
        (s.addr ? "<br>" + esc(s.addr) + (s.place && s.place !== "Virovitica" ? ", " + esc(s.place) : "") : "") +
        (s.kind ? "<br>" + esc(KIND[s.kind] || s.kind) : "") +
      '</span>';
  }

  function drawLegend() {
    el.legend.innerHTML = activeViews().map(v => {
      const r = dirOf(v.line.id, v.dir);
      return '<span><i style="background:' + v.line.color + '"></i>' +
             esc(v.line.short === "N" ? "Noćna" : "Linija " + v.line.short) +
             (r && r.km ? ' <span style="opacity:.6">' + r.km + " km</span>" : "") +
             '</span>';
    }).join("");
  }

  function highlightRow(key) {
    el.stops.querySelectorAll(".stop.hot").forEach(n => n.classList.remove("hot"));
    const row = el.stops.querySelector('.stop[data-key="' + key + '"]');
    if (row) { row.classList.add("hot"); row.scrollIntoView({ block: "nearest" }); }
  }

  function hoverMarker(key, on) {
    const m = markers.get(key);
    const n = m && m.getElement && m.getElement();
    if (n && n.firstChild) n.firstChild.classList.toggle("hot", on);
  }

  function focusStop(key, ll) {
    const m = markers.get(key);
    map.flyTo(ll, Math.max(map.getZoom(), 16), { duration: .55 });
    if (m) setTimeout(() => m.openPopup(), 220);
    if (window.matchMedia("(max-width: 760px)").matches) setPane("karta");
  }

  /* ---------------- zaglavlje: filtar linija ---------------- */

  function renderChips() {
    const now = new Date();
    let html = '<button class="chip' + (S.line === "all" ? " on" : "") + '" data-id="all" role="tab" aria-selected="' + (S.line === "all") + '">' +
               '<span class="chip-badge">SVE</span>' +
               '<span class="chip-txt"><b>Sve linije</b><span>' + INDEX.length + ' stajališta</span></span></button>';

    LINES.forEach(l => {
      const nd = nextDeparture(l, now);
      const on = S.line === l.id;
      html += '<button class="chip' + (on ? " on" : "") + '" data-id="' + l.id + '" role="tab"' +
              ' aria-selected="' + on + '" style="--c:' + l.color + '">' +
              '<span class="chip-badge">' + esc(l.short) + '</span>' +
              '<span class="chip-txt"><b>' + esc(l.night ? "Noćna" : "Linija " + l.short) + '</b>' +
              '<span>' + (nd ? esc(nd.at) + " · " + esc(fmtIn(nd.mins)) : "danas ne vozi") + '</span></span></button>';
    });
    el.chips.innerHTML = html;
  }

  /* ---------------- lijevo: smjer + popis ---------------- */

  function renderDirSwitch() {
    if (S.line === "all") {
      el.dirSwitch.innerHTML =
        '<button class="on single" disabled><small>Pregled</small><b>Sva stajališta u mreži</b></button>';
      return;
    }
    const line = lineById(S.line);
    const ds = dirsOf(S.line);
    el.dirSwitch.innerHTML = ds.map(d => {
      const r = dirOf(S.line, d);
      return '<button data-dir="' + d + '" class="' + (S.dir === d ? "on" : "") + (ds.length === 1 ? " single" : "") +
             '" style="--c:' + line.color + '" title="' + esc(r.from + " → " + r.to) + '">' +
             '<small>Smjer ' + esc(d) + '</small><b>→ ' + esc(r.to) + '</b></button>';
    }).join("");
  }

  function renderStops() {
    const q = fold(S.q.trim());
    let html = "", count = 0, shown = 0;

    if (S.near) {
      /* --- najbliža stajališta --- */
      const near = INDEX.map(s => ({ s, d: distM(S.near, s.ll) }))
                        .sort((a, b) => a.d - b.d).slice(0, 10);
      html = '<div class="group-title">Najbliža stajališta · <button id="clearNear" style="color:var(--accent);font:inherit;text-transform:none;letter-spacing:0">natrag na popis</button></div>';
      html += near.map(({ s, d }) => indexRow(s, d)).join("");
      count = shown = near.length;

    } else if (S.line === "all") {
      /* --- svi stanice u mreži, abecedno --- */
      const list = INDEX.filter(s =>
        (!S.favOnly || favs.has(s.name)) &&
        (!q || fold(s.name).indexOf(q) > -1 || s.addrs.some(a => fold(a).indexOf(q) > -1))
      );
      count = INDEX.length; shown = list.length;
      html = list.length ? list.map(s => indexRow(s, null)).join("") : emptyHtml();

    } else {
      /* --- stajališta odabrane linije, redom vožnje --- */
      const line = lineById(S.line);
      const r = dirOf(S.line, S.dir);
      const rows = r.stops.map((s, i) => ({ s, i }))
        .filter(({ s }) =>
          (!S.favOnly || favs.has(s.name)) &&
          (!q || fold(s.name).indexOf(q) > -1 || fold(s.addr).indexOf(q) > -1)
        );
      count = r.stops.length; shown = rows.length;
      html = rows.length
        ? rows.map(({ s, i }) => lineRow(line, r, s, i)).join("")
        : emptyHtml();
    }

    // nit rute ima smisla samo kad su stajališta poredana redom vožnje
    const plain = S.near || S.line === "all";
    el.stops.innerHTML = '<div class="stops' + (plain ? " plain" : "") + '">' + html + '</div>';
    wireStopRows();

    /* podnaslov s brojkama */
    if (S.near) {
      el.stopsMeta.innerHTML = '<span>Sortirano po udaljenosti</span><span>' + shown + ' najbližih</span>';
    } else if (S.line === "all") {
      el.stopsMeta.innerHTML = '<span>' + (shown === count ? count + " stajališta u mreži" : shown + " od " + count) + '</span>' +
                               '<span>' + LINES.length + ' linije</span>';
    } else {
      const r = dirOf(S.line, S.dir);
      el.stopsMeta.innerHTML = '<span>' + (shown === count ? count + " stajališta" : shown + " od " + count) + '</span>' +
                               '<span>' + (r.km ? r.km + " km · " + r.min + " min" : "") + '</span>';
    }
  }

  function emptyHtml() {
    return '<div class="empty"><b>Nema rezultata</b>' +
           (S.favOnly ? "Nijedno spremljeno stajalište ne odgovara pretrazi." : "Pokušaj s drugim nazivom ulice ili stajališta.") +
           '</div>';
  }

  function lineRow(line, r, s, i) {
    const term = i === 0 || i === r.stops.length - 1;
    const key = line.id + "|" + S.dir + "|" + i;
    const sub = (s.addr ? esc(s.addr) + (s.place && s.place !== "Virovitica" ? ", " + esc(s.place) : "") : esc(s.place)) +
                (s.kind ? ' · <span class="kind">' + esc(KIND[s.kind] || s.kind) + "</span>" : "");
    return '<button class="stop' + (term ? " term" : "") + '" data-key="' + key + '"' +
           ' data-name="' + esc(s.name) + '" data-ll="' + s.ll.join(",") + '" style="--c:' + line.color + '">' +
           '<span class="stop-rail"><span class="stop-dot"></span></span>' +
           '<span class="stop-main"><span class="stop-name">' + esc(s.name) + '</span>' +
           '<span class="stop-sub">' + sub + '</span></span>' +
           '<span class="stop-side"><span class="code">' + esc(s.code) + '</span>' +
           '<span class="fav' + (favs.has(s.name) ? " on" : "") + '" role="button" aria-label="Favorit">★</span></span>' +
           '</button>';
  }

  function indexRow(s, d) {
    const first = s.lines[0];
    const key = "idx|" + s.name;
    const sub = (s.addrs[0] || "") + (s.places.length && s.places[0] !== "Virovitica" ? ", " + s.places[0] : "");
    return '<button class="stop" data-key="' + key + '" data-name="' + esc(s.name) + '"' +
           ' data-ll="' + s.ll.join(",") + '" style="--c:' + first.color + '">' +
           '<span class="stop-rail"><span class="stop-dot"></span></span>' +
           '<span class="stop-main"><span class="stop-name">' + esc(s.name) + '</span>' +
           '<span class="stop-sub">' + esc(sub) + '</span></span>' +
           '<span class="stop-side">' +
           (d != null ? '<span class="dist">' + fmtM(d) + '</span>' : "") +
           '<span class="pills">' + s.lines.map(l =>
             '<span class="pill" style="--c:' + l.color + '">' + esc(l.short) + "</span>").join("") + '</span>' +
           '<span class="fav' + (favs.has(s.name) ? " on" : "") + '" role="button" aria-label="Favorit">★</span>' +
           '</span></button>';
  }

  function wireStopRows() {
    const clear = document.getElementById("clearNear");
    if (clear) clear.onclick = () => { S.near = null; renderStops(); };

    el.stops.querySelectorAll(".stop").forEach(row => {
      const key = row.dataset.key;
      const ll = row.dataset.ll.split(",").map(Number);

      row.addEventListener("click", e => {
        const star = e.target.closest(".fav");
        if (star) {
          e.stopPropagation();
          star.classList.toggle("on", favs.toggle(row.dataset.name));
          if (S.favOnly) renderStops();
          return;
        }
        focusStop(key, ll);
      });
      row.addEventListener("mouseenter", () => hoverMarker(key, true));
      row.addEventListener("mouseleave", () => hoverMarker(key, false));
    });
  }

  /* ---------------- desno: polasci, vozni red, cijene ---------------- */

  function renderInfo() {
    el.info.innerHTML = (S.line === "all" ? overviewCards() : lineCards()) + faresCard() + attribCard();
    wireInfo();
  }

  function overviewCards() {
    const now = new Date();
    let html = '<div class="card"><h3 class="card-title">Sljedeći polasci<span>' + esc(DAN[S.day]) + '</span></h3>';
    LINES.forEach(l => {
      const nd = nextDeparture(l, now);
      const r = dirOf(l.id, dirsOf(l.id)[0]);
      html += '<button class="linerow" data-line="' + l.id + '" style="--c:' + l.color + '">' +
              '<span class="linerow-badge">' + esc(l.short) + '</span>' +
              '<span style="min-width:0"><span class="linerow-name">' + esc(l.name) + '</span>' +
              '<span class="linerow-sub">' + esc(l.area) + '</span></span>' +
              '<span class="linerow-time' + (nd ? "" : " off") + '">' + (nd ? esc(nd.at) : "—") + '</span></button>';
    });
    html += '</div>';

    html += '<div class="card"><h3 class="card-title">Mreža</h3><div class="stats">' +
      stat(LINES.length, "linije") +
      stat(INDEX.length, "stajališta") +
      stat(networkKm().toFixed(0) + " km", "ukupno ruta") +
      '</div>' + FACTS.map(f =>
        '<div class="fact"><span class="tag">' + esc(f.tag) + '</span>' +
        '<h4>' + esc(f.title) + '</h4><p>' + esc(f.body) + '</p></div>').join("") + '</div>';
    return html;
  }

  function networkKm() {
    return LINES.reduce((a, l) => {
      const r = dirOf(l.id, dirsOf(l.id)[0]);
      return a + (r && r.km ? r.km : 0);
    }, 0);
  }

  const stat = (b, s) => '<div class="stat"><b>' + esc(b) + '</b><span>' + esc(s) + '</span></div>';

  function lineCards() {
    const line = lineById(S.line);
    const r = dirOf(S.line, S.dir);
    const nd = nextDeparture(line);
    const c = line.color;

    /* sljedeći polazak */
    let html = '<div class="card"><h3 class="card-title">Sljedeći polazak<span>' + esc(DAN[S.day]) + '</span></h3>' +
      '<div class="next" style="--c:' + c + '">' +
      '<span class="next-badge">' + esc(line.short) + '</span>' +
      '<span class="next-main">' +
        (nd ? '<span class="next-time">' + esc(nd.at) + '</span><span class="next-in"><b>' + esc(fmtIn(nd.mins)) + '</b></span>'
            : '<span class="next-time off">' + (line.schedule[dayKey(new Date())] ? "Danas gotovo" : "Danas ne vozi") + '</span>' +
              '<span class="next-in">' + (line.night ? "Noćna linija vozi vikendom" : "Provjeri vozni red") + '</span>') +
      '</span>' +
      (nd && nd.then.length ? '<span class="next-then">' + nd.then.map(t => "<span>" + esc(t) + "</span>").join("") + '</span>' : "") +
      '</div></div>';

    /* vozni red */
    html += '<div class="card sched"><h3 class="card-title">Vozni red<span>' +
      esc(r.from + " → " + r.to) + '</span></h3>' +
      '<div class="days">' + Object.keys(DAN).map(k =>
        '<button data-day="' + k + '" class="' + (S.day === k ? "on" : "") + '">' +
        esc(DAN[k].split(" ")[0]) + (k === dayKey(new Date()) ? " · danas" : "") + '</button>').join("") + '</div>' +
      timesGrid(line) + '</div>';

    /* o liniji */
    html += '<div class="card"><h3 class="card-title">O liniji</h3><div class="stats">' +
      stat(r.stops.length, "stajališta") +
      stat(r.km ? r.km + " km" : "—", "duljina") +
      stat(r.min ? r.min + " min" : "—", "vožnje") +
      '</div><p class="desc">' + esc(line.desc) + '</p>' +
      '<button class="scheme-btn" data-scheme="' + esc(line.scheme) + '">' +
      '<img src="' + esc(line.scheme) + '" alt="Službena shema — ' + esc(line.name) + '" loading="lazy">' +
      '<span>Službena shema linije ⤢</span></button></div>';
    return html;
  }

  function timesGrid(line) {
    const list = departures(line, S.day);
    if (!list.length) {
      return '<div class="times-grid"><p class="desc" style="grid-column:1/-1;margin:4px 0 0">' +
             (line.night ? "Noćna linija vozi samo vikendom." : "Na ovaj dan linija ne prometuje.") + '</p></div>';
    }
    const isToday = S.day === dayKey(new Date());
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const nextIdx = isToday ? list.findIndex(t => t >= nowMin) : -1;
    return '<div class="times-grid" style="--c:' + line.color + '">' + list.map((t, i) =>
      '<span class="t' + (isToday && i === nextIdx ? " next" : "") +
      (isToday && nextIdx > -1 && i < nextIdx ? " past" : "") + '">' + hhmm(t) + '</span>').join("") + '</div>';
  }

  function faresCard() {
    return '<div class="card"><h3 class="card-title">Cijene karata</h3><div class="fares">' +
      FARES.pojedinacne.map(f =>
        '<div class="fare"><span class="nm">' + esc(f.name) + '<small>' + esc(f.note) + '</small></span>' +
        '<span class="pr">' + esc(f.price) + '</span></div>').join("") +
      '<div class="fare head">Mjesečne pretplatne</div>' +
      FARES.mjesecne.map(f =>
        '<div class="fare"><span class="nm">' + esc(f.name) + '</span>' +
        '<span class="pr">' + esc(f.price) + '</span></div>').join("") +
      '<div class="fare head">Kartica</div>' +
      '<div class="fare"><span class="nm">' + esc(FARES.kartica.name) + '<small>' + esc(FARES.kartica.note) + '</small></span>' +
      '<span class="pr">' + esc(FARES.kartica.price) + '</span></div>' +
      '</div><p class="desc" style="margin:10px 0 0">' + esc(FARES.gdje) + '</p></div>';
  }

  function attribCard() {
    return '<div class="card"><div class="notice">⚠<span><b>Vozni red je okviran.</b> ' +
      'Službena vremena po stajalištima još nisu objavljena, pa su polasci izračunati iz objavljenog ' +
      'okvira: dnevne linije od 6 do 22:30 svakih 45 minuta, noćna vikendom od 22:30 do 4:50.</span></div>' +
      '<p class="attrib" style="padding:11px 0 0">' +
      'Stajališta i njihov redoslijed: službeni popis lokacija stajališta (EY). ' +
      'Karta, ulice i položaji: © OpenStreetMap suradnici (ODbL); rute izračunate OSRM-om. ' +
      'Koordinate stajališta su približne.</p></div>';
  }

  function wireInfo() {
    el.info.querySelectorAll(".linerow").forEach(b =>
      b.onclick = () => setLine(b.dataset.line));
    el.info.querySelectorAll(".days button").forEach(b =>
      b.onclick = () => { S.day = b.dataset.day; renderInfo(); });
    const sb = el.info.querySelector(".scheme-btn");
    if (sb) sb.onclick = () => openLightbox(sb.dataset.scheme);

    // mreža polazaka se sama pomakne na sljedeći polazak
    // (ručno, da scrollIntoView ne povuče i cijeli desni panel)
    const nx = el.info.querySelector(".t.next");
    if (nx) {
      const g = nx.parentNode;
      g.scrollTop = Math.max(0, nx.offsetTop - g.clientHeight / 2 + nx.offsetHeight / 2);
    }
  }

  /* ---------------- prijelazi stanja ---------------- */

  function setLine(id, keepDir) {
    S.line = id;
    if (!keepDir) S.dir = id === "all" ? "A" : dirsOf(id)[0];
    S.near = null;
    syncHash();
    renderChips();
    renderDirSwitch();
    renderStops();
    renderInfo();
    drawMap(true);
  }

  function setDir(d) {
    S.dir = d;
    syncHash();
    renderDirSwitch();
    renderStops();
    renderInfo();
    drawMap(true);
  }

  function setPane(name) {
    el.grid.querySelectorAll("[data-pane]").forEach(n => n.classList.toggle("on", n.dataset.pane === name));
    el.tabs.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.pane === name));
    if (name !== "karta" || !map) return;
    setTimeout(() => {
      map.invalidateSize();
      if (pendingFit) { map.fitBounds(pendingFit, { padding: [34, 34] }); pendingFit = null; }
    }, 60);
  }

  /* ---------------- adresna traka ---------------- */

  function syncHash() {
    const h = S.line === "all" ? "#/sve" : "#/" + S.line + "/" + S.dir;
    if (location.hash !== h) history.replaceState(null, "", h);
  }

  function readHash() {
    const p = (location.hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
    if (!p.length || p[0] === "sve") return;
    if (lineById(p[0])) {
      S.line = p[0];
      S.dir = dirsOf(p[0]).indexOf(p[1]) > -1 ? p[1] : dirsOf(p[0])[0];
    }
  }

  /* ---------------- svjetlosni okvir ---------------- */

  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbStage = lb.querySelector(".lb-stage");
  let z = 1, tx = 0, ty = 0, drag = false, ox = 0, oy = 0;

  const applyLb = () => { lbImg.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + z + ")"; };

  function openLightbox(src) {
    lbImg.src = src; z = 1; tx = ty = 0; applyLb();
    lb.hidden = false;
  }
  function closeLightbox() { lb.hidden = true; lbImg.src = ""; }

  document.getElementById("lbClose").onclick = closeLightbox;
  lb.addEventListener("click", e => { if (e.target === lb || e.target === lbStage) closeLightbox(); });
  lbStage.addEventListener("dblclick", e => {
    z = z > 1 ? 1 : 2.6; if (z === 1) tx = ty = 0; applyLb(); e.preventDefault();
  });
  lbStage.addEventListener("pointerdown", e => {
    drag = true; ox = e.clientX - tx; oy = e.clientY - ty; lbStage.setPointerCapture(e.pointerId);
  });
  lbStage.addEventListener("pointermove", e => {
    if (!drag || z === 1) return;
    tx = e.clientX - ox; ty = e.clientY - oy; applyLb();
  });
  lbStage.addEventListener("pointerup", () => { drag = false; });
  lbStage.addEventListener("wheel", e => {
    e.preventDefault();
    z = Math.min(6, Math.max(1, z * (e.deltaY < 0 ? 1.16 : .86)));
    if (z === 1) { tx = ty = 0; }
    applyLb();
  }, { passive: false });

  /* ---------------- obavijesti ---------------- */

  let toastT = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    requestAnimationFrame(() => el.toast.classList.add("show"));
    clearTimeout(toastT);
    toastT = setTimeout(() => {
      el.toast.classList.remove("show");
      setTimeout(() => { el.toast.hidden = true; }, 220);
    }, 3200);
  }

  /* ---------------- lociranje ---------------- */

  function locate(zoomTo) {
    if (!navigator.geolocation) return toast("Uređaj ne podržava lociranje.");
    toast("Tražim tvoju lokaciju…");
    navigator.geolocation.getCurrentPosition(p => {
      const ll = [p.coords.latitude, p.coords.longitude];
      if (layer.me) map.removeLayer(layer.me);
      layer.me = L.marker(ll, {
        icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [15, 15], iconAnchor: [7.5, 7.5] }),
        keyboard: false
      }).addTo(map).bindPopup("Vi ste ovdje");

      S.near = ll;
      renderStops();
      const nearest = INDEX.map(s => ({ s, d: distM(ll, s.ll) })).sort((a, b) => a.d - b.d)[0];
      toast(nearest ? "Najbliže: " + nearest.s.name + " (" + fmtM(nearest.d) + ")" : "Lokacija pronađena.");
      if (zoomTo) map.flyTo(ll, 16, { duration: .6 });
      if (window.matchMedia("(max-width: 760px)").matches) setPane("stajalista");
    },
    () => toast("Nije moguće dohvatiti lokaciju."),
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 });
  }

  /* ---------------- tema ---------------- */

  function initTheme() {
    let t = null;
    try { t = localStorage.getItem(LS.theme); } catch (e) {}
    if (!t) t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
  }

  document.getElementById("btnTheme").onclick = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(LS.theme, next); } catch (e) {}
    document.querySelector('meta[name="theme-color"]').content = next === "dark" ? "#080b11" : "#eef1f6";
  };

  /* ---------------- žice ---------------- */

  el.chips.addEventListener("click", e => {
    const c = e.target.closest(".chip");
    if (c) setLine(c.dataset.id);
  });

  el.dirSwitch.addEventListener("click", e => {
    const b = e.target.closest("button[data-dir]");
    if (b && b.dataset.dir !== S.dir) setDir(b.dataset.dir);
  });

  el.q.addEventListener("input", () => { S.q = el.q.value; S.near = null; renderStops(); });

  el.favOnly.onclick = () => {
    S.favOnly = !S.favOnly;
    el.favOnly.setAttribute("aria-pressed", String(S.favOnly));
    S.near = null;
    renderStops();
  };

  document.getElementById("btnLocate").onclick = () => locate(true);
  document.getElementById("btnMe").onclick = () => locate(true);
  document.getElementById("btnFit").onclick = () => drawMap(true);

  el.tabs.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b) setPane(b.dataset.pane);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if (!lb.hidden) return closeLightbox(); }
    if (e.target.tagName === "INPUT") return;
    if (e.key === "/") { e.preventDefault(); el.q.focus(); return; }
    if (["1", "2", "3"].indexOf(e.key) > -1) setLine(e.key);
    if (e.key === "0") setLine("all");
    if (e.key.toLowerCase() === "n") setLine("n");
  });

  window.addEventListener("hashchange", () => {
    const before = S.line + S.dir;
    readHash();
    if (S.line + S.dir !== before) setLine(S.line, true);
  });

  window.addEventListener("resize", () => { if (map) map.invalidateSize(); });

  /* ---------------- pokretanje ---------------- */

  initTheme();
  readHash();
  initMap();

  /* oznaka "kreće danas" / "u prometu" */
  (function startBadge() {
    const today = new Date().toISOString().slice(0, 10);
    if (today === START_DATE) {
      el.brandSub.textContent = "kreće danas";
      el.brandSub.classList.add("live");
    } else if (today > START_DATE) {
      el.brandSub.textContent = "u prometu";
      el.brandSub.classList.add("live");
    } else {
      const d = new Date(START_DATE);
      el.brandSub.textContent = "kreće " + d.getDate() + ". " + (d.getMonth() + 1) + ".";
    }
  })();

  setPane("karta");           // mora prije prvog uklapanja: na uskim zaslonima
  renderChips();              // skrivena ploha karte nema dimenzije
  renderDirSwitch();
  renderStops();
  renderInfo();
  drawMap(true);
  requestAnimationFrame(() => {
    map.invalidateSize();
    if (pendingFit) { map.fitBounds(pendingFit, { padding: [34, 34] }); pendingFit = null; }
  });

  /* osvježi vremena svake minute */
  setInterval(() => {
    renderChips();
    if (S.day === dayKey(new Date())) renderInfo();
  }, 60000);
})();
