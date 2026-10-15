// node tests/custom-economy.cjs — exact expected returns, pools and deterministic rebuild.
const assert = require('node:assert/strict');
global.window=global;
require('../data/cases.js');require('../js/custom-cases.js');
const boxes=buildCustomCases(GAME_DATA);
assert.equal(boxes.length,8);
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
 assert.ok(rtp<=b.rtp+1e-9 && rtp>=b.rtp-.03,`${b.n}: ${rtp}`);
 console.log(`${b.n}: $${b.p.toFixed(2)} · return ${(rtp*100).toFixed(1)}% · ${b.opens} opens / level ${b.level || 1}`);
}
assert.ok(boxes[0].p<=.5,'First case must be affordable from a fresh save');
assert.equal(boxes.find(b=>b.id==='hunt').weights[6],1);
assert.ok(boxes.filter(b=>['paper','holo'].includes(b.id)).every(b=>Object.values(b.g).flat().every(i=>GAME_DATA.items[i].t==='s')));
// Weekly data can reorder items without altering authored pools or prices.
const reordered={...GAME_DATA,items:[...GAME_DATA.items].reverse()};
const rebuilt=buildCustomCases(reordered);
for(let j=0;j<boxes.length;j++){
 assert.equal(boxes[j].p,rebuilt[j].p);
 for(const tier of Object.keys(boxes[j].g))assert.deepEqual(boxes[j].g[tier].map(i=>GAME_DATA.items[i].n),rebuilt[j].g[tier].map(i=>reordered.items[i].n));
}
