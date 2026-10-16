// node tests/containers.cjs — игровые цены обычных контейнеров (js/economy.js).
const assert = require('node:assert/strict');
global.window = global;
require('../data/cases.js'); require('../js/economy.js');
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
