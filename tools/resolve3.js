const fs = require('fs');
const streets = JSON.parse(fs.readFileSync('data/streets.json','utf8')).elements;
const geo     = JSON.parse(fs.readFileSync('data/geo.json','utf8'));
const PLACES  = JSON.parse(fs.readFileSync('data/places.json','utf8'));
const DATA    = JSON.parse(fs.readFileSync('data/stops.json','utf8'));

const norm = s => s.toLowerCase()
  .replace(/[čć]/g,'c').replace(/đ/g,'d').replace(/š/g,'s').replace(/ž/g,'z')
  .replace(/\b(ulica|ul\.|cesta|trg|dr\.|svetog|sv\.)\b/g,' ')
  .replace(/[^a-z0-9]+/g,' ').trim();

const R=6371000, rad=Math.PI/180;
function dist(a,b){ const dLat=(b[0]-a[0])*rad, dLon=(b[1]-a[1])*rad;
  const x=Math.sin(dLat/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(x)); }

/* --- 1. ulice po imenu -> povezane komponente (segmenti spojeni na < 40 m) --- */
const byName = new Map();
for (const w of streets) { if (!w.geometry) continue;
  const k = norm(w.tags.name);
  (byName.get(k) || byName.set(k, []).get(k)).push(w.geometry.map(g=>[g.lat,g.lon]));
}
const COMPONENTS = new Map();                       // norm(ime) -> [ [ [lat,lon], ... ], ... ]
for (const [name, segs] of byName) {
  const par = segs.map((_,i)=>i);
  const find = i => par[i]===i ? i : (par[i]=find(par[i]));
  const near = (a,b) => { for (const p of [a[0],a[a.length-1]]) for (const q of [b[0],b[b.length-1]]) if (dist(p,q)<40) return true; return false; };
  for (let i=0;i<segs.length;i++) for (let j=i+1;j<segs.length;j++) if (near(segs[i],segs[j])) par[find(i)]=find(j);
  const comps = new Map();
  segs.forEach((s,i)=>{ const r=find(i); (comps.get(r)||comps.set(r,[]).get(r)).push(...s); });
  COMPONENTS.set(name, [...comps.values()]);
}

/* --- 2. stajališta --- */
const RADIUS = { 'Virovitica': 3200, 'default': 2500 };
const ANCHOR = {
  'Ulica Franje Fujsa 42|Virovitica'  : [45.82866, 17.37023],
  'Ulica Đure Dečaka|Virovitica'      : [45.82899, 17.38746],
  'Ulica Đure Baričeka 38|Virovitica' : [45.83512, 17.39096],
  'Ulica Ferde Rusana 20|Virovitica'  : [45.83593, 17.38761],
  'Ulica Ferde Rusana 26|Virovitica'  : [45.83540, 17.38722],
};
const FIXED = new Set(Object.keys(ANCHOR));
const splitAddr = a => { const m=a.match(/^(.*?)\s+(\d+)[A-Za-z]?$/); return m?[m[1],parseInt(m[2],10)]:[a,null]; };

