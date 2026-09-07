const fs=require('fs');
const UA={'User-Agent':'virovitica-bus-webapp/1.0','Content-Type':'text/plain'};
const B='45.72,17.22,45.90,17.55';
const q=`[out:json][timeout:90];
( node["place"](${B}); );
out body;`;
(async()=>{
 const r=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',headers:UA,body:q});
 const txt=await r.text();
 const j=JSON.parse(txt);
 const out={};
 j.elements.forEach(e=>{ if(e.lat==null||!e.tags||!e.tags.name) return; out[e.tags.name]=[+e.lat.toFixed(5),+e.lon.toFixed(5)]; });
 fs.writeFileSync('data/places.json',JSON.stringify(out,null,1));
 console.log('naselja:',Object.keys(out).length);
 console.log(Object.entries(out).map(([k,v])=>k.padEnd(28)+v.join(',')).sort().join('\n'));
})();
