'use strict';
/* Игровая цена контейнера считается от его содержимого, а не от цены Steam.
   Цена Steam у снятых с продажи сувениров и капсул — коллекционная (сотни долларов при дропе за доллары),
   а терминалы, наоборот, стоят копейки. Здесь у каждого контейнера средний возврат ~80%,
   и в нём всегда есть предметы дороже открытия. */
(function () {
  const CASE_ODDS = { 2: 79.92, 3: 15.98, 4: 3.2, 5: 0.64, 6: 0.26 };
  const WEAR = [[0, 0.07], [0.07, 0.15], [0.15, 0.38], [0.38, 0.45], [0.45, 1]];
  const RTP = 0.8, RTP_MAX = 0.95; // обычная цель и потолок для кейсов с почти одинаковыми предметами
  // максимальные «Удача» (+2%/ур. ×10) и «Скидка на ключи» (−2%/ур. ×10): даже с ними возврат ≤ RTP_MAX
  const LUCK_MAX = 0.2, KEYDISC_MAX = 0.2, ST_MAX = 0.2; // StatTrak™: 10% + 1%/ур. ×10
  function near(a, w) {
    if (!a) return null;
    if (a[w] != null) return a[w];
    for (let d = 1; d < 5; d++) { if (a[w - d] != null) return a[w - d]; if (a[w + d] != null) return a[w + d]; }
    return null;
  }
  function price(it, w, st) {
    if (it.v) w = 0;
    if (st) return near(it.st, w) ?? +((near(it.p, w) || 0.03) * 1.4).toFixed(2);
    return near(it.p, w) ?? 0.03;
  }
  function itemEV(it, b, i, stBase = 0.1) {
    if (b.variants) return price(it, b.variants[i], false);
    if (it.v) return price(it, 0, false);
    const [a, c] = it.f, span = Math.max(c - a, 1e-6), stp = it.st && b.k !== 'souvenir' && b.k !== 'collection' ? stBase : 0; // из коллекций StatTrak™ не падает
    let ev = 0;
    WEAR.forEach(([lo, hi], k) => {
      const ov = Math.max(0, Math.min(c, hi) - Math.max(a, lo));
      if (ov) ev += ov / span * ((1 - stp) * price(it, k, false) + stp * price(it, k, true));
    });
    return ev;
  }
  function itemMax(it, b, i) {
    if (b.variants) return price(it, b.variants[i], false);
    return Math.max(...it.p.filter(v => v != null), ...(b.k !== 'souvenir' && b.k !== 'collection' && it.st ? it.st.filter(v => v != null) : []), 0.03);
  }
  function odds(b, luck = 0) {
    if (b.weights) { const t = Object.values(b.weights).reduce((s, v) => s + v, 0); return Object.entries(b.weights).map(([k, w]) => [+k, w / t]); }
    const ts = Object.keys(b.g).map(Number).sort((x, y) => x - y), caseLike = b.k === 'case' || b.k === 'terminal';
    const w = ts.map((t, k) => (caseLike ? (CASE_ODDS[t] ?? 1) : 5 ** -(t - ts[0])) * (k ? 1 + luck : 1));
    const s = w.reduce((x, y) => x + y, 0);
    return ts.map((t, k) => [t, w[k] / s]);
  }
  const boxEV = (data, b, luck = 0, st = 0.1) => odds(b, luck).reduce((s, [t, p]) => s + p * b.g[t].reduce((a, i) => a + itemEV(data.items[i], b, i, st), 0) / b.g[t].length, 0);
  const boxMax = (data, b) => Math.max(...Object.values(b.g).flat().map(i => itemMax(data.items[i], b, i)));
  // полная цена открытия (с ключом): 80% возврата, но не дороже 95% самого дорогого предмета,
  // если только так возврат не превысит 95%
  function fairCost(ev, max) {
    return Math.max(ev / RTP_MAX, Math.min(ev / RTP, max * 0.95));
  }
  window.ECONOMY = { boxEV, boxMax, fairCost, RTP, RTP_MAX, LUCK_MAX, KEYDISC_MAX };
  window.repriceContainers = function (data, boxes) {
    for (const b of boxes) {
      if (b.k === 'custom') continue; // авторские кейсы считаются в custom-cases.js
      const total = fairCost(boxEV(data, b), boxMax(data, b));
      // у дешёвых кейсов ключ за $2.49 съел бы весь возврат — для них ключ дешевле
      const key = b.k === 'case' ? Math.min(data.key, Math.round((total - 0.03) * 100) / 100) : 0;
      const luckFloor = boxEV(data, b, LUCK_MAX, ST_MAX) / RTP_MAX - key * (1 - KEYDISC_MAX);
      b.mp = b.p; // цена Steam — для справки
      b.key = key;
      b.p = Math.max(0.03, Math.ceil(Math.max(total - key, luckFloor) * 100) / 100);
    }
    return boxes;
  };
})();