const pos={}, streetOf={}, nrOf={}, placeOf={}, keys=[];
for (const L in DATA) for (const d in DATA[L]) for (const s of DATA[L][d].stops) {
  const key=s[1]+'|'+s[2]; if (pos[key]) continue; keys.push(key);
  const [street,nr]=splitAddr(s[1]);
  streetOf[key]=norm(street); nrOf[key]=nr; placeOf[key]=s[2];
  pos[key] = (ANCHOR[key] || (PLACES[s[2]]||PLACES['Virovitica'])).slice();
  if (!ANCHOR[key] && geo[key] && !/^highway\//.test(geo[key].cls)) { pos[key]=geo[key].ll.slice(); FIXED.add(key); }
}

const nbr={}; keys.forEach(k=>nbr[k]=[]);
const SEQS=[];
for (const L in DATA) for (const d in DATA[L]) {
  const seq=DATA[L][d].stops.map(s=>s[1]+'|'+s[2]); SEQS.push(seq);
  seq.forEach((k,i)=>{ if(i>0) nbr[k].push(seq[i-1]); if(i<seq.length-1) nbr[k].push(seq[i+1]); });
}
const routeCost = () => SEQS.reduce((t,seq)=>t+seq.reduce((s,k,i)=>i?s+dist(pos[seq[i-1]],pos[k]):0,0),0);

/* --- 3. grupe (ulica + naselje) i odabir komponente ulice --- */
const GROUPS = {};
for (const k of keys) (GROUPS[streetOf[k]+'\u0000'+placeOf[k]] ||= []).push(k);

const chosen = {};                                  // grupa -> vrhovi odabrane komponente
for (const gk in GROUPS) {
  const members = GROUPS[gk];
  const name = streetOf[members[0]], place = placeOf[members[0]];
  const centre = PLACES[place] || PLACES['Virovitica'];
  const comps = (COMPONENTS.get(name) || []).filter(c => c.some(v => dist(v, centre) <= (RADIUS[place]||RADIUS.default)));
  const pool = comps.length ? comps : (COMPONENTS.get(name) || []);
  if (!pool.length) continue;
  // ocijeni komponentu: blizina centru naselja + blizina susjednim stajalištima na ruti
  let best=null, bs=Infinity;
  for (const c of pool) {
    let s = 0;
    for (const m of members) {
      const ns = [...new Set(nbr[m])].filter(n=>n!==m && streetOf[n]!==name);
      const t = ns.length ? ns.reduce((a,n)=>[a[0]+pos[n][0]/ns.length,a[1]+pos[n][1]/ns.length],[0,0]) : centre;
      s += Math.min(...c.map(v=>dist(v,t)));
    }
    s = s/members.length + 0.6*Math.min(...c.map(v=>dist(v,centre)));
    if (s<bs){bs=s;best=c;}
  }
  chosen[gk]=best;
}

const candOf = k => chosen[streetOf[k]+'\u0000'+placeOf[k]] || null;
function snap(k, target) {
  const cs = candOf(k); if (!cs) return null;
  let best=null,bd=Infinity;
  for (const v of cs){ const d=dist(v,target); if(d<bd){bd=d;best=v;} }
  return best.slice();
}

/* --- 4. relaksacija po redoslijedu rute --- */
for (let it=0; it<120; it++) for (const k of keys) {
  if (FIXED.has(k)) continue;
  const ns=[...new Set(nbr[k])].filter(n=>n!==k); if(!ns.length) continue;
  const t=ns.reduce((a,n)=>[a[0]+pos[n][0]/ns.length,a[1]+pos[n][1]/ns.length],[0,0]);
  const p=snap(k,t); if(p) pos[k]=p;
}

/* --- 5. raspored po kućnom broju (samo kad se brojevi bitno razlikuju) --- */
for (const gk in GROUPS) {
  const grp = GROUPS[gk].filter(k=>!FIXED.has(k) && nrOf[k]!=null);
  const cs = chosen[gk];
  if (grp.length<2 || !cs || cs.length<2) continue;
  const nums=grp.map(k=>nrOf[k]), nmin=Math.min(...nums), nmax=Math.max(...nums);
  const spread = (nmax-nmin)>=15 && nmax/Math.max(nmin,1)>=2;
  if (!spread) {                                    // A/B par — spoji ih na jedno mjesto
    const c=grp.reduce((a,k)=>[a[0]+pos[k][0]/grp.length,a[1]+pos[k][1]/grp.length],[0,0]);
    const p=snap(grp[0],c); if(p) grp.forEach(k=>pos[k]=p.slice());
    continue;
  }
  let a=cs[0],b=cs[0],far=-1;
  for (const v of cs) for (const w of cs){ const d=dist(v,w); if(d>far){far=d;a=v;b=w;} }
  const apply = flip => {
    const from=flip?b:a, to=flip?a:b;
    grp.forEach(k=>{ const f=0.06+0.88*(nrOf[k]-nmin)/(nmax-nmin);
      const p=snap(k,[from[0]+(to[0]-from[0])*f, from[1]+(to[1]-from[1])*f]); if(p) pos[k]=p; });
  };
  const save=grp.map(k=>pos[k].slice());
  apply(false); const c0=routeCost();
  apply(true);  const c1=routeCost();
  if (c0<=c1) { grp.forEach((k,i)=>pos[k]=save[i]); apply(false); }
}

/* --- izvještaj --- */
const out={}; keys.forEach(k=>out[k]=[+pos[k][0].toFixed(5),+pos[k][1].toFixed(5)]);
fs.writeFileSync('data/pos.json',JSON.stringify(out,null,1));
let warn=0;
for (const L in DATA) for (const d in DATA[L]) {
  console.log(`\n=== Linija ${L} smjer ${d} (${DATA[L][d].from} → ${DATA[L][d].to}) ===`);
  let prev=null,total=0;
  DATA[L][d].stops.forEach(s=>{
    const k=s[1]+'|'+s[2], p=out[k];
    const gap=prev?Math.round(dist(prev,p)):0; total+=gap;
    const flag=gap>2200?'  <-- SUMNJIVO':''; if(flag) warn++;
    console.log(`  ${s[0].padEnd(8)} ${s[1].padEnd(36)} ${s[2].padEnd(19)} ${p.join(',').padEnd(18)} ${prev?'+'+gap+' m':''}${FIXED.has(k)?' [fiks]':''}${flag}`);
    prev=p;
  });
  console.log(`  zračno ukupno: ${(total/1000).toFixed(1)} km`);
}
console.log('\nsumnjivih skokova:', warn);
