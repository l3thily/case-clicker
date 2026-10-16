// node tests/containers.cjs — игровые цены обычных контейнеров (js/economy.js).
const assert = require('node:assert/strict');
global.window = global;
require('../data/cases.js');require('../js/valuation.js'); require('../js/economy.js');
const D = GAME_DATA, E = ECONOMY;
const boxes = repriceContainers(D, D.boxes.map(b => ({ ...b })));
for (const b of boxes) {
  const cost = b.p + b.key, ev = E.boxEV(D, b);
  assert.ok(b.key >= 0 && b.key <= D.key, `${b.n}: ключ ${b.key}`);
  assert.ok(E.boxMax(D, b) > cost, `${b.n}: самый дорогой предмет дешевле открытия`);
  assert.ok(ev / cost <= E.RTP_MAX + 1e-6, `${b.n}: возврат ${ev / cost}`);
  // с максимальными «Удачей», StatTrak™ и скидкой на ключ кейсы всё ещё не печатают деньги
  assert.ok(E.boxEV(D, b, E.LUCK_MAX, 0.2) / (b.p + b.key * (1 - E.KEYDISC_MAX)) <= E.RTP_MAX + 1e-6, `${b.n}: возврат с улучшениями`);
}
// редкие предметы без продаж в Steam не теряются
const has = (box, re) => Object.values(D.boxes.find(b => b.n === box).g).flat().some(i => re.test(D.items[i].n));
assert.ok(has('DreamHack 2014 Cobblestone Souvenir Package', /AWP \| Dragon Lore/));
assert.ok(has('EMS Katowice 2014 Challengers', /iBUYPOWER \(Holo\)/));
assert.ok(has('EMS Katowice 2014 Legends', /Titan \(Holo\)/));
console.log(`PASS: ${boxes.length} containers, every one has a drop above its cost, return ≤ ${E.RTP_MAX * 100}%`);

// Every marketed wear must contain an ordinary float: buying the quoted base price
// must never give an unavoidable premium and an instant resale profit.
const wearBounds = [[0,.07],[.07,.15],[.15,.38],[.38,.45],[.45,1]];
for (const it of D.items) if (!it.phw && !it.hide && !it.v && ['w','sv','k'].includes(it.t)) {
  assert.ok(Array.from({length:1000},(_,seed)=>VALUATION.pattern(it,seed)[1]).includes(1), it.n + ': no ordinary pattern');
  wearBounds.forEach(([lo,hi],w)=>{
    const a=Math.max(it.f[0],lo),b=Math.min(it.f[1],hi);
    if (it.p[w] == null || b<=a) return;
    const normalLo=Math.max(a,[.01,.075,.16,.38,.45][w]),normalHi=Math.min(b,w===4?.99:b);
    assert.ok(normalHi>normalLo && VALUATION.float(it,(normalLo+normalHi)/2)[1]===1,it.n+': no ordinary float in wear '+w);
  });
}
