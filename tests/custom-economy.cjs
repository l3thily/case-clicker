// node tests/custom-economy.cjs — exact expected returns, pools and deterministic rebuild.
const assert = require('node:assert/strict');
global.window=global;
require('../data/cases.js');require('../js/custom-cases.js');
const boxes=buildCustomCases(GAME_DATA);
assert.equal(boxes.length,58);
assert.equal(new Set(boxes.map(b=>b.id)).size,58);
assert.deepEqual(boxes.reduce((a,b)=>(a[b.series]=(a[b.series]||0)+1,a),{}),{classic:8,rarity:10,weapon:12,theme:12,sticker:10,elite:6});
assert.deepEqual(boxes,buildCustomCases(GAME_DATA));
const boundaries=[[0,.07],[.07,.15],[.15,.38],[.38,.45],[.45,1]];
for(const b of boxes){
 const total=Object.values(b.weights).reduce((a,v)=>a+v,0);
 let expected=0;
 for(const [tier,pool] of Object.entries(b.g)){
  assert.ok(pool.length>0);assert.equal(new Set(pool).size,pool.length);
  for(const i of pool){
   const it=GAME_DATA.items[i],w=b.variants[i];assert.equal(it.r,+tier);assert.ok(it.p[w]>0);
   if(!it.v)assert.ok(Math.min(it.f[1],boundaries[w][1])>Math.max(it.f[0],boundaries[w][0]));
   expected+=b.weights[tier]/total/pool.length*it.p[w];
  }
 }
 const rtp=expected/b.p;
 assert.ok(rtp<=b.rtp+1e-9,`${b.n}: ${rtp}`);
 assert.equal(b.p,Math.max(.1,Math.ceil(expected/b.rtp*100-1e-8)/100));
 console.log(`${b.n}: $${b.p.toFixed(2)} · return ${(rtp*100).toFixed(1)}% · ${b.opens} opens / level ${b.level || 1}`);
}
assert.ok(boxes[0].p<=.5,'First case must be affordable from a fresh save');
assert.equal(boxes.find(b=>b.id==='hunt').weights[6],1);
assert.ok(boxes.filter(b=>['paper','holo'].includes(b.id)).every(b=>Object.values(b.g).flat().every(i=>GAME_DATA.items[i].t==='s')));
// Weekly data can reorder items without altering authored pools or prices.
const reordered={...GAME_DATA,items:[...GAME_DATA.items].reverse(),boxes:GAME_DATA.boxes.map(b=>({...b,g:Object.fromEntries(Object.entries(b.g).map(([t,pool])=>[t,pool.map(i=>GAME_DATA.items.length-1-i)]))}))};
const rebuilt=buildCustomCases(reordered);
for(let j=0;j<boxes.length;j++){
 assert.equal(boxes[j].p,rebuilt[j].p);
 for(const tier of Object.keys(boxes[j].g))assert.deepEqual(boxes[j].g[tier].map(i=>GAME_DATA.items[i].n),rebuilt[j].g[tier].map(i=>reordered.items[i].n));
}

// Theme promises must hold for every actual drop, not just the cover.
const byId=id=>boxes.find(b=>b.id===id);
const items=id=>Object.values(byId(id).g).flat().map(i=>GAME_DATA.items[i]);
for(const [id,tier] of [['blueprint',2],['purple-room',3],['pink-signal',4],['red-access',5]])assert.deepEqual(Object.keys(byId(id).g),[String(tier)]);
for(const [id,prefix] of [['ak-club','AK-47 | '],['awp-observatory','AWP | '],['silencer','M4A1-S | '],['glock-party','Glock-18 | ']])assert.ok(items(id).every(it=>it.n.startsWith(prefix)));
assert.ok(items('butterfly-effect').every(it=>it.n.includes('Butterfly Knife')));
assert.ok(items('karambit-orbit').every(it=>it.n.includes('Karambit')));
assert.ok(items('glove-box').every(it=>/Gloves|Hand Wraps/.test(it.n)));
assert.ok(items('knife-vault').every(it=>it.r===6 && !/Gloves|Hand Wraps/.test(it.n)));
for(const [id,re] of [['holo-prism',/\(Holo\)/],['glitter-rain',/\(Glitter\)/],['foil-forge',/\(Foil\)/],['gold-leaf',/\(Gold\)/]])assert.ok(items(id).every(it=>it.t==='s'&&re.test(it.n)));
const autograph=new Set(GAME_DATA.boxes.filter(b=>b.k==='autograph').flatMap(b=>Object.values(b.g).flat()));
assert.ok(Object.values(byId('autograph-desk').g).flat().every(i=>autograph.has(i)));
const signatures=boxes.map(b=>JSON.stringify([b.g,b.weights]));
assert.equal(new Set(signatures).size,boxes.length,'Every case needs a distinct drop pool / risk profile');
for(const b of boxes)assert.ok(require('node:fs').existsSync(require('node:path').join(__dirname,'..',b.img)));
console.log('PASS: 58 distinct cases, strict themes, prices, covers and stable reordered data');
