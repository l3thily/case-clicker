'use strict';
/* Case Clicker — ремейк на настоящих кейсах CS2. Данные: data/cases.js (tools/build_data.py) */
const D = window.GAME_DATA;
const CDN = D.cdn;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd = Math.random;
const pick = a => a[Math.floor(rnd() * a.length)];

// ---------- справочники ----------
const TIERS = [
  { n: 'Ширпотреб', c: '#b0c3d9' }, { n: 'Промышленное', c: '#5e98d9' }, { n: 'Армейское', c: '#4b69ff' },
  { n: 'Запрещённое', c: '#8847ff' }, { n: 'Засекреченное', c: '#d32ce6' }, { n: 'Тайное', c: '#eb4b4b' },
  { n: '★ Редкий особый', c: '#e4ae39' },
];
const FLAT_T = { 2: 'Высшего класса', 3: 'Примечательное', 4: 'Экзотичное', 5: 'Экстраординарное' };
const CASE_ODDS = { 2: 79.92, 3: 15.98, 4: 3.2, 5: 0.64, 6: 0.26 };
const WEAR = [
  { n: 'Прямо с завода', s: 'FN', a: 0, b: 0.07 }, { n: 'Немного поношенное', s: 'MW', a: 0.07, b: 0.15 },
  { n: 'После полевых испытаний', s: 'FT', a: 0.15, b: 0.38 }, { n: 'Поношенное', s: 'WW', a: 0.38, b: 0.45 },
  { n: 'Закалённое в боях', s: 'BS', a: 0.45, b: 1 },
];
const KINDS = {
  custom: { n: 'Авторские', ic: '✦' },
  case: { n: 'Кейсы', ic: '📦', key: true },
  terminal: { n: 'Терминалы', ic: '🖥️' },
  collection: { n: 'Коллекции', ic: '🗂️', unl: 'collection' },
  souvenir: { n: 'Сувенирные наборы', ic: '🏆', unl: 'souvenir' },
  sticker: { n: 'Наклейки', ic: '🏷️', unl: 'sticker' },
  autograph: { n: 'Автографы', ic: '✍️', unl: 'autograph' },
  patch: { n: 'Нашивки', ic: '🎖️', unl: 'patch' },
  pin: { n: 'Пины', ic: '📍', unl: 'patch' },
};
const RANKS = [
  ['Silver I', 0], ['Silver II', 0], ['Silver III', 0], ['Silver IV', 0], ['Silver Elite', 0], ['Silver Elite Master', 0],
  ['Gold Nova I', 1], ['Gold Nova II', 1], ['Gold Nova III', 1], ['Gold Nova Master', 1],
  ['Master Guardian I', 2], ['Master Guardian II', 2], ['Master Guardian Elite', 2], ['Distinguished Master Guardian', 2],
  ['Legendary Eagle', 3], ['Legendary Eagle Master', 3], ['Supreme Master First Class', 4], ['The Global Elite', 5],
];
const RANK_COL = ['#b8c2cf', '#e8b84a', '#5fa2ff', '#c58cff', '#ff6b6b', '#ffd45c'];
const rankNeed = r => r * (r + 3) / 2; // очки миссий для звания r
const LVL_MAX = 40;
const lvlNeed = l => 100 + 25 * l;
const MEDAL_COL = ['#9aa4b1', '#3ee08f', '#4b9bff', '#a368ff', '#e04bd8', '#ff5a5f', '#ffd45c'];

// цена автокликера растёт быстрее дохода: каждый следующий уровень окупается дольше
const AUTO_GROWTH = 1.2, AUTO_GAIN = 1.12;
const UPG = {
  click: { n: 'Сила клика', ic: '👆', d: l => `+${fmt(clickBase(l + 1) - clickBase(l))} за клик`, cost: l => 1 * 1.16 ** l, max: 250, quick: 1 },
  auto: { n: 'Автокликер', ic: '🤖', d: l => `+${fmt(autoGain(l) * incomeMult())}/сек · окупится за ${fmtDur(UPG.auto.cost(l) / Math.max(1e-9, autoGain(l) * incomeMult()))}`, cost: l => 4 * AUTO_GROWTH ** l, max: 250, quick: 1 },
  crit: { n: 'Хедшот', ic: '🎯', d: l => `Шанс клика ×10: ${l * 2}% → ${(l + 1) * 2}%`, cost: l => 15 * 1.55 ** l, max: 25, quick: 1 },
  combo: { n: 'Комбо', ic: '🔥', d: l => `Макс. комбо ×${comboMax(l).toFixed(2)} → ×${comboMax(l + 1).toFixed(2)}`, cost: l => 10 * 1.7 ** l, max: 14 },
  offline: { n: 'Оффлайн-доход', ic: '🌙', d: l => `Копится до ${l + 1} → ${l + 2} ч, пока вас нет`, cost: l => 25 * 2.1 ** l, max: 11 },
  luck: { n: 'Удача', ic: '🍀', d: l => `Шанс редкого дропа +${l * 2}% → +${(l + 1) * 2}%`, cost: l => 60 * 2.2 ** l, max: 10 },
  stattrak: { n: 'StatTrak™', ic: '🔢', d: l => `Шанс StatTrak™ ${10 + l}% → ${11 + l}%`, cost: l => 40 * 1.9 ** l, max: 10 },
  keydisc: { n: 'Скидка на ключи', ic: '🔑', d: l => `Ключ −${l * 2}% → −${(l + 1) * 2}%`, cost: l => 30 * 1.8 ** l, max: 10 },
};
const clickBase = l => 0.05 + l * 0.05 * (1 + l / 50);
const autoGain = l => 0.03 * AUTO_GAIN ** l;
const autoBase = l => 0.03 * Math.expm1(l * Math.log(AUTO_GAIN)) / (AUTO_GAIN - 1);
// комиссия площадки при продаже, как в Steam; контракты, апгрейд и джекпот считают полную цену
const SELL_FEE = 0.1;
const comboMax = l => 1.5 + 0.25 * l;

const UNLOCKS = [
  ['tradeup', '📝', 'Контракты обмена', '10 скинов → 1 качеством выше', 20],
  ['collection', '🗂️', 'Коллекции', 'Коллекции карт и операций: скины, которых нет в кейсах', 30],
  ['equip', '🎒', 'Экипировка', 'Наденьте скин: бонус к доходу от его цены', 15],
  ['sticker', '🏷️', 'Капсулы с наклейками', 'Капсулы с 2014 по 2026 год', 25],
  ['souvenir', '🏆', 'Сувенирные наборы', 'Коллекции карт с мейджоров', 50],
  ['upgrade', '⬆️', 'Апгрейдер', 'Поднимайте предметы с шансом', 60],
  ['coinflip', '🪙', 'Монетка', 'CT или T, ×1.96', 25],
  ['autograph', '✍️', 'Капсулы с автографами', 'Автографы про-игроков мейджоров', 120],
  ['patch', '🎖️', 'Нашивки и пины', 'Патч-паки и коллекционные пины', 80],
  ['crash', '🚀', 'Краш', 'Заберите до взрыва', 100],
  ['battle', '⚔️', 'Батлы кейсов', 'Открывайте кейсы против ботов: победитель забирает всё', 200],
  ['roulette', '🎡', 'Рулетка', 'Красное, чёрное или зелёное ×14', 150],
  ['mines', '💣', 'Мины', 'Открывайте клетки, обходя мины', 250],
  ['tower', '🗼', 'Башня', 'Поднимайтесь выше — множитель растёт', 400],
  ['jackpot', '💰', 'Джекпот', 'Ставьте скины против ботов', 1000],
];
const UNL = Object.fromEntries(UNLOCKS.map(u => [u[0], u]));

// ---------- данные ----------
const ITEMS = D.items;
const BOXES = [...window.repriceContainers(D, D.boxes), ...window.buildCustomCases(D)];
const keyOf = it => (it.t === 'sv' ? 'Souvenir ' : '') + it.n;
const KEYMAP = new Map(ITEMS.map((it, i) => [keyOf(it), i]));
const BOXMAP = new Map(BOXES.map((b, i) => [b.n, i]));
const origin = new Map(); // предмет → контейнер (оружейные кейсы в приоритете — для контрактов)
BOXES.forEach((b, bi) => Object.values(b.g).forEach(l => l.forEach(i => {
  const cur = origin.get(i);
  const rank = k => (k === 'case' ? 0 : k === 'collection' ? 1 : 2); // для контрактов: кейс, затем коллекция
  if (cur == null || rank(b.k) < rank(BOXES[cur].k)) origin.set(i, bi);
})));
// фазы Doppler: в кейсе лежит базовый нож, при выпадении выбирается фаза по весам из данных
const PHASE_BASE = new Map(); // предмет-фаза → базовый предмет
ITEMS.forEach((it, i) => (it.phw || []).forEach(([p]) => { PHASE_BASE.set(p, i); if (origin.has(i)) origin.set(p, origin.get(i)); }));
function resolvePhase(i, u = rnd()) {
  const ph = ITEMS[i].phw; if (!ph) return i;
  let r = u * ph.reduce((s, [, w]) => s + w, 0);
  for (const [p, w] of ph) { if (r < w) return p; r -= w; }
  return ph[ph.length - 1][0];
}
const inBoxes = new Map(); // предмет → все контейнеры, где он есть (для альбома)
BOXES.forEach((b, bi) => Object.values(b.g).flat().forEach(i => { if (!inBoxes.has(i)) inBoxes.set(i, []); const l = inBoxes.get(i); if (l[l.length - 1] !== bi) l.push(bi); }));
// альбом: все предметы контейнера, кроме ★ у обычных кейсов (их сотни, шанс 0.26%)
const albumPool = b => b._pool || (b._pool = [...new Set(Object.entries(b.g).filter(([t]) => b.k === 'custom' || +t < 6).flatMap(([, l]) => l))]);
const isFlat = it => it.t === 's' || it.t === 'patch' || it.t === 'pin';
const tierName = it => (isFlat(it) ? FLAT_T[it.r] : null) || TIERS[it.r].n;
const tcol = r => TIERS[r].c;
const img = (h, size = '256fx192f') => (h.startsWith('http') || h.startsWith('./') ? h : `${CDN}${h}/${size}`);
const wearIdx = f => (f < 0.07 ? 0 : f < 0.15 ? 1 : f < 0.38 ? 2 : f < 0.45 ? 3 : 4);
function nearest(arr, w) {
  if (!arr) return null;
  if (arr[w] != null) return arr[w];
  for (let d = 1; d < 5; d++) {
    if (arr[w - d] != null) return arr[w - d];
    if (arr[w + d] != null) return arr[w + d];
  }
  return null;
}
function variantPrice(i, w, st) {
  const it = ITEMS[i];
  if (it.v) w = 0;
  if (st) return nearest(it.st, w) ?? +((nearest(it.p, w) || 0.03) * 1.4).toFixed(2);
  return nearest(it.p, w) ?? 0.03;
}
const priceOf = x => +(variantPrice(x.i, ITEMS[x.i].v ? 0 : wearIdx(x.fl), x.st) * patternOf(x)[1] * floatOf(x)[1] + stickerPremium(x)).toFixed(2);
function nameParts(i, st) {
  const it = ITEMS[i];
  if (it.t === 's') return [it.n.slice(10), 'Наклейка'];
  if (it.t === 'patch') return [it.n.slice(8), 'Нашивка'];
  if (it.t === 'pin') return [it.n, 'Коллекционный пин'];
  const k = it.n.indexOf(' | ');
  let w = k < 0 ? it.n : it.n.slice(0, k);
  const s = k < 0 ? '' : it.n.slice(k + 3);
  if (st) w = w.startsWith('★ ') ? '★ StatTrak™ ' + w.slice(2) : 'StatTrak™ ' + w;
  if (it.t === 'sv') w = 'Сувенирный ' + w;
  return s ? [s, w] : [w, 'Ванильный'];
}
// ---------- паттерны, float, наклейки ----------
// Рыночная цена = обычный экземпляр. Редкий паттерн, низкий/максимальный float и наклейки дают премию сверху.
// Цель апгрейда и ставки ботов — обычный экземпляр (как самый дешёвый лот); премии случаются только в дропе.
const chBlue = window.VALUATION.chBlue;
const patternOf = x => window.VALUATION.pattern(ITEMS[x.i], x.s);
const floatOf = x => window.VALUATION.float(ITEMS[x.i], x.fl);
// наклейки: часть их цены добавляется к скину (в CS2 обычно 5–10%, Katowice/Cologne 2014 — больше)
const stickerKeys = x => (x.stickers || []).filter(Boolean);
function stickerRate(n) { return /Katowice 2014|Cologne 2014|DreamHack 2014|Katowice 2015/.test(n) ? 0.2 : /\((Holo|Foil|Gold|Glitter|Lenticular)\)/.test(n) ? 0.08 : 0.05; }
function stickerPremium(x) {
  return stickerKeys(x).reduce((s, k) => { const i = KEYMAP.get(k); return i == null ? s : s + ITEMS[i].p[0] * stickerRate(ITEMS[i].n); }, 0);
}
// Case Hardened: перекрашиваем картинку по доле синего. SVG-фильтр считает «желтизну» пикселя (R−B)
// и переводит золото в синий (или синий в золото при малой доле) — работает и с картинками Steam CDN без CORS.
(function chFilters() {
  const f = [];
  for (let n = 0; n <= 10; n++) {
    const bl = n * 10, toBlue = bl >= 35, k = toBlue ? Math.min(1, ((bl - 35) / 65) * 1.15) : ((35 - bl) / 35) * 0.6;
    // маска: золото (G ≫ B, R ≈ G; дерево с R ≫ G не попадает) или синий (B ≫ R)
    const mask = toBlue ? '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -6 14 -8 0 0' : '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 7 0 -0.15';
    // перенос цвета: золото → синий или синий → золото, на долю k
    const swap = toBlue
      ? `${1 - k} 0 ${k} 0 0  0 ${1 - 0.45 * k} ${0.1 * k} 0 0  ${k} 0 ${1 - k} 0 0  0 0 0 1 0`
      : `${1 - k} 0 ${k} 0 0  0 1 ${0.3 * k} 0 0  ${k} 0 ${1 - k} 0 0  0 0 0 1 0`;
    f.push(`<filter id="ch${n}" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="${mask}" result="m"/><feColorMatrix in="SourceGraphic" type="matrix" values="${swap}" result="s"/><feComposite in="s" in2="m" operator="in" result="t"/><feComposite in="t" in2="SourceGraphic" operator="over"/></filter>`);
  }
  document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${f.join('')}</svg>`);
})();
function skinFilter(x) {
  if (x.s == null || !/Case Hardened/.test(ITEMS[x.i].n)) return '';
  return `filter:url(#ch${Math.round(chBlue(x.s) / 10)}) drop-shadow(0 8px 14px rgba(0,0,0,.6))`;
}
function skinImg(x, size, extra = '') {
  const f = skinFilter(x);
  return `<img ${extra} src="${img(ITEMS[x.i].img, size)}" alt=""${f ? ` style="${f}"` : ''}>`;
}
function fullName(i, st) {
  const it = ITEMS[i];
  if (isFlat(it)) return it.n;
  let n = it.n;
  if (st) n = n.startsWith('★ ') ? '★ StatTrak™ ' + n.slice(2) : 'StatTrak™ ' + n;
  return (it.t === 'sv' ? 'Souvenir ' : '') + n;
}

// каталог вариантов (апгрейд, боты джекпота)
const CATALOG = [];
ITEMS.forEach((it, i) => {
  if (it.phw || it.hide) return; // базовый Doppler не продаётся — продаются конкретные фазы
  const [a, b] = it.f;
  const wears = it.v ? [0] : [0, 1, 2, 3, 4].filter(k => Math.min(b, WEAR[k].b) > Math.max(a, WEAR[k].a));
  for (const w of wears) {
    if (it.p[w] != null) CATALOG.push({ i, w, st: false, p: it.p[w] });
    if (it.st && it.st[w] != null) CATALOG.push({ i, w, st: true, p: it.st[w] });
  }
});
CATALOG.sort((x, y) => x.p - y.p);
CATALOG.forEach((v, k) => { v.id = k; });

// ---------- состояние ----------
const SAVE_KEY = 'caseclicker.v2';
const VERSION = '2026.10.17';
const fresh = () => ({
  v: 2, money: 0.5, xp: 0, lvl: 1, medals: 0, rp: 0, uid: 1, inv: [], eq: null,
  up: Object.fromEntries(Object.keys(UPG).map(k => [k, 0])), unl: {},
  st: { clicks: 0, crits: 0, clickEarn: 0, opened: 0, spent: 0, dropValue: 0, sold: 0, knives: 0, stDrops: 0, tradeups: 0, upWins: 0, upLoss: 0, crashBest: 0, gambleNet: 0, gameWins: 0, bought: 0, best: null, lowFloat: 1, missions: 0, stickers: 0, souvenirs: 0, maxCombo: 1, jackpots: 0, battles: 0, battleWins: 0, bonuses: 0, orders: 0, freeOpened: 0 },
  missions: [], ach: {}, daily: { last: '', streak: 0 }, last: Date.now(), found: {}, album: {}, orders: [], free: {},
  set: { fast: false, sound: true, fx: true, kind: 'custom', invKind: 'all', game: 'crash', autoSell: 0, btBox: '', seen: '' },
});
// в сохранении предметы хранятся по названию, а не индексу — данные пересобираются каждую неделю
function packItem(x) { return { u: x.u, k: keyOf(ITEMS[x.i]), b: BOXES[x.c]?.n, fl: x.fl, st: x.st ? 1 : 0, s: x.s, t: x.t, stickers: x.stickers || [], f: x.fav ? 1 : 0 }; }
function unpackItem(o) {
  let i = KEYMAP.get(o.k); if (i == null) return null;
  if (ITEMS[i].phw) i = resolvePhase(i, ((o.s ?? 0) + 0.5) / 1000); // старый Doppler без фазы → фаза по seed
  return { u: o.u, i, c: BOXMAP.get(o.b) ?? origin.get(i), fl: o.fl, st: !!o.st, s: o.s, t: o.t, stickers: (o.stickers || []).slice(0, 5).map(k => (k && KEYMAP.has(k) ? k : null)), fav: !!o.f };
}
let S = fresh();
try {
  let raw = localStorage.getItem(SAVE_KEY), migrated = false;
  if (!raw && localStorage.getItem('caseclicker.v1')) { raw = localStorage.getItem('caseclicker.v1'); migrated = true; }
  if (raw) {
    const o = JSON.parse(raw), f = fresh();
    S = Object.assign(f, o);
    for (const k of ['st', 'up', 'set', 'daily']) S[k] = Object.assign(fresh()[k], o[k]);
    S.inv = migrated ? [] : (o.inv || []).map(unpackItem).filter(Boolean);
    if (migrated) { S.v = 2; S.st.best = null; setTimeout(() => toast('Большое обновление!', 'Деньги и улучшения перенесены, инвентарь обнулён.'), 800); }
    if (S.eq != null && !S.inv.some(x => x.u === S.eq)) S.eq = null;
    // маркет убран: стоимость разблокировки возвращается
    if (S.unl.market) { delete S.unl.market; S.money += 30; }
  }
} catch { S = fresh(); }
S.inv.forEach(x => { S.found[keyOf(ITEMS[PHASE_BASE.get(x.i) ?? x.i])] = 1; });
BOXES.forEach(b => { if (!S.album[b.n] && albumPool(b).length && albumPool(b).every(i => S.found[keyOf(ITEMS[i])])) S.album[b.n] = Date.now(); });
let replacingSave = false;
function save() {
  if (replacingSave) return;
  S.last = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, inv: S.inv.map(packItem) })); } catch {}
}
const unlocked = k => !k || !!S.unl[k];

// ---------- экономика ----------
const rankOf = () => { let r = 0; while (r < RANKS.length - 1 && S.rp >= rankNeed(r + 1)) r++; return r; };
const eqItem = () => S.inv.find(x => x.u === S.eq);
const eqBonus = () => { const x = eqItem(); return x ? 0.2 * Math.log10(1 + priceOf(x)) : 0; };
const albumCount = () => Object.keys(S.album).length;
const incomeMult = () => (1 + 0.05 * rankOf()) * (1 + 0.1 * S.medals) * (1 + eqBonus()) * (1 + 0.01 * albumCount());
// временные бусты из бонус-дропа кликера (не сохраняются)
const boost = { click: 1, clickUntil: 0, auto: 1, autoUntil: 0 };
const boostClick = () => (Date.now() < boost.clickUntil ? boost.click : 1);
const boostAuto = () => (Date.now() < boost.autoUntil ? boost.auto : 1);
const baseSec = () => autoBase(S.up.auto) * incomeMult(); // для наград: без временных бустов
const perClick = () => clickBase(S.up.click) * incomeMult() * boostClick();
const perSec = () => baseSec() * boostAuto();
// у дешёвых кейсов ключ дешевле $2.49 (js/economy.js), без аргумента — обычный ключ
const keyPrice = (b) => +((b?.key ?? D.key) * (1 - 0.02 * S.up.keydisc)).toFixed(2);
const boxCost = b => +(b.p + (KINDS[b.k].key ? keyPrice(b) : 0)).toFixed(2);
function boxOdds(b) {
  if (b.weights) { const total = Object.values(b.weights).reduce((a,v) => a+v,0); return Object.entries(b.weights).map(([t,w]) => [+t,w/total]); }
  const tiers = Object.keys(b.g).map(Number).sort((x, y) => x - y);
  const caseLike = b.k === 'case' || b.k === 'terminal';
  let w = tiers.map(t => caseLike ? (CASE_ODDS[t] ?? 1) : 5 ** -(t - tiers[0]));
  const L = 1 + S.up.luck * 0.02;
  w = w.map((x, k) => (k ? x * L : x));
  const sum = w.reduce((s, x) => s + x, 0);
  return tiers.map((t, k) => [t, w[k] / sum]);
}

// ---------- утилиты ----------
function fmt(n) {
  const a = Math.abs(n);
  const v = a >= 1e6 ? a.toLocaleString('en-US', { maximumFractionDigits: 0 }) : a >= 100 ? a.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : a.toFixed(2);
  return (n < 0 ? '-$' : '$') + v;
}
function fmtDur(sec) {
  if (sec < 90) return Math.ceil(sec) + ' с';
  if (sec < 5400) return Math.round(sec / 60) + ' мин';
  if (sec < 172800) return (sec / 3600).toFixed(1).replace('.0', '') + ' ч';
  return Math.round(sec / 86400) + ' дн';
}
const pct = p => (p >= 0.1 ? p.toFixed(2) : p >= 0.001 ? p.toFixed(3) : p.toFixed(4)) + '%';
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function addMoney(x) { S.money = Math.round((S.money + x) * 1e4) / 1e4; }
const canPay = x => S.money + 1e-9 >= x;
function pay(x) { if (!canPay(x)) { toast('Недостаточно денег', `Нужно ${fmt(x)}`, 'bad'); beep('err'); return false; } addMoney(-x); return true; }
function toast(title, text = '', cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls; el.innerHTML = `<b>${esc(title)}</b>${esc(text)}`;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 3800);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
}
function modal(html, onBind) { $('#modalBox').classList.remove('reward-reveal'); $('#modalBox').style.removeProperty('--reward-color'); $('#modalBox').innerHTML = html; $('#modal').hidden = false; onBind && onBind($('#modalBox')); }
function closeModal() { $('#modal').hidden = true; $('#modalBox').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// звук
let AC;
function beep(kind) {
  if (!S.set.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    const cfg = { tick: [1500, 0.03, 0.04, 'square'], click: [480, 0.05, 0.05, 'triangle'], win: [880, 0.25, 0.1, 'triangle'], rare: [1320, 0.7, 0.12, 'sine'], err: [170, 0.16, 0.07, 'sawtooth'], coin: [720, 0.1, 0.07, 'triangle'], open: [220, 0.4, 0.08, 'sawtooth'] }[kind];
    o.type = cfg[3]; o.frequency.setValueAtTime(cfg[0], t);
    if (kind === 'win' || kind === 'rare') o.frequency.exponentialRampToValueAtTime(cfg[0] * 1.5, t + cfg[1]);
    if (kind === 'open') o.frequency.exponentialRampToValueAtTime(880, t + cfg[1]);
    g.gain.setValueAtTime(cfg[2], t); g.gain.exponentialRampToValueAtTime(0.0001, t + cfg[1]);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + cfg[1]);
  } catch {}
}

// ---------- эффекты ----------
const FX = (() => {
  const cv = $('#fx'), cx = cv.getContext('2d'), parts = [];
  let raf = 0;
  const resize = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
  addEventListener('resize', resize); resize();
  function loop() {
    cx.clearRect(0, 0, cv.width, cv.height);
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k];
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.life -= 1; p.rot += p.vr;
      if (p.life <= 0) { parts.splice(k, 1); continue; }
      cx.globalAlpha = Math.min(1, p.life / 30);
      cx.fillStyle = p.c;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
      if (p.round) { cx.beginPath(); cx.arc(0, 0, p.s / 2, 0, 7); cx.fill(); } else cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx.restore();
    }
    cx.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(loop) : 0;
  }
  return {
    burst(x, y, colors, n = 80, power = 9, round = false) {
      if (!S.set.fx) return;
      const r = devicePixelRatio;
      for (let k = 0; k < n; k++) {
        const a = rnd() * Math.PI * 2, v = (0.3 + rnd()) * power * r;
        parts.push({ x: x * r, y: y * r, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3 * r, g: 0.22 * r, life: 60 + rnd() * 60, s: (5 + rnd() * 7) * r, c: pick(colors), rot: rnd() * 6, vr: (rnd() - 0.5) * 0.4, round });
      }
      if (!raf) raf = requestAnimationFrame(loop);
    },
  };
})();
// фон — тлеющие искры
(() => {
  const cv = $('#bgfx'), cx = cv.getContext('2d');
  let W, H; const P = [];
  const resize = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
  addEventListener('resize', resize); resize();
  for (let k = 0; k < 55; k++) P.push({ x: rnd() * W, y: rnd() * H, s: rnd() * 2 + 0.6, v: rnd() * 0.35 + 0.1, d: rnd() * 6, h: rnd() < 0.7 ? '255,159,28' : '120,150,255' });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop(t) {
    cx.clearRect(0, 0, W, H);
    if (S.set.fx && !reduce) {
      for (const p of P) {
        p.y -= p.v; p.x += Math.sin(t / 2000 + p.d) * 0.2;
        if (p.y < -10) { p.y = H + 10; p.x = rnd() * W; }
        const a = 0.25 + 0.25 * Math.sin(t / 700 + p.d);
        cx.fillStyle = `rgba(${p.h},${a})`; cx.beginPath(); cx.arc(p.x, p.y, p.s, 0, 7); cx.fill();
      }
    }
    if (S.set.fx && !reduce && !document.hidden) requestAnimationFrame(loop); else setTimeout(() => requestAnimationFrame(loop), 1000);
  }
  requestAnimationFrame(loop);
})();
function rankSVG(r, big) {
  const col = RANK_COL[RANKS[r][1]], tier = RANKS[r][1], id = 'rg' + r + (big ? 'b' : '');
  const chev = n => Array.from({ length: n }, (_, k) => `<path d="M${20 + k * 7} 7 l6 7 l-6 7" stroke="${col}" stroke-width="3" fill="none"/>`).join('');
  const stars = n => Array.from({ length: n }, (_, k) => `<path transform="translate(${32 + k * 11 - (n - 1) * 5.5} 14) scale(.6)" d="M0-9 2.6-3 9-2.8 4 1.4 5.6 8 0 4.4-5.6 8-4 1.4-9-2.8-2.6-3z" fill="${col}"/>`).join('');
  let inner;
  if (tier === 0) inner = chev(Math.min(r + 1, 4)) + (r >= 4 ? `<rect x="12" y="4" width="40" height="20" fill="none" stroke="${col}" stroke-width="1.5" rx="2"/>` : '') + (r === 5 ? `<path d="M10 14h4M50 14h4" stroke="${col}" stroke-width="2"/>` : '');
  else if (tier === 1) inner = stars(r - 5);
  else if (tier === 2) inner = `<path d="M22 6h20l-3 8 3 8H22l3-8z" fill="${col}" opacity=".85"/>` + (r >= 12 ? `<circle cx="32" cy="14" r="3" fill="#fff"/>` : '');
  else if (tier === 3) inner = `<path d="M12 15q20-16 40 0q-20 6-40 0z" fill="${col}"/><circle cx="32" cy="12" r="3" fill="#fff"/>` + (r === 15 ? stars(1).replace('translate(32 14)', 'translate(32 22)') : '');
  else if (tier === 4) inner = `<path d="M18 22l14-16 14 16z" fill="none" stroke="${col}" stroke-width="2.5"/>` + stars(1);
  else inner = `<circle cx="32" cy="14" r="9" fill="none" stroke="${col}" stroke-width="2.5"/><path d="M23 14h18M32 5q-6 9 0 18q6-9 0-18" stroke="${col}" stroke-width="1.5" fill="none"/>`;
  return `<svg viewBox="0 0 64 28"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2a3346"/><stop offset="1" stop-color="#121722"/></linearGradient></defs><rect x="1" y="1" width="62" height="26" rx="5" fill="url(#${id})" stroke="${col}" stroke-opacity=".6"/>${inner}</svg>`;
}

// карточка предмета
function itemCard(x, o = {}) {
  const it = ITEMS[x.i];
  const w = it.v ? null : (x.fl != null ? wearIdx(x.fl) : x.w);
  const [title, sub] = nameParts(x.i, x.st);
  const price = o.price ?? (x.fl != null ? priceOf(x) : variantPrice(x.i, w ?? 2, x.st));
  return `<div class="item ${o.cls || ''}" style="--c:${tcol(it.r)}" ${o.attr || ''}><i class="shine"></i>
    <span class="w">${w != null ? WEAR[w].s : ''}</span>${x.st ? '<span class="stt">ST™</span>' : it.t === 'sv' ? '<span class="stt sv">SV</span>' : ''}${x.fav ? '<span class="fav" title="Избранное">♥</span>' : ''}${o.got ? '<span class="got" title="Есть в альбоме">✓</span>' : ''}${x.s != null && (patternOf(x)[1] > 1 || floatOf(x)[1] > 1) ? `<span class="pat ${patternOf(x)[1] * floatOf(x)[1] >= 1.5 ? 'hot' : ''}">${esc(patternOf(x)[1] > 1 ? patternOf(x)[0] : floatOf(x)[0])}</span>` : ''}
    ${x.fl != null ? skinImg(x, '256fx192f', 'loading="lazy"') : `<img loading="lazy" src="${img(it.img)}" alt="">`}
    <div class="nm">${esc(title)}</div><div class="sub">${esc(sub)}</div>
    ${stickerKeys(x).length ? `<div class="sticker-strip">${stickerImages(x)}</div>` : ''}${o.extra || ''}<div class="pr">${fmt(price)}</div>${o.info ? `<button class="ibtn" data-info="${x.u}">i</button>` : ''}</div>`;
}

// ---------- навигация ----------
const ICONS = {
  clicker: '<path d="M9 3v8M5.5 6.5 9 3l3.5 3.5"/><path d="M9 11l9 4-3.5 1.5L17 21l-2 1-2.5-4.5L10 20z"/>',
  cases: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 12h18M10 10h4v4h-4zM8 7V5h8v2"/>',
  inventory: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  shop: '<path d="M4 10h16l-1-5H5zM5 10v9h14v-9M10 19v-5h4v5"/>',
  tradeup: '<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>',
  upgrade: '<circle cx="12" cy="12" r="9"/><path d="M12 16V8M8.5 11.5 12 8l3.5 3.5"/>',
  orders: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 12l2.5 2.5 4.5-5M9 18h6"/>',
  games: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3"/><circle cx="15.5" cy="15.5" r="1.3"/><circle cx="15.5" cy="8.5" r="1.3"/><circle cx="8.5" cy="15.5" r="1.3"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6"/>',
};
const TABS = [['clicker', 'Кликер'], ['cases', 'Кейсы'], ['inventory', 'Инвентарь'], ['shop', 'Магазин'], ['tradeup', 'Контракты', 'tradeup'], ['upgrade', 'Апгрейд', 'upgrade'], ['orders', 'Заказы'], ['games', 'Казино'], ['profile', 'Профиль']];
let curTab = 'clicker';
function renderNav() {
  $('#tabs').innerHTML = TABS.map(([id, n, u]) => `<button data-tab="${id}" class="${curTab === id || (curTab === 'open' && id === 'cases') ? 'on' : ''}"><svg viewBox="0 0 24 24">${ICONS[id]}</svg><span>${n}</span>${u && !unlocked(u) ? '<span class="lock">🔒</span>' : id === 'inventory' ? `<span class="badge">${S.inv.length}</span>` : id === 'orders' && !rolling && ordersReady() ? `<span class="badge ok">${ordersReady()}</span>` : ''}</button>`).join('');
}
const RENDER = {};
function showTab(t) {
  curTab = t;
  $$('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + t));
  renderNav();
  RENDER[t] && RENDER[t]();
  window.scrollTo({ top: 0 });
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) showTab(g.dataset.go); });
function lockWall(key) {
  const u = UNL[key];
  return `<div class="lockwall"><div class="ic">${u[1]}</div><h3>${u[2]}</h3><p class="muted">${u[3]}</p><button class="btn primary" data-unlock="${key}">Разблокировать за ${fmt(u[4])}</button></div>`;
}
// закрытая вкладка: прячем содержимое и показываем замок
function gate(secId, key) {
  const sec = $('#' + secId), wall = sec.querySelector(':scope > .lockwall');
  if (!unlocked(key)) {
    [...sec.children].forEach(c => { if (!c.classList.contains('lockwall')) c.hidden = true; });
    if (!wall) sec.insertAdjacentHTML('afterbegin', lockWall(key));
    return false;
  }
  if (wall) wall.remove();
  [...sec.children].forEach(c => { c.hidden = false; });
  return true;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-unlock]'); if (!b) return;
  const u = UNL[b.dataset.unlock];
  if (S.unl[u[0]] || !pay(u[4])) return;
  S.unl[u[0]] = Date.now(); beep('rare');
  const r = b.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top, ['#ff9f1c', '#ffc15e', '#fff'], 60);
  toast('Разблокировано', u[2], 'good'); save(); renderTop(); renderNav(); RENDER[curTab] && RENDER[curTab](); checkAch();
});

// ---------- шапка ----------
let shownMoney = S.money;
function renderTop() {
  const r = rankOf();
  $('#rankEmb').innerHTML = rankSVG(r);
  $('#rankName').textContent = RANKS[r][0];
  $('#lvlName').textContent = `Уровень ${S.lvl}${S.medals ? ' · медалей ' + S.medals : ''}`;
  $('#xpFill').style.width = (S.lvl >= LVL_MAX ? 100 : S.xp / lvlNeed(S.lvl) * 100).toFixed(1) + '%';
  const inv = $('#tabs [data-tab=inventory] .badge'); if (inv) inv.textContent = S.inv.length;
  $('#sideFoot').innerHTML = `Цены Steam на ${D.built}<br>${BOXES.length} контейнеров · ${ITEMS.length} предметов`;
}
function tickMoney() {
  const d = S.money - shownMoney;
  shownMoney = Math.abs(d) < 0.005 ? S.money : shownMoney + d * 0.25;
  $('#money').textContent = fmt(shownMoney);
}
$('#ranks').addEventListener('click', () => showTab('profile'));
function addXP(x) {
  if (S.lvl >= LVL_MAX) { S.xp = lvlNeed(S.lvl); return; }
  S.xp += x;
  while (S.lvl < LVL_MAX && S.xp >= lvlNeed(S.lvl)) {
    S.xp -= lvlNeed(S.lvl); S.lvl++;
    const bonus = Math.round((S.lvl * 0.6 * incomeMult() + baseSec() * 30) * 100) / 100;
    addMoney(bonus);
    const gift = giftCase();
    toast(`Уровень ${S.lvl}!`, `Награда ${fmt(bonus)}${gift ? ' и кейс «' + gift.n + '»' : ''}`, 'good');
    if (S.lvl >= LVL_MAX) toast('Максимальный уровень', 'Получите медаль за службу в профиле', 'gold');
  }
}

// ---------- кликер ----------
let combo = 1, lastClick = 0;
$('#clickBtn').addEventListener('pointerdown', e => { e.preventDefault(); doClick(e.clientX, e.clientY); });
function doClick(cx, cy) {
  const now = performance.now();
  combo = now - lastClick < 650 ? Math.min(comboMax(S.up.combo), combo + 0.02) : Math.max(1, combo);
  lastClick = now;
  S.st.maxCombo = Math.max(S.st.maxCombo, combo);
  let v = perClick() * combo; const crit = rnd() < S.up.crit * 0.02;
  if (crit) { v *= 10; S.st.crits++; }
  addMoney(v); S.st.clicks++; S.st.clickEarn += v; addXP(0.25);
  ev('click', v); ev('combo', combo);
  beep(crit ? 'win' : 'click');
  const zone = $('#clickZone'), r = zone.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'floater' + (crit ? ' crit' : '');
  f.textContent = (crit ? 'HEADSHOT +' : '+') + fmt(v);
  f.style.left = (cx - r.left - 30 + (rnd() * 40 - 20)) + 'px'; f.style.top = (cy - r.top - 40) + 'px';
  zone.append(f); setTimeout(() => f.remove(), 1000);
  if (crit) FX.burst(cx, cy, ['#ffc15e', '#ff9f1c', '#fff'], 30, 6, true);
  const btn = $('#clickBtn'); btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 70);
  renderCombo();
}
// пробел — клик в кликере, открытие на странице кейса; Enter/пробел в окне дропа — «Ещё раз»
document.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.code !== 'Space' && e.key !== 'Enter') return;
  if (!$('#modal').hidden) { const again = $('#dAgain'); if (again) { e.preventDefault(); again.click(); } return; }
  if (curTab === 'clicker' && e.code === 'Space') {
    e.preventDefault();
    const r = $('#clickBtn').getBoundingClientRect();
    doClick(r.left + r.width * (0.3 + rnd() * 0.4), r.top + r.height * (0.3 + rnd() * 0.4));
  } else if (curTab === 'open') { e.preventDefault(); $('#openBtn').click(); }
});

// бонус-дроп: золотой кейс появляется в кликере раз в 1.5–4 минуты на 12 секунд
let bonusAt = performance.now() + 60e3 + rnd() * 60e3, bonusHide = 0;
const BONUS = [
  [40, () => { const v = Math.max(0.25, baseSec() * 120 + clickBase(S.up.click) * incomeMult() * 80); addMoney(v); return ['Тайник', '+' + fmt(v)]; }],
  [27, () => { boost.click = 5; boost.clickUntil = Date.now() + 15e3; return ['Раш!', 'Клик ×5 на 15 секунд']; }],
  [20, () => { boost.auto = 4; boost.autoUntil = Date.now() + 30e3; return ['Овертайм', 'Автокликер ×4 на 30 секунд']; }],
  [13, () => { const b = giftCase(); return b ? ['Кейс в подарок', b.n + ' · откройте во вкладке «Кейсы»'] : BONUS[0][1](); }],
];
// бесплатный авторский кейс по силам игрока: из доступных, не дороже его текущего заработка
function giftCase() {
  const ready = BOXES.filter(b => b.k === 'custom' && customReady(b)).sort((a, b) => boxCost(a) - boxCost(b));
  if (!ready.length) return null;
  const cap = Math.max(0.5, S.money * 0.1, baseSec() * 300);
  const fit = ready.filter(b => boxCost(b) <= cap);
  const b = fit.length ? pick(fit.slice(-4)) : ready[0];
  S.free[b.n] = (S.free[b.n] || 0) + 1;
  return b;
}
const freeTotal = () => Object.values(S.free).reduce((s, n) => s + n, 0);
function tickBonus(now) {
  const el = $('#bonusDrop');
  if (!el.hidden && now > bonusHide) { el.hidden = true; bonusAt = now + 90e3 + rnd() * 150e3; }
  if (el.hidden && now > bonusAt && curTab === 'clicker' && !document.hidden) {
    el.style.left = (8 + rnd() * 76) + '%'; el.style.top = (18 + rnd() * 50) + '%';
    el.hidden = false; bonusHide = now + 12e3;
  }
  const line = $('#boostLine'), t = Date.now(), parts = [];
  if (t < boost.clickUntil) parts.push(`🔥 Клик ×${boost.click} · ${Math.ceil((boost.clickUntil - t) / 1000)} с`);
  if (t < boost.autoUntil) parts.push(`⚡ Автокликер ×${boost.auto} · ${Math.ceil((boost.autoUntil - t) / 1000)} с`);
  line.hidden = !parts.length; line.textContent = parts.join('  ·  ');
}
$('#bonusDrop').addEventListener('click', e => {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  el.hidden = true; bonusAt = performance.now() + 90e3 + rnd() * 150e3;
  let q = rnd() * 100, f = BONUS[0][1];
  for (const [w, fn] of BONUS) { if (q < w) { f = fn; break; } q -= w; }
  const [title, text] = f();
  S.st.bonuses++; beep('rare'); toast('🎁 ' + title, text, 'gold');
  FX.burst(r.left + r.width / 2, r.top + r.height / 2, ['#ffd45c', '#ff9f1c', '#fff'], 90, 10);
  renderTop(); save(); checkAch(); if (curTab === 'clicker') renderClicker();
});
$('#clickBtn').addEventListener('pointermove', e => {
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
  $('#clickImg').style.transform = `perspective(500px) rotateY(${x * 24}deg) rotateX(${-y * 24}deg)`;
});
$('#clickBtn').addEventListener('pointerleave', () => { $('#clickImg').style.transform = ''; });
function renderCombo() {
  const max = comboMax(S.up.combo);
  $('#comboTxt').textContent = '×' + combo.toFixed(2);
  $('#comboArc').style.strokeDashoffset = 578 - 578 * Math.min(1, (combo - 1) / Math.max(0.01, max - 1));
}
function upgRow(k) {
  const u = UPG[k], l = S.up[k], max = l >= u.max, c = u.cost(l);
  return `<div class="upg"><div class="ic">${u.ic}</div><b>${u.n}<span class="lvl">ур. ${l}${u.max < 100 ? '/' + u.max : ''}</span></b>
    <button class="btn ${canPay(c) && !max ? 'primary' : ''}" data-up="${k}" ${max ? 'disabled' : ''}>${max ? 'Макс.' : fmt(c)}</button>
    <small>${max ? 'Максимальный уровень' : u.d(l)}</small></div>`;
}
function renderClicker() {
  $('#perClick').textContent = fmt(perClick());
  $('#perSec').textContent = fmt(perSec());
  const x = eqItem();
  const src = x ? img(ITEMS[x.i].img, '512fx384f') : img(BOXES[0].img, '360fx270f');
  if ($('#clickImg').getAttribute('src') !== src) $('#clickImg').src = src;
  $('#equipLine').innerHTML = x
    ? `${stickerKeys(x).length ? '<span class="sticker-strip">' + stickerImages(x) + '</span>' : ''}Экипировано: <b>${esc(fullName(x.i, x.st))}</b> · доход +${Math.round(eqBonus() * 100)}%`
    : unlocked('equip') ? 'Экипируйте скин в инвентаре (кнопка «i») — он появится здесь и даст бонус' : '<span class="muted">Экипировка скинов открывается в магазине</span>';
  $('#quickUpg').innerHTML = Object.keys(UPG).filter(k => UPG[k].quick).map(upgRow).join('');
  renderDaily(); renderMissions(); renderCombo(); renderProgressGuide();
}
RENDER.clicker = renderClicker;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-up]'); if (!b) return;
  const k = b.dataset.up, u = UPG[k];
  if (S.up[k] >= u.max || !pay(u.cost(S.up[k]))) return;
  S.up[k]++; beep('coin'); RENDER[curTab](); renderTop(); save(); checkAch();
});
const today = () => new Date().toISOString().slice(0, 10);
const dailyReward = () => Math.round((1 + Math.min(S.daily.streak, 6) * 0.75) * (incomeMult() * (1 + S.lvl * 0.05) + baseSec() * 180) * 100) / 100;
function renderDaily() {
  $('#daily').innerHTML = S.daily.last === today()
    ? `<span class="muted small">Ежедневная награда получена · серия ${S.daily.streak} дн.</span>`
    : `<button class="btn green" id="dailyBtn">🎁 Ежедневная награда ${fmt(dailyReward())}</button>`;
}
$('#daily').addEventListener('click', e => {
  if (e.target.id !== 'dailyBtn') return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  S.daily.streak = S.daily.last === y ? S.daily.streak + 1 : 1;
  const r = dailyReward(); addMoney(r); S.daily.last = today();
  const b = e.target.getBoundingClientRect(); FX.burst(b.left + b.width / 2, b.top, ['#3ee08f', '#fff', '#ffc15e'], 50);
  toast('Ежедневная награда', '+' + fmt(r), 'good'); beep('win'); renderDaily(); save();
});

// ---------- миссии ----------
function genMission() {
  const r = rankOf(), m = incomeMult(), cm = comboMax(S.up.combo);
  const opts = [
    () => ({ type: 'open', goal: 3 + Math.floor(rnd() * 8) }),
    () => ({ type: 'tier', goal: 1, tier: rnd() < 0.7 ? 3 : 4 }),
    () => ({ type: 'click', goal: Math.ceil(perClick() * (150 + rnd() * 250) * 100) / 100 }),
    () => ({ type: 'sell', goal: Math.max(2, Math.round((3 + rnd() * 20) * m)) }),
    () => ({ type: 'combo', goal: +Math.min(cm, 1.2 + rnd() * (cm - 1.2)).toFixed(2) }),
  ];
  if (S.st.stDrops > 0 || S.st.opened >= 30) opts.push(() => ({ type: 'st', goal: 1 }));
  if (S.unl.tradeup) opts.push(() => ({ type: 'tradeup', goal: 1 + Math.floor(rnd() * 2) }));
  if (['coinflip', 'crash', 'roulette', 'mines', 'tower', 'jackpot', 'battle'].some(k => S.unl[k])) opts.push(() => ({ type: 'game', goal: 2 + Math.floor(rnd() * 3) }));
  if (S.unl.sticker) opts.push(() => ({ type: 'kind', kind: 'sticker', goal: 2 + Math.floor(rnd() * 4) }));
  if (S.unl.souvenir) opts.push(() => ({ type: 'kind', kind: 'souvenir', goal: 1 + Math.floor(rnd() * 3) }));
  const used = new Set(S.missions.map(x => x.type + (x.kind || '')));
  let o, tries = 0;
  do { o = pick(opts)(); } while (used.has(o.type + (o.kind || '')) && ++tries < 20);
  const baseReward = {combo:.35, tier:1.2, st:1.5, tradeup:2, game:.6, kind:.8, open:.6, click:1, sell:.5}[o.type];
  const effort = o.type === 'click' ? o.goal*.06 : o.type === 'open' || o.type === 'kind' ? o.goal*.12 : o.type === 'sell' ? o.goal*.03 : 0;
  const secs = {combo:20, tier:60, st:90, tradeup:120, game:40, kind:40, open:45, click:30, sell:20}[o.type];
  o.prog = 0; o.reward = Math.round(((baseReward + effort) * Math.min(3,m) * (1 + r*.12) + baseSec() * secs) * 100) / 100;
  return o;
}
function missionText(o) {
  const g = o.goal;
  return {
    open: () => `Откройте ${g} контейнеров`, tier: () => `Получите предмет «${TIERS[o.tier].n}» или выше`, click: () => `Заработайте ${fmt(g)} кликами`,
    sell: () => `Продайте предметов на ${fmt(g)}`, combo: () => `Наберите комбо ×${g.toFixed(2)}`, st: () => 'Выбейте StatTrak™ предмет',
    tradeup: () => `Подпишите контрактов: ${g}`, game: () => `Выиграйте в казино ${g} раза`,
    kind: () => o.kind === 'sticker' ? `Откройте капсул с наклейками: ${g}` : `Откройте сувенирных наборов: ${g}`,
  }[o.type]();
}
function ev(type, amount = 1, data = {}) {
  let changed = false;
  for (const m of S.missions) {
    if (m.prog >= m.goal || m.type !== type) continue;
    if (type === 'tier' && data.tier < m.tier) continue;
    if (type === 'kind' && data.kind !== m.kind) continue;
    m.prog = type === 'combo' ? Math.max(m.prog, Math.min(amount, m.goal)) : Math.min(m.goal, m.prog + (type === 'tier' ? 1 : amount));
    if (m.prog >= m.goal) { toast('Миссия выполнена', missionText(m), 'good'); beep('win'); changed = true; }
  }
  if (changed && curTab === 'clicker') renderMissions();
}
function renderMissions() {
  while (S.missions.length < 3) S.missions.push(genMission());
  const r = rankOf();
  $('#missionHint').textContent = r < RANKS.length - 1 ? `до ${RANKS[r + 1][0]}: ${rankNeed(r + 1) - S.rp}` : '';
  $('#missions').innerHTML = S.missions.map((m, k) => {
    const done = m.prog >= m.goal;
    const progTxt = ['click', 'sell'].includes(m.type) ? `${fmt(m.prog)} / ${fmt(m.goal)}` : m.type === 'combo' ? `×${m.prog.toFixed(2)}` : `${Math.floor(m.prog)} / ${m.goal}`;
    return `<div class="mission ${done ? 'done' : ''}"><b>${esc(missionText(m))}</b>
      <div class="rw">${done ? `<button class="btn green" data-claim="${k}">Забрать</button>` : `<b style="color:var(--good)">${fmt(m.reward)}</b><small>+1 очко звания</small>`}</div>
      <div class="bar"><i style="width:${Math.min(100, m.prog / m.goal * 100)}%"></i></div>
      <small class="muted">${progTxt}</small></div>`;
  }).join('');
}
$('#missions').addEventListener('click', e => {
  const b = e.target.closest('[data-claim]'); if (!b) return;
  const k = +b.dataset.claim, m = S.missions[k]; if (!m || m.prog < m.goal) return;
  const before = rankOf();
  addMoney(m.reward); S.rp++; S.st.missions++; addXP(30);
  const r = b.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top, ['#3ee08f', '#ffc15e', '#fff'], 40);
  if (rankOf() > before) { toast('Новое звание!', `${RANKS[rankOf()][0]} · доход +${rankOf() * 5}%`, 'gold'); beep('rare'); FX.burst(innerWidth / 2, innerHeight / 3, RANK_COL, 140, 12); }
  S.missions.splice(k, 1); renderMissions(); renderTop(); save(); checkAch();
  if (curTab === 'clicker') { $('#perClick').textContent = fmt(perClick()); }
});

// ---------- кейсы и коллекции ----------
const CUSTOM_SERIES = {all:'Все серии',classic:'Классика',rarity:'По редкости',weapon:'По оружию',theme:'Тематики',sticker:'Наклейки',elite:'Особые'};
let customSeries = 'all', customAccess = 'all';
function renderCases() {
  const kind = S.set.kind;
  $('#caseJourney').innerHTML = kind === 'custom' ? customJourney() : '';
  $('#customFilters').hidden = kind !== 'custom';
  if(kind === 'custom') {
    $('#seriesFilters').innerHTML = Object.entries(CUSTOM_SERIES).map(([k,n])=>`<button class="${customSeries===k?'on':''}" data-series="${k}">${n} <small>${BOXES.filter(b=>b.k==='custom' && (k==='all'||b.series===k)).length}</small></button>`).join('');
    $('#accessFilter').value = customAccess;
  }
  $('#kindTabs').innerHTML = Object.entries(KINDS).map(([k, v]) => `<button data-kind="${k}" class="${k === kind ? 'on' : ''}">${v.ic} ${v.n} ${unlocked(v.unl) ? `<small>${BOXES.filter(b => b.k === k).length}</small>` : '🔒'}</button>`).join('');
  $('#caseSort option[value="new"]').textContent = kind === 'custom' ? 'По прогрессу' : 'Сначала новые';
  const K = KINDS[kind];
  $('#kindInfo').innerHTML = K.key ? `Цена с ключом · ключ до <b>${fmt(keyPrice())}</b>` : 'Открывается без ключа';
  if (!unlocked(K.unl)) { $('#caseGrid').innerHTML = lockWall(K.unl); return; }
  const q = $('#caseSearch').value.trim().toLowerCase(), sort = $('#caseSort').value;
  let list = BOXES.map((b, i) => ({ b, i })).filter(x => x.b.k === kind && [x.b.n,x.b.desc || ''].join(' ').toLowerCase().includes(q) && (kind !== 'custom' || ((customSeries === 'all' || x.b.series === customSeries) && (customAccess === 'all' || (customAccess === 'ready' ? customReady(x.b) : !customReady(x.b))))));
  if (kind === 'custom' && sort === 'new') list.sort((a,b) => a.b.opens-b.b.opens);
  if (sort === 'old') list.reverse();
  if (sort === 'cheap') list.sort((a, b) => a.b.p - b.b.p);
  if (sort === 'exp') list.sort((a, b) => b.b.p - a.b.p);
  $('#caseGrid').innerHTML = list.map(({ b, i }) => {
    const cost = boxCost(b);
    return `<div style="--case-accent:${b.color || 'var(--acc)'}" class="case-card ${canPay(cost) && customReady(b) ? '' : 'locked'}" data-box="${i}">
      <span class="yr">${b.k === 'custom' ? (customReady(b) ? CUSTOM_SERIES[b.series] || '✦ АВТОРСКИЙ' : '🔒 ЗАКРЫТ') : b.date.slice(0, 4)}</span>${b.g[6] ? '<span class="tag">★</span>' : ''}
      <img loading="lazy" src="${img(b.img)}" alt="">
      ${S.free[b.n] ? `<span class="free-badge" title="Бесплатные открытия">🎁 ${S.free[b.n]}</span>` : ''}<div class="nm">${esc(b.n)}</div><div class="pr">${fmt(cost)}</div>${albumBar(b)}${b.k === 'custom' ? `<small class="custom-desc">${esc(b.desc)}</small><small class="custom-req">${customReady(b) ? 'Без ключа · возврат ~' + Math.round(boxEV(b)/cost*100) + '%' : customRequirement(b)}</small>` : ''}</div>`;
  }).join('') || '<div class="empty">Ничего не найдено. Измените поиск или фильтры.</div>';
  $('#customResult').textContent = kind === 'custom' ? `Показано ${list.length} из ${BOXES.filter(b=>b.k==='custom').length} · доступно ${list.filter(x=>customReady(x.b)).length}` : '';
}
RENDER.cases = renderCases;
function albumProg(b) { const pool = albumPool(b); return [pool.filter(i => S.found[keyOf(ITEMS[i])]).length, pool.length]; }
function albumBar(b) {
  const [have, total] = albumProg(b);
  if (!have) return '';
  return `<div class="alb ${S.album[b.n] ? 'done' : ''}" title="Альбом: ${have} из ${total}"><i style="width:${have / total * 100}%"></i></div>`;
}
// первый дроп предмета отмечается в альбоме; полностью собранный контейнер даёт награду и +1% дохода
function markFound(x) {
  const base = PHASE_BASE.get(x.i) ?? x.i;
  const k = keyOf(ITEMS[base]); if (S.found[k]) return;
  S.found[k] = 1;
  for (const bi of inBoxes.get(base) || []) {
    const b = BOXES[bi];
    if (S.album[b.n] || !albumPool(b).every(i => S.found[keyOf(ITEMS[i])])) continue;
    S.album[b.n] = Date.now();
    const rew = Math.round(Math.max(1, boxCost(b) * 5) * 100) / 100;
    addMoney(rew); beep('rare');
    toast('📗 Коллекция собрана', `${b.n}: +${fmt(rew)} и +1% дохода навсегда`, 'gold');
  }
}
$('#kindTabs').addEventListener('click', e => { const b = e.target.closest('[data-kind]'); if (b) { S.set.kind = b.dataset.kind; renderCases(); } });
$('#seriesFilters').addEventListener('click', e=>{const b=e.target.closest('[data-series]');if(b){customSeries=b.dataset.series;renderCases();}});
$('#accessFilter').addEventListener('change',e=>{customAccess=e.target.value;renderCases();});
$('#caseSearch').addEventListener('input', renderCases);
$('#caseSort').addEventListener('change', renderCases);
$('#caseGrid').addEventListener('click', e => { const c = e.target.closest('[data-box]'); if (c) openBoxPage(+c.dataset.box); });

let curBox = 0, qty = 1, rolling = false;
function itemEV(i, b) {
  if (b.variants) return variantPrice(i, b.variants[i], false);
  const it = ITEMS[i];
  if (it.v) return variantPrice(i, 0, false);
  const [a, c] = it.f, span = Math.max(c - a, 1e-6), stp = it.st && b.k !== 'souvenir' && b.k !== 'collection' ? 0.1 + 0.01 * S.up.stattrak : 0;
  let ev = 0;
  WEAR.forEach((w, k) => {
    const ov = Math.max(0, Math.min(c, w.b) - Math.max(a, w.a));
    if (ov) ev += ov / span * ((1 - stp) * variantPrice(i, k, false) + stp * variantPrice(i, k, true));
  });
  return ev;
}
const boxEV = b => boxOdds(b).reduce((s, [t, p]) => s + p * b.g[t].reduce((a, i) => a + itemEV(i, b), 0) / b.g[t].length, 0);
const heroHTML = b => `<div class="case-hero" id="hero"><img src="${img(b.img, '360fx270f')}" alt=""></div>`;
function openBoxPage(bi) {
  curBox = bi; const b = BOXES[bi];
  $('#openTitle').textContent = b.n;
  const ev = boxEV(b), cost = boxCost(b);
  $('#openSub').innerHTML = `${KINDS[b.k].n}${b.k === 'custom' ? ' · ' + esc(b.desc) + ' · без StatTrak, износ указан на карточке' : ' · ' + b.date.slice(0, 4)} · средний дроп ${fmt(ev)} (окупаемость ${Math.round(ev / cost * 100)}%) · лучший дроп до ${fmt(window.ECONOMY.boxMax(D, b))}${b.mp > 0 && Math.abs(b.mp - b.p) > 0.05 ? ` · на Steam ${fmt(b.mp)}` : ''}`;
  $('#rollArea').innerHTML = heroHTML(b);
  $('#fastOpen').checked = S.set.fast;
  renderQty();
  const odds = boxOdds(b), flat = b.k === 'custom' ? isFlat(ITEMS[Object.values(b.g)[0][0]]) : !['case', 'terminal', 'souvenir', 'collection'].includes(b.k);
  $('#odds').innerHTML = odds.map(([t, p]) => `<span style="--c:${tcol(t)}"><i></i>${t === 6 ? '★ Нож/перчатки' : (flat ? FLAT_T[t] : null) || TIERS[t].n} ${pct(p * 100)}</span>`).join('');
  const rows = [];
  odds.slice().reverse().forEach(([t, p]) => {
    const share = p * 100 / b.g[t].length;
    b.g[t].forEach(i => {
      const it = ITEMS[i], ps = it.p.filter(v => v != null), lo = Math.min(...ps);
      const hi = b.variants ? variantPrice(i,b.variants[i],false) : Math.max(...ps, ...(it.st || []).filter(v => v != null));
      rows.push(itemCard({ i, w: b.variants?.[i] }, { got: !!S.found[keyOf(it)], price: b.variants ? hi : lo, extra: `<div class="chance">${pct(share)}${!b.variants && hi > lo ? ' · до ' + fmt(hi) : ''}</div>` }));
    });
  });
  $('#caseContents').innerHTML = rows.join('');
  const [have, total] = albumProg(b);
  $('#albumInfo').innerHTML = total ? (S.album[b.n] ? `· 📗 альбом собран (+1% дохода)` : `· альбом ${have}/${total} · за полный сбор ${fmt(Math.max(1, boxCost(b) * 5))} и +1% дохода`) : '';
  $('#autoSell').value = S.set.autoSell || '';
  odds.forEach(([t]) => t < 6 && b.g[t].forEach(i => { new Image().src = img(ITEMS[i].img, '128fx96f'); }));
  showTab('open');
}
RENDER.open = () => {};
function renderQty() {
  const b = BOXES[curBox];
  $('#qty').innerHTML = [1, 2, 3, 5, 10].map(n => `<button class="${n === qty ? 'on' : ''}" data-q="${n}">${n}</button>`).join('');
  const btn = $('#openBtn'), have = S.free[b.n] || 0, free = Math.min(have, qty);
  btn.textContent = `Открыть ${qty > 1 ? '×' + qty + ' ' : ''}· ${free === qty ? '🎁 бесплатно' : fmt(boxCost(b) * (qty - free)) + (free ? ` + 🎁${free}` : '')}${have ? ` (подарков ${have})` : ''}`;
  btn.disabled = rolling || !customReady(b);
  if (!customReady(b)) btn.textContent = '🔒 ' + customRequirement(b);
  btn.title = KINDS[b.k].key ? `${fmt(b.p)} + ключ ${fmt(keyPrice(b))}` : '';
}
$('#qty').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b && !rolling) { qty = +b.dataset.q; renderQty(); } });
$('#backToCases').addEventListener('click', () => showTab('cases'));
$('#fastOpen').addEventListener('change', e => { S.set.fast = e.target.checked; save(); });
$('#autoSell').addEventListener('change', e => { S.set.autoSell = Math.max(0, Math.round(+e.target.value * 100) / 100 || 0); e.target.value = S.set.autoSell || ''; save(); });

function rollTier(b) {
  let r = rnd();
  const odds = boxOdds(b);
  for (const [t, p] of odds) { if (r < p) return t; r -= p; }
  return odds[odds.length - 1][0];
}
function newItem(i, c, o = {}) {
  i = resolvePhase(i);
  const it = ITEMS[i];
  let [a, b] = it.f;
  if (o.w != null && !it.v) { a = Math.max(a, WEAR[o.w].a); b = Math.min(b, WEAR[o.w].b); }
  const fl = isFlat(it) ? 0 : (o.fl ?? (a + rnd() * (b - a)));
  const box = BOXES[c];
  const st = o.st ?? (!!it.st && !!box && box.k !== 'souvenir' && box.k !== 'collection' && rnd() < 0.1 + 0.01 * S.up.stattrak);
  const x = { u: S.uid++, i, c, fl: Math.min(0.999999, +fl.toFixed(6)), st: !!st, s: Math.floor(rnd() * 1000), t: Date.now() };
  // апгрейд и джекпот выдают обычный экземпляр: без редкого паттерна и премиального float
  for (let k = 0; o.plain && k < 60 && (patternOf(x)[1] > 1 || floatOf(x)[1] > 1); k++) { x.s = Math.floor(rnd() * 1000); x.fl = Math.min(0.999999, +(a + rnd() * (b - a)).toFixed(6)); }
  if (o.plain && patternOf(x)[1] > 1) x.s = Array.from({ length: 1000 }, (_, seed) => seed).find(seed => window.VALUATION.pattern(it, seed)[1] === 1) ?? 0;
  if (o.plain && floatOf(x)[1] > 1) {
    const w = wearIdx(x.fl), lo = Math.max(a, [.01, .075, .16, .38, .45][w]), hi = Math.min(b, w === 4 ? .99 : b);
    x.fl = +((lo + hi) / 2).toFixed(6);
  }
  return x;
}
function rollDrop(bi) {
  const b = BOXES[bi], i = pick(b.g[rollTier(b)]);
  return b.variants ? newItem(i, origin.get(i), { w: b.variants[i], st: false }) : newItem(i, bi);
}
function trackDrop(x) {
  const it = ITEMS[x.i], p = priceOf(x);
  markFound(x);
  S.st.dropValue += p;
  if (it.r === 6) S.st.knives++;
  if (x.st) { S.st.stDrops++; ev('st'); }
  if (it.t === 's') S.st.stickers++;
  if (it.t === 'sv') S.st.souvenirs++;
  if (!it.v && !isFlat(it) && x.fl < S.st.lowFloat) S.st.lowFloat = x.fl;
  const [pat0, pm0] = patternOf(x), [fl0, fm0] = floatOf(x), pm = pm0 * fm0, pat = pm0 >= fm0 ? pat0 : fl0;
  if (pat && pm >= 1.5) { toast('💎 Редкий паттерн: ' + pat, `${fullName(x.i, x.st)} · ${fmt(p)}`, 'gold'); S.st.rarePats = (S.st.rarePats || 0) + 1; }
  if (!S.st.best || p > S.st.best.p) S.st.best = { k: keyOf(it), st: x.st, p };
  ev('tier', 1, { tier: it.r });
}
function tileHTML(i) {
  const it = ITEMS[i];
  if (it.r === 6) return `<div class="tile rare" style="--c:var(--t6)"><div class="gold">★</div><span>Редкий особый предмет</span></div>`;
  return `<div class="tile" style="--c:${tcol(it.r)}"><img src="${img(it.img, '128fx96f')}" alt=""><span>${esc(nameParts(i)[0])}</span></div>`;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
$('#openBtn').addEventListener('click', async () => {
  if (rolling) return;
  if (!customReady(BOXES[curBox])) { toast('Кейс пока закрыт', customRequirement(BOXES[curBox])); return; }
  const b = BOXES[curBox], free = Math.min(S.free[b.n] || 0, qty), cost = boxCost(b) * (qty - free);
  if (!pay(cost)) return;
  if (free) { S.free[b.n] -= free; if (!S.free[b.n]) delete S.free[b.n]; S.st.freeOpened += free; }
  rolling = true; renderQty();
  S.st.opened += qty; S.st.spent += cost;
  const drops = [];
  for (let k = 0; k < qty; k++) { const x = rollDrop(curBox); drops.push(x); S.inv.push(x); trackDrop(x); }
  ev('open', qty); ev('kind', qty, { kind: b.k === 'custom' && ITEMS[drops[0].i].t === 's' ? 'sticker' : b.k });
  addXP(20 * qty); save(); renderTop(); renderNav();
  const fast = S.set.fast, hero = $('#hero');
  if (hero && !fast) {
    beep('open');
    if (S.set.fx) hero.classList.add('charging');
    await wait(600);
  }
  const N = 56, WIN = 48, area = $('#rollArea');
  area.innerHTML = drops.map(() => `<div class="roll ${qty > 5 ? 'compact mini' : qty > 1 ? 'compact' : ''}"><i class="pin-t"></i><i class="pin-b"></i><div class="strip"></div></div>`).join('');
  const rolls = $$('.roll', area), dur = fast ? 900 : 6000;
  const lag = qty > 5 ? 80 : 200;
  rolls.forEach((r, k) => {
    const tiles = [];
    for (let t = 0; t < N; t++) tiles.push(t === WIN ? drops[k].i : pick(b.g[rollTier(b)]));
    const strip = $('.strip', r);
    strip.innerHTML = tiles.map(tileHTML).join('');
    // считаем по фактическому положению выигрышной плитки, а не «индекс × ширина первой»
    const win = strip.children[WIN], tw = win.offsetWidth;
    const target = -(win.offsetLeft + tw / 2 - r.clientWidth / 2) + (rnd() - 0.5) * tw * 0.8;
    strip.getBoundingClientRect();
    strip.style.transition = `transform ${dur + k * lag}ms cubic-bezier(.08,.62,.1,1)`;
    strip.style.transform = `translateX(${target}px)`;
    if (k === 0 && !fast) {
      let last = -1;
      const tick = () => {
        const m = new DOMMatrix(getComputedStyle(strip).transform).m41;
        const idx = Math.floor((-m + r.clientWidth / 2) / tw);
        if (idx !== last) { last = idx; beep('tick'); }
        if (rolling) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    setTimeout(() => strip.children[WIN].classList.add('win'), dur + k * lag);
  });
  await wait(dur + (qty - 1) * lag + 300);
  rolling = false; renderQty(); renderNav(); showDrops(drops); checkAch();
});

function dropDetails(x) {
  const it = ITEMS[x.i], [title, sub] = nameParts(x.i, x.st), plain = it.v || isFlat(it);
  return `<div class="drop" style="--c:${tcol(it.r)}"><div class="rays"></div>
    ${x.fl != null ? skinImg(x, '512fx384f', 'class="drop-img"') : `<img src="${img(it.img, '512fx384f')}" alt="">`}
    <div class="nm" style="color:${tcol(it.r)}">${esc(title)}</div>
    <div class="meta">${esc(sub)} · ${tierName(it)}${plain ? '' : ' · ' + WEAR[wearIdx(x.fl)].n}</div>
    ${plain ? '' : `<div class="float-bar"><i style="left:${x.fl * 100}%"></i></div><div class="meta">Float ${x.fl.toFixed(6)} · паттерн ${x.s}${patLine(x)}</div>`}
    <div class="meta small">${esc(BOXES[x.c]?.n || '')}</div>
    ${stickerKeys(x).length ? `<div class="sticker-strip large">${stickerImages(x)}</div><div class="meta small">Наклейки: +${fmt(stickerPremium(x))} к цене</div>` : ''}<div class="pr">${fmt(priceOf(x))}</div></div>`;
}
function patLine(x) {
  const out = [];
  for (const [name, m] of [patternOf(x), floatOf(x)]) if (name) out.push(`<b class="pat-txt ${m >= 1.5 ? 'hot' : ''}">${esc(name)}</b>${m > 1 ? ` (+${Math.round((m - 1) * 100)}%)` : ''}`);
  return out.length ? ' · ' + out.join(' · ') : '';
}
function celebrate(top) {
  if (!S.set.fx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = $('#modalBox');
  box.style.setProperty('--reward-color', tcol(top));
  box.classList.add('reward-reveal');
  if (top < 4) return;
  const cols = top === 6 ? ['#e4ae39', '#ffd45c', '#fff6d5', '#ff9f1c'] : [tcol(top), '#fff', tcol(Math.max(0, top - 1))];
  const r = box.getBoundingClientRect();
  FX.burst(r.left + r.width / 2, r.top + Math.min(r.height * 0.4, 220), cols, top === 6 ? 140 : top === 5 ? 90 : 50, top === 6 ? 8 : 6, true);
}
function showDrops(drops) {
  const all = drops.reduce((s, x) => s + priceOf(x), 0);
  const top = Math.max(...drops.map(x => ITEMS[x.i].r));
  beep(top >= 4 ? 'rare' : 'win');
  const wanted = drops.filter(x => S.orders.some(o => o.k && orderItem(o) === (PHASE_BASE.get(x.i) ?? x.i)));
  if (wanted.length) toast('📋 Этот предмет ждёт коллекционер', fullName(wanted[0].i, wanted[0].st) + ' — сдайте во вкладке «Заказы»', 'gold');
  if (top === 6) toast('★ Редкий особый предмет!', fullName(drops.find(x => ITEMS[x.i].r === 6).i), 'gold');
  // автопродажа: дешёвое продаётся сразу, ножи и перчатки — никогда
  const lim = S.set.autoSell, auto = new Set(lim > 0 ? drops.filter(x => ITEMS[x.i].r < 6 && priceOf(x) < lim).map(x => x.u) : []);
  if (auto.size) sellUids([...auto]);
  const kept = drops.filter(x => !auto.has(x.u)), total = kept.reduce((s, x) => s + sellPrice(x), 0);
  const body = drops.length === 1 ? dropDetails(drops[0]) + (auto.size ? '<p class="muted" style="text-align:center">Продано автоматически</p>' : '')
    : `<div class="item-grid small">${drops.map(x => itemCard(x, auto.has(x.u) ? { cls: 'dim', extra: '<small class="sold">продано</small>' } : {})).join('')}</div><p class="muted" style="text-align:center">Дроп: <b style="color:var(--good)">${fmt(all)}</b>${auto.size ? ` · автопродажа ${auto.size} шт.` : ''}</p>`;
  modal(`<h2>${drops.length === 1 ? 'Вам выпало' : 'Ваш дроп'}<button class="btn ghost" data-close>✕</button></h2>${body}
    <div class="modal-actions">${kept.length ? `<button class="btn" id="dSell">Продать · ${fmt(total)}</button><button class="btn primary" data-close>В инвентарь</button>` : '<button class="btn" data-close>Закрыть</button>'}<button class="btn ${kept.length ? '' : 'primary'}" id="dAgain" title="Enter">Ещё раз</button></div>`, box => {
    const sell = $('#dSell', box); if (sell) sell.onclick = () => { sellUids(kept.map(x => x.u)); closeModal(); };
    $('#dAgain', box).onclick = () => { closeModal(); $('#rollArea').innerHTML = heroHTML(BOXES[curBox]); $('#openBtn').click(); };
  });
  celebrate(top);
}

// ---------- авторские кейсы и путь игрока ----------
const customReady = b => b.k !== 'custom' || ((S.lvl >= b.level || S.medals > 0) && S.st.opened >= b.opens);
const customRequirement = b => `${S.medals ? 'Уровень ✓' : 'Ур. ' + S.lvl + '/' + (b.level || 1)} · открытий ${Math.min(S.st.opened,b.opens)}/${b.opens}`;
function customJourney() {
  const boxes = BOXES.filter(b => b.k === 'custom').sort((a,b)=>a.opens-b.opens), next = boxes.find(b => !customReady(b));
  return `<div class="journey"><div><small>МАСТЕРСКАЯ CASE CLICKER</small><h2>От первого дропа до золотого резерва</h2><p>Скины и наклейки из авторских подборок. Все шансы и износы видны до открытия. Цена пересчитывается вместе с рынком.</p></div><div class="journey-next"><b>${next ? 'Далее: ' + esc(next.n) : 'Все кейсы открыты'}</b><span>${next ? customRequirement(next) : 'Соберите свой крафт из пяти наклеек'}</span><small>Средний возврат 72–80% — отдельный дроп может стоить меньше цены кейса. Удача здесь не меняет шансы.</small></div></div>`;
}
function renderProgressGuide() {
  const next = BOXES.filter(b => b.k === 'custom').sort((a,b)=>a.opens-b.opens).find(b => !customReady(b));
  $('#progressGuide').innerHTML = `<b>Следующая цель</b><span>${freeTotal() ? `🎁 Бесплатных кейсов: ${freeTotal()} — откройте во вкладке «Кейсы»` : ordersReady() ? `📋 Можно сдать заказов: ${ordersReady()} — вкладка «Заказы»` : S.up.click < 3 ? 'Сила клика до ур. 3 → быстрее копить на открытия' : S.up.auto < 3 ? 'Автокликер до ур. 3 → доход между сессиями' : next ? esc(next.n) + ' · ' + customRequirement(next) : 'Соберите любимый скин с пятью наклейками'}</span><small>Чередуйте улучшения и кейсы. Миссии и заказы коллекционеров помогают расти; казино не требуется для прогресса.</small>`;
}
function stickerImages(x) {
  return (x.stickers || []).map(k => KEYMAP.get(k)).filter(i => i != null).map(i => `<img src="${img(ITEMS[i].img, '128fx96f')}" title="${esc(ITEMS[i].n)}" alt="${esc(ITEMS[i].n)}">`).join('');
}
// ---------- мастерская наклеек ----------
// 5 мест на превью оружия: координаты и наклон наклеек.
const SLOT_POS = [[0.27, 0.43, -8], [0.4, 0.45, -4], [0.55, 0.49, 0], [0.65, 0.57, 4], [0.81, 0.5, 8]];
const STK_FILTERS = { all: ['Все', () => true], holo: ['Holo', n => /\(Holo\)/.test(n)], foil: ['Foil', n => /\(Foil\)/.test(n)], gold: ['Gold', n => /\(Gold\)/.test(n)], glitter: ['Glitter', n => /\(Glitter\)/.test(n)], y14: ['2014', n => /2014/.test(n)] };
const craft = { u: 0, slot: 0, pick: null, q: '', f: 'all' };
function stickerOn(k, slot, cls = '') {
  const i = KEYMAP.get(k), [x, y, r] = SLOT_POS[slot];
  return i == null ? '' : `<img class="stk ${cls}" src="${img(ITEMS[i].img, '128fx96f')}" style="left:${x * 100}%;top:${y * 100}%;--r:${r}deg" alt="" title="${esc(ITEMS[i].n)}">`;
}
function showStickerCraft(u, keep) {
  const weapon = S.inv.find(x => x.u === u); if (!weapon || ITEMS[weapon.i].t !== 'w') return;
  if (!keep) Object.assign(craft, { u, slot: Math.max(0, [0, 1, 2, 3, 4].find(k => !(weapon.stickers || [])[k]) ?? 0), pick: null, q: '', f: 'all' });
  modal(`<h2>Мастерская наклеек<button class="btn ghost" data-close>✕</button></h2><div id="craftBody"></div>`, renderCraft);
}
function renderCraft(box = $('#modalBox')) {
  const weapon = S.inv.find(x => x.u === craft.u), body = $('#craftBody', box); if (!weapon || !body) return;
  const st = weapon.stickers || [], it = ITEMS[weapon.i], free = [0, 1, 2, 3, 4].filter(k => !st[k]).length;
  // наклейки инвентаря, сгруппированные по названию
  const groups = new Map();
  for (const x of S.inv) {
    if (ITEMS[x.i].t !== 's') continue;
    const n = ITEMS[x.i].n;
    if (craft.q && !n.toLowerCase().includes(craft.q)) continue;
    if (!STK_FILTERS[craft.f][1](n)) continue;
    const g = groups.get(n) || { x, n: 0 }; g.n++; groups.set(n, g);
  }
  const list = [...groups.values()].sort((a, b) => priceOf(b.x) - priceOf(a.x));
  const pickItem = craft.pick && S.inv.find(x => x.u === craft.pick);
  const gain = pickItem ? ITEMS[pickItem.i].p[0] * stickerRate(ITEMS[pickItem.i].n) : 0;
  body.innerHTML = `<div class="craft">
    <div class="craft-stage" style="--c:${tcol(it.r)}">
      <div class="craft-weapon">${skinImg(weapon, '512fx384f', 'draggable="false"')}
        ${SLOT_POS.map((_, k) => st[k] ? stickerOn(st[k], k) : '').join('')}
        ${pickItem && !st[craft.slot] ? stickerOn(keyOf(ITEMS[pickItem.i]), craft.slot, 'ghost') : ''}
        ${SLOT_POS.map(([x, y], k) => `<button class="slot-dot ${k === craft.slot ? 'on' : ''} ${st[k] ? 'full' : ''}" data-slot="${k}" style="left:${x * 100}%;top:${y * 100}%" title="Место ${k + 1}">${st[k] ? '' : k + 1}</button>`).join('')}
      </div>
      <div class="craft-info"><b>${esc(fullName(weapon.i, weapon.st))}</b>
        <span>Цена ${fmt(priceOf(weapon))} · наклейки +${fmt(stickerPremium(weapon))} · мест свободно ${free}/5</span></div>
      <div class="craft-actions">${st[craft.slot]
        ? `<span class="muted">Место ${craft.slot + 1}: ${esc(ITEMS[KEYMAP.get(st[craft.slot])]?.n || '')}</span><button class="btn danger" id="craftPeel">Соскоблить</button>`
        : pickItem ? `<span class="muted">Предпросмотр на месте ${craft.slot + 1} · к цене скина +${fmt(gain)}</span><button class="btn" id="craftCancel">Отмена</button><button class="btn primary" id="craftApply">Нанести</button>`
        : '<span class="muted">Выберите место на оружии и наклейку справа — или перетащите наклейку на место</span>'}</div>
    </div>
    <div class="craft-side">
      <div class="toolbar"><input id="craftQ" type="search" placeholder="Поиск наклейки" value="${esc(craft.q)}"></div>
      <div class="subtabs craft-f">${Object.entries(STK_FILTERS).map(([k, [n]]) => `<button data-cf="${k}" class="${k === craft.f ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="craft-list">${list.length ? list.slice(0, 200).map(({ x, n }) => `<button class="stk-card ${craft.pick === x.u ? 'on' : ''}" draggable="true" data-stk="${x.u}" style="--c:${tcol(ITEMS[x.i].r)}">
        <img src="${img(ITEMS[x.i].img, '128fx96f')}" alt="" draggable="false"><span>${esc(nameParts(x.i)[0])}</span><small>${fmt(priceOf(x))}${n > 1 ? ' · ×' + n : ''}</small></button>`).join('')
        : '<p class="muted">Нет наклеек. Ищите их в капсулах или в авторском кейсе «Стикербомб».</p>'}</div>
      <p class="muted small">Наклейка расходуется. К цене скина добавляется 5% её цены (Holo/Foil/Gold — 8%, мейджоры 2014 — 20%). Соскобленная наклейка уничтожается.</p>
    </div></div>`;
  const q = $('#craftQ', body); q.oninput = () => { craft.q = q.value.trim().toLowerCase(); renderCraft(); const n = $('#craftQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
}
function applySticker(slot, stickerU) {
  const weapon = S.inv.find(x => x.u === craft.u), sticker = S.inv.find(x => x.u === stickerU);
  if (!weapon || !sticker || ITEMS[weapon.i].t !== 'w' || ITEMS[sticker.i].t !== 's' || !Number.isInteger(slot) || slot < 0 || slot > 4 || (weapon.stickers || [])[slot]) return;
  const arr = (weapon.stickers || []).slice(); while (arr.length < 5) arr.push(null);
  arr[slot] = keyOf(ITEMS[sticker.i]); weapon.stickers = arr;
  removeUids(new Set([sticker.u])); beep('coin');
  craft.pick = null; craft.slot = [0, 1, 2, 3, 4].find(k => !arr[k]) ?? slot;
  save(); renderTop(); renderNav(); RENDER[curTab] && RENDER[curTab](); renderCraft();
  const el = $('.craft-weapon'); if (el) { const r = el.getBoundingClientRect(); FX.burst(r.left + r.width * SLOT_POS[slot][0], r.top + r.height * SLOT_POS[slot][1], ['#fff', '#ffc15e', tcol(ITEMS[sticker.i].r)], 30, 5, true); }
}
document.addEventListener('click', e => {
  if (!e.target.closest('#craftBody')) return;
  const t = e.target.closest('[data-slot],[data-stk],[data-cf],#craftApply,#craftCancel,#craftPeel'); if (!t) return;
  if (t.dataset.slot) { craft.slot = +t.dataset.slot; renderCraft(); }
  else if (t.dataset.stk) { craft.pick = craft.pick === +t.dataset.stk ? null : +t.dataset.stk; renderCraft(); }
  else if (t.dataset.cf) { craft.f = t.dataset.cf; renderCraft(); }
  else if (t.id === 'craftApply') applySticker(craft.slot, craft.pick);
  else if (t.id === 'craftCancel') { craft.pick = null; renderCraft(); }
  else if (t.id === 'craftPeel') {
    const slot = craft.slot;
    modal(`<h2>Соскоблить наклейку?</h2><p class="muted">Наклейка будет уничтожена, вернуть её нельзя.</p><div class="modal-actions"><button class="btn" id="peelCancel">Оставить</button><button class="btn danger" id="peelConfirm">Соскоблить</button></div>`, c => {
      $('#peelCancel', c).onclick = () => showStickerCraft(craft.u, true);
      $('#peelConfirm', c).onclick = () => { const w = S.inv.find(x => x.u === craft.u); if (w && w.stickers) w.stickers[slot] = null; save(); RENDER[curTab] && RENDER[curTab](); showStickerCraft(craft.u, true); };
    });
  }
});
// перетаскивание наклейки на место
document.addEventListener('dragstart', e => { const t = e.target.closest?.('[data-stk]'); if (t) { e.dataTransfer.setData('text/plain', t.dataset.stk); e.dataTransfer.effectAllowed = 'copy'; } });
document.addEventListener('dragover', e => { if (e.target.closest?.('.slot-dot:not(.full)')) e.preventDefault(); });
document.addEventListener('drop', e => {
  const d = e.target.closest?.('.slot-dot:not(.full)'); if (!d) return;
  e.preventDefault(); applySticker(+d.dataset.slot, +e.dataTransfer.getData('text/plain'));
});

// ---------- инвентарь ----------
const INV_KINDS = { all: ['Все', () => true], fav: ['♥ Избранное', (it, x) => x.fav], w: ['Оружие', it => it.t === 'w' || it.t === 'sv'], k: ['★ Ножи и перчатки', it => it.t === 'k'], s: ['Наклейки', it => it.t === 's'], p: ['Нашивки и пины', it => it.t === 'patch' || it.t === 'pin'] };
const invSel = new Set();
let invLimit = 240;
function sortedInv(sort, q, filt = () => true) {
  let list = S.inv.filter(x => filt(ITEMS[x.i], x));
  if (q) list = list.filter(x => fullName(x.i, x.st).toLowerCase().includes(q));
  const by = { new: (a, b) => b.t - a.t || b.u - a.u, price: (a, b) => priceOf(b) - priceOf(a), cheap: (a, b) => priceOf(a) - priceOf(b), rarity: (a, b) => ITEMS[b.i].r - ITEMS[a.i].r || priceOf(b) - priceOf(a) }[sort];
  return list.sort(by);
}
function renderInv() {
  const ik = S.set.invKind;
  $('#invTabs').innerHTML = Object.entries(INV_KINDS).map(([k, [n, f]]) => `<button data-ik="${k}" class="${k === ik ? 'on' : ''}">${n} <small>${S.inv.filter(x => f(ITEMS[x.i], x)).length}</small></button>`).join('');
  const list = sortedInv($('#invSort').value, $('#invSearch').value.trim().toLowerCase(), INV_KINDS[ik][1]);
  for (const u of [...invSel]) if (!S.inv.some(x => x.u === u)) invSel.delete(u);
  $('#invValue').textContent = fmt(S.inv.reduce((s, x) => s + priceOf(x), 0));
  const selVal = S.inv.filter(x => invSel.has(x.u)).reduce((s, x) => s + sellPrice(x), 0);
  $('#sellSel').disabled = !invSel.size;
  $('#sellSel').textContent = invSel.size ? `Продать ${invSel.size} · ${fmt(selVal)}` : 'Продать выбранные';
  $('#selAll').textContent = invSel.size ? 'Снять выбор' : 'Выбрать все';
  $('#invGrid').innerHTML = list.length
    ? list.slice(0, invLimit).map(x => itemCard(x, { cls: (invSel.has(x.u) ? 'sel ' : '') + (x.u === S.eq ? 'eq' : ''), attr: `data-u="${x.u}"`, info: true })).join('')
      + (list.length > invLimit ? `<button class="btn" id="invMore" style="grid-column:1/-1">Показать ещё (${list.length - invLimit})</button>` : '')
    : '<div class="empty">Пусто. Откройте кейс!</div>';
}
RENDER.inventory = renderInv;
$('#invTabs').addEventListener('click', e => { const b = e.target.closest('[data-ik]'); if (b) { S.set.invKind = b.dataset.ik; invSel.clear(); renderInv(); } });
$('#invSearch').addEventListener('input', renderInv);
$('#invSort').addEventListener('change', renderInv);
$('#invGrid').addEventListener('click', e => {
  if (e.target.id === 'invMore') { invLimit += 240; renderInv(); return; }
  const info = e.target.closest('[data-info]');
  if (info) { showItem(+info.dataset.info); return; }
  const c = e.target.closest('[data-u]'); if (!c) return;
  const u = +c.dataset.u;
  if (S.inv.find(x => x.u === u)?.fav) { showItem(u); return; } // избранное не выделяется под продажу
  invSel.has(u) ? invSel.delete(u) : invSel.add(u); renderInv();
});
$('#selAll').addEventListener('click', () => {
  if (invSel.size) invSel.clear(); else sortedInv('new', $('#invSearch').value.trim().toLowerCase(), INV_KINDS[S.set.invKind][1]).forEach(x => x.u !== S.eq && !x.fav && invSel.add(x.u));
  renderInv();
});
$('#sellSel').addEventListener('click', () => { sellUids([...invSel]); invSel.clear(); renderInv(); });
$('#sellCheap').addEventListener('click', () => {
  modal(`<h2>Продать дешёвые<button class="btn ghost" data-close>✕</button></h2>
    <p class="muted">Все предметы дешевле указанной цены, кроме ножей, перчаток, избранного, экипированного и скинов с наклейками.</p>
    <div class="game-row"><label>Дешевле $ <input type="number" id="cheapLim" value="1" min="0" step="0.1"></label><button class="btn primary" id="cheapGo">Продать</button></div>
    <p class="muted" id="cheapInfo"></p>`, box => {
    const upd = () => {
      const lim = +$('#cheapLim', box).value || 0;
      const l = S.inv.filter(x => ITEMS[x.i].r < 6 && x.u !== S.eq && !x.fav && !stickerKeys(x).length && priceOf(x) < lim);
      $('#cheapInfo', box).textContent = `${l.length} предм. · вы получите ${fmt(l.reduce((s, x) => s + sellPrice(x), 0))} (комиссия ${SELL_FEE * 100}%)`;
      return l;
    };
    upd(); $('#cheapLim', box).oninput = upd;
    $('#cheapGo', box).onclick = () => { sellUids(upd().map(x => x.u)); closeModal(); renderInv(); };
  });
});
function removeUids(set) {
  S.inv = S.inv.filter(x => !set.has(x.u));
  if (set.has(S.eq)) S.eq = null;
  tuSel = tuSel.filter(u => !set.has(u)); upSel = upSel.filter(u => !set.has(u)); jpSel = jpSel.filter(u => !set.has(u));
}
const sellPrice = x => Math.round(priceOf(x) * (1 - SELL_FEE) * 100) / 100;
function sellUids(uids) {
  const set = new Set(uids); let sum = 0, n = 0;
  S.inv.forEach(x => { if (set.has(x.u)) { sum += sellPrice(x); n++; } });
  if (!n) return;
  removeUids(set);
  addMoney(sum); S.st.sold += sum; ev('sell', sum);
  toast(`Продано: ${n}`, `+${fmt(sum)} · комиссия ${SELL_FEE * 100}%`, 'good'); beep('coin'); save(); renderTop(); renderNav(); checkAch();
}
function showItem(u) {
  const x = S.inv.find(y => y.u === u); if (!x) return;
  const canEq = unlocked('equip') && !isFlat(ITEMS[x.i]);
  modal(`<h2>Предмет<button class="btn ghost" data-close>✕</button></h2>${dropDetails(x)}
    <div class="modal-actions"><button class="btn primary" id="iSell" title="Цена ${fmt(priceOf(x))}, комиссия ${SELL_FEE * 100}%">Продать · ${fmt(sellPrice(x))}</button>
    ${canEq ? `<button class="btn" id="iEq">${S.eq === u ? 'Снять' : 'Экипировать (+' + Math.round(0.2 * Math.log10(1 + priceOf(x)) * 100) + '% дохода)'}</button>` : ''}
    <button class="btn" id="iFav">${x.fav ? '♡ Убрать из избранного' : '♥ В избранное'}</button>
    ${ITEMS[x.i].t === 'w' ? '<button class="btn" id="iCraft">Наклейки · ' + stickerKeys(x).length + '/5</button>' : ''}<button class="btn" data-close>Закрыть</button></div>`,
  box => {
    $('#iSell', box).onclick = () => { if (x.fav) { toast('Предмет в избранном', 'Сначала уберите его из избранного'); return; } sellUids([u]); closeModal(); RENDER[curTab](); };
    const craft = $('#iCraft', box); if (craft) craft.onclick = () => showStickerCraft(u);
    $('#iFav', box).onclick = () => { x.fav = !x.fav; invSel.delete(u); save(); RENDER[curTab](); showItem(u); };
    const eq = $('#iEq', box);
    if (eq) eq.onclick = () => { S.eq = S.eq === u ? null : u; save(); closeModal(); RENDER[curTab](); toast(S.eq ? 'Экипировано' : 'Снято', fullName(x.i, x.st)); };
  });
}

// ---------- магазин ----------
function renderShop() {
  $('#upgrades').innerHTML = Object.keys(UPG).map(upgRow).join('');
  $('#unlocks').innerHTML = UNLOCKS.map(([k, ic, n, d, c]) => `<div class="unl ${S.unl[k] ? 'done' : ''}"><div class="ic">${ic}</div><b>${n}</b><small>${d}</small>
    ${S.unl[k] ? '' : `<button class="btn ${canPay(c) ? 'primary' : ''}" data-unlock="${k}">${fmt(c)}</button>`}</div>`).join('');
}
RENDER.shop = renderShop;

// ---------- контракты обмена ----------
let tuSel = [];
const tuItems = () => tuSel.map(u => S.inv.find(x => x.u === u)).filter(Boolean);
const tuCap = () => { const l = tuItems(); return l.length && ITEMS[l[0].i].r === 5 ? 5 : 10; };
function tuOk(x) {
  const it = ITEMS[x.i], b = BOXES[x.c];
  return !stickerKeys(x).length && it.t === 'w' && !!b && ['case', 'terminal', 'collection'].includes(b.k) && !!b.g[it.r + 1];
}
function tuEligible(x) {
  if (!tuOk(x) || x.u === S.eq) return false;
  const l = tuItems(); if (!l.length) return true;
  return ITEMS[l[0].i].r === ITEMS[x.i].r && l[0].st === x.st;
}
function tuOutcomes() {
  const l = tuItems(); if (!l.length) return [];
  const g = ITEMS[l[0].i].r + 1, st = l[0].st;
  const norm = l.reduce((s, x) => { const [a, b] = ITEMS[x.i].f; return s + (b > a ? (x.fl - a) / (b - a) : 0); }, 0) / l.length;
  const map = new Map();
  l.forEach(x => {
    const pool = BOXES[x.c].g[g];
    pool.forEach(i => { const o = map.get(i) || { i, c: x.c, p: 0 }; o.p += 1 / l.length / pool.length; map.set(i, o); });
  });
  return [...map.values()].map(o => {
    const [a, b] = ITEMS[o.i].f;
    o.fl = a + norm * (b - a); o.st = st && !!ITEMS[o.i].st; o.price = variantPrice(o.i, wearIdx(o.fl), o.st);
    return o;
  }).sort((a, b) => b.price - a.price);
}
function renderTU() {
  if (!gate('tab-tradeup', 'tradeup')) return;
  tuSel = tuSel.filter(u => S.inv.some(x => x.u === u));
  const l = tuItems(), cap = tuCap();
  $('#tuSlots').innerHTML = Array.from({ length: 10 }, (_, k) => {
    if (k >= cap) return '<div class="slot off"></div>';
    const x = l[k];
    return x ? `<div class="slot full" style="--c:${tcol(ITEMS[x.i].r)}" data-rm="${x.u}" title="${esc(fullName(x.i, x.st))}"><img src="${img(ITEMS[x.i].img, '128fx96f')}" alt=""></div>` : '<div class="slot">+</div>';
  }).join('');
  const inVal = l.reduce((s, x) => s + priceOf(x), 0);
  const outs = tuOutcomes(), ev = outs.reduce((s, o) => s + o.p * o.price, 0);
  $('#tuInfo').innerHTML = l.length ? `${l.length}/${cap} · вложено <b>${fmt(inVal)}</b> · ожидаемо <b style="color:${ev >= inVal ? 'var(--good)' : 'var(--bad)'}">${fmt(ev)}</b>` : 'Добавьте предметы из инвентаря ниже';
  $('#tuGo').disabled = l.length !== cap;
  $('#tuOutcomes').innerHTML = outs.length ? outs.map(o => itemCard({ i: o.i, fl: o.fl, st: o.st }, { price: o.price, extra: `<div class="chance">${(o.p * 100).toFixed(1)}% · ${o.fl.toFixed(3)}</div>` })).join('') : '<div class="empty">—</div>';
  const inv = sortedInv('cheap', '').filter(x => tuOk(x) && !tuSel.includes(x.u));
  $('#tuInv').innerHTML = inv.length ? inv.slice(0, 300).map(x => itemCard(x, { cls: tuEligible(x) && l.length < cap ? '' : 'dim', attr: `data-add="${x.u}"` })).join('') : '<div class="empty">Нет подходящих предметов. Нужны скины из оружейных кейсов или коллекций.</div>';
}
RENDER.tradeup = renderTU;
$('#tuInv').addEventListener('click', e => {
  const c = e.target.closest('[data-add]'); if (!c) return;
  const x = S.inv.find(y => y.u === +c.dataset.add);
  if (x && tuEligible(x) && tuItems().length < tuCap()) { tuSel.push(x.u); renderTU(); }
});
$('#tuSlots').addEventListener('click', e => { const s = e.target.closest('[data-rm]'); if (s) { tuSel = tuSel.filter(u => u !== +s.dataset.rm); renderTU(); } });
$('#tuClear').addEventListener('click', () => { tuSel = []; renderTU(); });
$('#tuAuto').addEventListener('click', () => {
  if (!tuItems().length) {
    const groups = {};
    sortedInv('cheap', '').filter(x => tuOk(x) && x.u !== S.eq && !x.fav).forEach(x => { const k = ITEMS[x.i].r + (x.st ? 's' : ''); (groups[k] = groups[k] || []).push(x); });
    const gs = Object.values(groups);
    const g = gs.find(g => g.length >= (ITEMS[g[0].i].r === 5 ? 5 : 10)) || gs.sort((a, b) => b.length - a.length)[0];
    if (!g) { toast('Нет предметов для контракта'); return; }
    tuSel = [g[0].u];
  }
  for (const x of sortedInv('cheap', '')) { if (tuItems().length >= tuCap()) break; if (!tuSel.includes(x.u) && !x.fav && tuEligible(x)) tuSel.push(x.u); }
  renderTU();
});
$('#tuGo').addEventListener('click', () => {
  const l = tuItems(); if (l.length !== tuCap()) return;
  const outs = tuOutcomes();
  let r = rnd(), o = outs[outs.length - 1];
  for (const c of outs) { if (r < c.p) { o = c; break; } r -= c.p; }
  removeUids(new Set(tuSel)); tuSel = [];
  const x = newItem(o.i, o.c, { fl: o.fl, st: o.st });
  S.inv.push(x); trackDrop(x); S.st.tradeups++; ev('tradeup'); addXP(40); save(); renderTop(); renderNav(); renderTU(); checkAch();
  beep(ITEMS[x.i].r >= 5 ? 'rare' : 'win');
  modal(`<h2>Результат контракта<button class="btn ghost" data-close>✕</button></h2>${dropDetails(x)}<div class="modal-actions"><button class="btn primary" data-close>Отлично</button></div>`);
  celebrate(ITEMS[x.i].r);
});

// ---------- апгрейд ----------
let upSel = [], upTarget = null, upSpinning = false, needleRot = 0, upMult = 0;
const UP_MULTS = [1.5, 2, 3, 5, 10, 20];
// диапазон цен для множителя: от ×m до ×m·1.25 (шанс примерно 90/m … 72/m %)
const upRange = () => { const a = upInVal(); return upMult && a ? [a * upMult, a * upMult * 1.25] : [a * 1.05, Infinity]; };
const upInVal = () => upSel.map(u => S.inv.find(x => x.u === u)).filter(Boolean).reduce((s, x) => s + priceOf(x), 0);
const upChance = () => { const a = upInVal(); return upTarget && a > 0 && upTarget.p > a ? Math.min(0.9, a / upTarget.p * 0.9) : 0; };
function renderUp() {
  if (!gate('tab-upgrade', 'upgrade')) return;
  upSel = upSel.filter(u => S.inv.some(x => x.u === u));
  const a = upInVal();
  if (upTarget && upTarget.p <= a) upTarget = null;
  $('#upIn').innerHTML = upSel.map(u => S.inv.find(x => x.u === u)).map(x => itemCard(x, { attr: `data-uprm="${x.u}"` })).join('');
  $('#upInVal').textContent = fmt(a);
  $('#upTarget').innerHTML = upTarget ? itemCard(upTarget, { price: upTarget.p }) : '';
  $('#upTVal').textContent = upTarget ? fmt(upTarget.p) : '—';
  const ch = upChance();
  $('#upChance').textContent = (ch * 100).toFixed(ch < 0.1 ? 2 : 1) + '%';
  $('#wheel').style.setProperty('--p', ch * 100);
  $('#upGo').disabled = !ch || upSpinning;
  $('#multBtns').innerHTML = UP_MULTS.map(m => `<button data-m="${m}" class="${m === upMult ? 'on' : ''}" ${a ? '' : 'disabled'}>×${m}</button>`).join('');
  const inv = sortedInv('price', '').filter(x => x.u !== S.eq);
  $('#upInv').innerHTML = inv.length ? inv.slice(0, 300).map(x => itemCard(x, { cls: upSel.includes(x.u) ? 'sel' : '', attr: `data-upadd="${x.u}"` })).join('') : '<div class="empty">Инвентарь пуст</div>';
  renderUpCatalog();
}
RENDER.upgrade = renderUp;
function upCatalogList() {
  const [lo, hi] = upRange(), q = $('#upSearch').value.trim().toLowerCase(), desc = $('#upSort').value === 'exp';
  // CATALOG отсортирован по цене: берём отрезок [lo, hi] и идём с нужного конца
  let from = CATALOG.findIndex(v => v.p >= lo); if (from < 0) from = CATALOG.length;
  let to = hi === Infinity ? CATALOG.length : CATALOG.findIndex(v => v.p > hi); if (to < 0) to = CATALOG.length;
  const list = [];
  for (let n = 0; n < to - from && list.length < 150; n++) {
    const v = CATALOG[desc ? to - 1 - n : from + n];
    if (q && !fullName(v.i, v.st).toLowerCase().includes(q)) continue;
    list.push(v);
  }
  return list;
}
function renderUpCatalog() {
  const list = upCatalogList(), [lo, hi] = upRange();
  $('#upRange').textContent = upMult && upInVal() ? `×${upMult}: ${fmt(lo)} – ${fmt(hi)}` : '';
  $('#upCatalog').innerHTML = list.map(v => itemCard(v, { price: v.p, cls: upTarget === v ? 'sel' : '', attr: `data-cat="${v.id}"` })).join('') || '<div class="empty">Ничего не найдено. Измените поиск или фильтры.</div>';
}
$('#upSearch').addEventListener('input', renderUpCatalog);
$('#upSort').addEventListener('change', renderUpCatalog);
$('#tab-upgrade').addEventListener('click', e => {
  if (upSpinning) return;
  let c;
  if ((c = e.target.closest('[data-upadd]'))) {
    const u = +c.dataset.upadd;
    if (upSel.includes(u)) upSel = upSel.filter(x => x !== u); else if (upSel.length < 6) upSel.push(u); else toast('Максимум 6 предметов');
    renderUp();
  } else if ((c = e.target.closest('[data-uprm]'))) { upSel = upSel.filter(u => u !== +c.dataset.uprm); renderUp(); }
  else if ((c = e.target.closest('[data-cat]'))) { upTarget = CATALOG[+c.dataset.cat]; renderUp(); }
  else if ((c = e.target.closest('[data-m]'))) {
    const m = +c.dataset.m;
    upMult = upMult === m ? 0 : m; // повторное нажатие снимает фильтр
    if (upMult) { const [lo, hi] = upRange(); upTarget = CATALOG.find(v => v.p >= lo && v.p <= hi) || null; if (!upTarget) toast('В этом диапазоне нет предметов'); }
    $('#upCatalog').scrollTop = 0; renderUp();
  }
  else if (e.target.closest('#upGo')) {
    const ch = upChance(); if (!ch) return;
    upSpinning = true; $('#upGo').disabled = true;
    const r = rnd(), win = r < ch, t = upTarget;
    const wheel = $('#wheel'), needle = $('#needle');
    wheel.classList.remove('win', 'lose');
    needleRot = needleRot - (needleRot % 360) + 360 * 5 + r * 360;
    needle.style.transition = 'transform 4s cubic-bezier(.15,.7,.2,1)';
    needle.style.transform = `rotate(${needleRot}deg)`;
    setTimeout(() => {
      upSpinning = false;
      removeUids(new Set(upSel)); upSel = [];
      addXP(15);
      if (win) {
        const x = newItem(t.i, origin.get(t.i), { w: t.w, st: t.st, plain: true });
        S.inv.push(x); trackDrop(x); S.st.upWins++; wheel.classList.add('win'); beep('rare');
        const b = wheel.getBoundingClientRect(); FX.burst(b.left + b.width / 2, b.top + b.height / 2, ['#3ee08f', '#fff', tcol(ITEMS[t.i].r)], 120);
        toast('Апгрейд успешен!', fullName(t.i, t.st) + ' · ' + fmt(t.p), 'good');
      } else { S.st.upLoss++; wheel.classList.add('lose'); beep('err'); toast('Не повезло', 'Предметы сгорели', 'bad'); }
      upTarget = null; save(); renderTop(); renderNav(); renderUp(); checkAch();
    }, 4100);
  }
});

// ---------- заказы коллекционеров ----------
// Вместо маркета: коллекционер просит конкретный предмет из доступного кейса и платит больше рынка.
// Награда = 1.5 средней цены предмета + 20% стоимости открытий, которые в среднем нужны, чтобы его выбить.
const ORDER_SLOTS = 3, ORDER_TTL = 3 * 3600e3, ORDER_NEXT = 5 * 60e3, ORDER_SKIP = 15 * 60e3;
const orderItem = o => KEYMAP.get(o.k);
function orderMatches(o) {
  const i = orderItem(o);
  return S.inv.filter(x => (PHASE_BASE.get(x.i) ?? x.i) === i && !x.fav && x.u !== S.eq).sort((a, b) => priceOf(a) - priceOf(b));
}
const ordersReady = () => S.orders.filter(o => o.k && orderMatches(o).length).length;
function genOrder() {
  const all = BOXES.filter(b => ((b.k === 'custom' && customReady(b)) || b.k === 'case') && Object.keys(b.g).some(t => +t < 6)).sort((a, b) => boxCost(a) - boxCost(b));
  const cap = Math.max(1, S.money * 0.3, baseSec() * 600);
  const taken = new Set(S.orders.map(o => o.k));
  const pool = all.filter(b => boxCost(b) <= cap);
  const b = pool.length ? pick(pool) : all[0];
  // не самая частая редкость; редкие выпадают реже (вес — корень из шанса)
  let odds = boxOdds(b).filter(([t]) => t < 6);
  if (odds.length > 1) odds = odds.slice(1);
  let r = rnd() * odds.reduce((s, [, p]) => s + Math.sqrt(p), 0), t = odds[0][0], pt = odds[0][1];
  for (const [tt, p] of odds) { t = tt; pt = p; if ((r -= Math.sqrt(p)) < 0) break; }
  const list = b.g[t].filter(i => !taken.has(keyOf(ITEMS[i])));
  const i = pick(list.length ? list : b.g[t]), p = pt / b.g[t].length;
  const reward = Math.round((itemEV(i, b) * 1.5 + boxCost(b) * Math.min(150, 1 / p) * 0.2) * 100) / 100;
  return { k: keyOf(ITEMS[i]), b: b.n, p, r: Math.max(0.1, reward), until: Date.now() + ORDER_TTL };
}
// заполняет пустые и просроченные места; true — если что-то изменилось
function tickOrders() {
  const now = Date.now(); let changed = false;
  S.orders = S.orders.filter(o => o.wait || (orderItem(o) != null && BOXMAP.has(o.b)));
  while (S.orders.length < ORDER_SLOTS) { S.orders.push({ wait: now }); }
  S.orders.forEach((o, k) => {
    if ((o.wait && now >= o.wait) || (o.until && now >= o.until)) { S.orders[k] = genOrder(); changed = true; }
  });
  return changed;
}
function renderOrders() {
  tickOrders();
  const now = Date.now();
  $('#orders').innerHTML = S.orders.map((o, k) => {
    if (o.wait) return `<div class="order wait"><div class="od-wait">⏳</div><div class="od-body"><b>Коллекционер скоро появится</b><small class="muted">Новый заказ через <span data-left="${o.wait}">${fmtDur((o.wait - now) / 1000)}</span></small></div></div>`;
    const i = orderItem(o), b = BOXES[BOXMAP.get(o.b)], m = orderMatches(o), it = ITEMS[i];
    return `<div class="order ${m.length ? 'ready' : ''}" style="--c:${tcol(it.r)}">${itemCard({ i, w: b.variants?.[i] }, { price: itemEV(i, b), got: !!S.found[o.k] })}
      <div class="od-body"><b>${esc(fullName(i))}</b>
        <small class="muted">${esc(tierName(it))} · кейс «${esc(b.n)}» · шанс ${pct(o.p * 100)} за открытие</small>
        <div class="od-rw">Награда <b>${fmt(o.r)}</b> <span class="muted">· +1 очко звания · +40 опыта</span></div>
        <small class="muted">Заказ действует ещё <span data-left="${o.until}">${fmtDur((o.until - now) / 1000)}</span></small>
        <div class="od-act">${m.length ? `<button class="btn green" data-od="${k}">Сдать${m[0].st ? ' ST™' : ''} ${WEAR[wearIdx(m[0].fl)] && !it.v && !isFlat(it) ? WEAR[wearIdx(m[0].fl)].s : ''} (цена ${fmt(priceOf(m[0]))})</button>` : `<button class="btn primary" data-odbox="${esc(o.b)}">Открыть «${esc(b.n)}» · ${fmt(boxCost(b))}</button>`}
          <button class="btn ghost" data-odskip="${k}">Отказаться</button></div></div></div>`;
  }).join('');
  $('#ordersInfo').textContent = `Выполнено заказов: ${S.st.orders}`;
}
RENDER.orders = renderOrders;
$('#orders').addEventListener('click', e => {
  let c;
  if ((c = e.target.closest('[data-odbox]'))) { openBoxPage(BOXMAP.get(c.dataset.odbox)); return; }
  if ((c = e.target.closest('[data-odskip]'))) { S.orders[+c.dataset.odskip] = { wait: Date.now() + ORDER_SKIP }; save(); renderOrders(); renderNav(); return; }
  if (!(c = e.target.closest('[data-od]'))) return;
  const k = +c.dataset.od, o = S.orders[k], x = o && o.k && orderMatches(o)[0]; if (!x) return;
  const before = rankOf();
  removeUids(new Set([x.u])); addMoney(o.r); S.rp++; S.st.orders++; addXP(40);
  S.orders[k] = { wait: Date.now() + ORDER_NEXT };
  const r = c.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top, ['#3ee08f', '#ffc15e', '#fff'], 60);
  toast('📋 Заказ выполнен', `+${fmt(o.r)} · +1 очко звания`, 'good'); beep('win');
  if (rankOf() > before) { toast('Новое звание!', `${RANKS[rankOf()][0]} · доход +${rankOf() * 5}%`, 'gold'); beep('rare'); }
  save(); renderTop(); renderNav(); renderOrders(); checkAch();
});

// ---------- казино ----------
const GAMES = { battle: ['⚔️', 'Батл кейсов'], crash: ['🚀', 'Краш'], coinflip: ['🪙', 'Монетка'], roulette: ['🎡', 'Рулетка'], mines: ['💣', 'Мины'], tower: ['🗼', 'Башня'], jackpot: ['💰', 'Джекпот'] };
const hist = {};
function addHist(id, html) { (hist[id] = hist[id] || []).unshift(html); hist[id].length = Math.min(hist[id].length, 16); const el = $('#' + id); if (el) el.innerHTML = hist[id].join(''); }
function betInput(id, val = 1) { return `<label>Ставка <input id="${id}" type="number" min="0.01" step="0.01" value="${val}"></label><button class="btn ghost" data-half="${id}">½</button><button class="btn ghost" data-dbl="${id}">×2</button><button class="btn ghost" data-max="${id}">Всё</button>`; }
function readBet(id) {
  const bet = Math.round(+$('#' + id).value * 100) / 100;
  if (!(bet > 0)) { toast('Введите ставку'); return 0; }
  return pay(bet) ? bet : 0;
}
function gameWin(bet, win, label) {
  addMoney(win); S.st.gambleNet += win - bet;
  if (win > bet) { S.st.gameWins++; ev('game'); beep('win'); toast(label || 'Победа!', '+' + fmt(win), 'good'); }
  renderTop(); save(); checkAch();
}
function gameLose(bet) { S.st.gambleNet -= bet; beep('err'); save(); }
let busyGame = false;
function renderGames() {
  const g = S.set.game;
  $('#gameTabs').innerHTML = Object.entries(GAMES).map(([k, [ic, n]]) => `<button data-game="${k}" class="${k === g ? 'on' : ''}">${ic} ${n}${S.unl[k] ? '' : ' 🔒'}</button>`).join('');
  if (busyGame) return;
  const area = $('#gameArea');
  if (!S.unl[g]) { area.innerHTML = lockWall(g); return; }
  area.innerHTML = `<div class="panel glass game">${GAME_UI[g]()}</div>`;
  GAME_INIT[g] && GAME_INIT[g]();
}
RENDER.games = renderGames;
$('#gameTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-game]'); if (!b) return;
  if (busyGame) { toast('Дождитесь конца игры'); return; }
  S.set.game = b.dataset.game; renderGames();
});
const GAME_UI = {
  crash: () => `<h2>Краш</h2><canvas id="crashCanvas" width="800" height="340"></canvas>
    <div class="game-row">${betInput('crashBet')}<label>Автовывод × <input id="crashAuto" type="number" min="1.01" step="0.01" placeholder="—"></label><button class="btn primary" id="crashGo">Ставка</button></div>
    <div class="history" id="crashHist">${(hist.crashHist || []).join('')}</div>`,
  coinflip: () => `<h2>Монетка</h2><div class="coin-stage"><div class="coin" id="coin" style="transform:rotateY(${coinRot}deg)"><div class="face ct">CT</div><div class="face t">T</div></div></div>
    <div class="game-row">${betInput('coinBet')}<button class="btn ct-btn" data-side="ct">За CT ×1.96</button><button class="btn t-btn" data-side="t">За T ×1.96</button></div>
    <div class="history" id="coinHist">${(hist.coinHist || []).join('')}</div>`,
  roulette: () => `<h2>Рулетка</h2><div class="rl-wrap"><div class="rl-strip" id="rlStrip"></div></div>
    <div class="game-row">${betInput('rlBet')}</div>
    <div class="rl-bets"><button class="btn r" data-rl="r">Красное ×2</button><button class="btn g" data-rl="g">Зелёное ×14</button><button class="btn b" data-rl="b">Чёрное ×2</button></div>
    <div class="history" id="rlHist">${(hist.rlHist || []).join('')}</div>`,
  mines: () => `<h2>Мины</h2><div class="mines" id="minesGrid"></div>
    <div class="game-row">${betInput('mnBet')}<label>Мин <select id="mnCount">${[1, 3, 5, 10, 15, 20, 24].map(n => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <button class="btn primary" id="mnGo">Играть</button><span class="muted" id="mnInfo"></span></div>`,
  tower: () => `<h2>Башня</h2><div class="tower" id="towerGrid"></div>
    <div class="game-row">${betInput('twBet')}<button class="btn primary" id="twGo">Играть</button><span class="muted" id="twInfo"></span></div>`,
  jackpot: () => `<h2>Джекпот</h2><p class="muted">Поставьте до 10 скинов. Против вас сыграют боты, шанс победы пропорционален стоимости ставки. Победитель забирает все предметы.</p>
    <div id="jpPlayers" class="jp-players"></div><div class="jp-bar" id="jpBar"></div><div class="jp-wrap"><div class="jp-strip" id="jpStrip"></div></div>
    <div class="game-row"><span class="muted">Ваша ставка: <b id="jpVal">$0</b></span><button class="btn primary" id="jpGo" disabled>Начать раунд</button></div>
    <h3 class="muted-h">Выберите скины</h3><div id="jpInv" class="item-grid small scroll"></div>`,
};
// батл: те же кейсы, что можно открыть обычно; дороже суммарный дроп — забираешь всё
const battleBoxes = () => BOXES.map((b, i) => ({ b, i })).filter(({ b }) => (b.k === 'custom' && customReady(b)) || b.k === 'case' || b.k === 'terminal').sort((x, y) => boxCost(x.b) - boxCost(y.b));
GAME_UI.battle = () => `<h2>Батл кейсов</h2><p class="muted">Вы и боты открываете один и тот же кейс несколько раундов. У кого суммарный дроп дороже, тот забирает все предметы. Платите только за свои открытия.</p>
    <div class="game-row"><label>Кейс <select id="btBox">${battleBoxes().map(({ b, i }) => `<option value="${i}" ${b.n === (S.set.btBox || 'Разминка') ? 'selected' : ''}>${esc(b.n)} · ${fmt(boxCost(b))}</option>`).join('')}</select></label>
    <label>Раундов <select id="btRounds">${[1, 2, 3, 5].map(n => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label>Соперников <select id="btBots">${[1, 2, 3].map(n => `<option ${n === 1 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <button class="btn primary" id="btGo">Начать</button></div><div id="btArena" class="bt-arena"></div>`;
const GAME_INIT = {};
GAME_INIT.battle = () => {
  const upd = () => { const b = BOXES[+$('#btBox').value]; $('#btGo').textContent = b ? `Начать · ${fmt(boxCost(b) * +$('#btRounds').value)}` : 'Начать'; };
  ['#btBox', '#btRounds'].forEach(q => $(q).addEventListener('change', upd)); upd();
};
const GA = $('#gameArea');
GA.addEventListener('click', e => {
  const t = e.target.closest('[data-half],[data-dbl],[data-max]'); if (!t) return;
  const inp = $('#' + (t.dataset.half || t.dataset.dbl || t.dataset.max)); if (!inp) return;
  const v = +inp.value || 0;
  inp.value = (t.dataset.half ? Math.max(0.01, v / 2) : t.dataset.dbl ? v * 2 : Math.floor(S.money * 100) / 100).toFixed(2);
});

GA.addEventListener('click', async e => {
  if (e.target.id !== 'btGo' || busyGame) return;
  const bi = +$('#btBox').value, b = BOXES[bi], rounds = +$('#btRounds').value, nb = +$('#btBots').value;
  if (!b || !customReady(b)) return;
  const cost = boxCost(b) * rounds;
  if (!pay(cost)) return;
  busyGame = true; e.target.disabled = true; S.set.btBox = b.n;
  S.st.battles++; S.st.opened += rounds; S.st.spent += cost; ev('open', rounds); addXP(20 * rounds);
  renderTop(); save();
  const names = BOT_NAMES.slice().sort(() => rnd() - 0.5);
  const ps = [{ n: 'Вы', me: true, c: JP_COL[0], d: [], v: 0 }, ...Array.from({ length: nb }, (_, k) => ({ n: names[k], c: JP_COL[k + 1], d: [], v: 0 }))];
  const arena = $('#btArena');
  arena.style.setProperty('--n', ps.length);
  arena.innerHTML = ps.map((p, k) => `<div class="bt-col" id="btc${k}" style="--c:${p.c}"><div class="bt-head"><div class="av">${esc(p.n[0].toUpperCase())}</div><div><b>${esc(p.n)}</b><small id="btv${k}">$0.00</small></div></div>
    ${Array.from({ length: rounds }, (_, r) => `<div class="bt-slot" id="bts${k}-${r}"><img src="${img(b.img, '128fx96f')}" alt=""></div>`).join('')}</div>`).join('');
  const step = S.set.fast ? 350 : 1100;
  for (let r = 0; r < rounds; r++) {
    $$('.bt-slot', arena).forEach(el => el.classList.toggle('spin', el.id.endsWith('-' + r)));
    await wait(step);
    let best = 0;
    ps.forEach((p, k) => {
      const x = rollDrop(bi); p.d.push(x); p.v += priceOf(x); best = Math.max(best, ITEMS[x.i].r);
      const slot = $('#bts' + k + '-' + r, arena); slot.classList.remove('spin'); slot.innerHTML = itemCard(x, { cls: 'flip' });
      $('#btv' + k, arena).textContent = fmt(p.v);
    });
    const lead = Math.max(...ps.map(p => p.v));
    ps.forEach((p, k) => $('#btc' + k, arena).classList.toggle('lead', p.v === lead));
    beep(best >= 4 ? 'rare' : 'tick');
    await wait(step / 2);
  }
  const top = Math.max(...ps.map(p => p.v)), tied = ps.filter(p => p.v === top), win = pick(tied);
  const pot = ps.reduce((s, p) => s + p.v, 0), mine = ps[0].v;
  busyGame = false;
  if (win.me) {
    ps.forEach(p => p.d.forEach(x => { S.inv.push(x); trackDrop(x); }));
    S.st.battleWins++; S.st.gameWins++; S.st.gambleNet += pot - cost; ev('game');
    toast('Победа в батле!', `Забираете ${ps.reduce((s, p) => s + p.d.length, 0)} предм. на ${fmt(pot)}`, 'gold'); beep('rare');
    FX.burst(innerWidth / 2, innerHeight / 2, ['#ffd45c', '#ff9f1c', '#fff', '#3ee08f'], 160, 12);
  } else {
    S.st.gambleNet -= cost; beep('err');
    toast(`Батл выиграл ${win.n}`, `Ваш дроп ${fmt(mine)} против ${fmt(top)}`, 'bad');
  }
  arena.insertAdjacentHTML('afterbegin', `<div class="bt-result ${win.me ? 'win' : 'lose'}">${win.me ? `🏆 Вы победили · ${fmt(pot)} в инвентаре` : `Победил ${esc(win.n)} · ${fmt(top)}`}</div>`);
  const go = $('#btGo'); if (go) go.disabled = false;
  save(); renderTop(); renderNav(); checkAch();
});

// краш
const crash = { on: false, bet: 0, at: 1, t0: 0, m: 1, out: false, pts: [] };
function drawCrash(state) {
  const cv = $('#crashCanvas'); if (!cv) return;
  const cx = cv.getContext('2d'), W = cv.width, H = cv.height; cx.clearRect(0, 0, W, H);
  cx.strokeStyle = 'rgba(255,255,255,.05)'; cx.lineWidth = 1;
  for (let y = 0; y < H; y += 48) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
  const pts = crash.pts, maxT = Math.max(8000, pts.length ? pts[pts.length - 1][0] : 0), maxM = Math.max(2, crash.m * 1.15);
  const X = t => 24 + t / maxT * (W - 70), Y = m => H - 24 - (m - 1) / (maxM - 1) * (H - 80);
  const col = state === 'crashed' ? '#ff5a5f' : state === 'out' ? '#3ee08f' : '#ff9f1c';
  if (pts.length > 1) {
    const grad = cx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, col + '55'); grad.addColorStop(1, col + '00');
    cx.beginPath(); cx.moveTo(X(0), H - 24);
    pts.forEach(([t, m]) => cx.lineTo(X(t), Y(m)));
    cx.lineTo(X(pts[pts.length - 1][0]), H - 24); cx.fillStyle = grad; cx.fill();
    cx.beginPath(); pts.forEach(([t, m], k) => (k ? cx.lineTo(X(t), Y(m)) : cx.moveTo(X(t), Y(m))));
    cx.strokeStyle = col; cx.lineWidth = 4; cx.shadowColor = col; cx.shadowBlur = 16; cx.stroke(); cx.shadowBlur = 0;
    const [lt, lm] = pts[pts.length - 1];
    cx.font = '30px serif'; cx.fillText(state === 'crashed' ? '💥' : '🚀', X(lt) - 14, Y(lm) - 4);
  }
  cx.fillStyle = state === 'crashed' ? '#ff5a5f' : state === 'out' ? '#3ee08f' : '#eef1f7';
  cx.font = '700 64px "Chakra Petch", sans-serif'; cx.textAlign = 'center';
  cx.fillText(state === 'idle' ? 'Сделайте ставку' : crash.m.toFixed(2) + '×', W / 2, H / 2);
  if (state === 'crashed') { cx.font = '600 22px Inter, sans-serif'; cx.fillText('КРАШ', W / 2, H / 2 + 38); }
  cx.textAlign = 'start';
}
GAME_INIT.crash = () => drawCrash('idle');
function crashCashout() {
  if (!crash.on || crash.out) return;
  crash.out = true;
  S.st.crashBest = Math.max(S.st.crashBest, crash.m);
  gameWin(crash.bet, crash.bet * crash.m, `Забрали на ${crash.m.toFixed(2)}×`);
}
GA.addEventListener('click', e => {
  if (e.target.id !== 'crashGo') return;
  if (crash.on) return crashCashout();
  const bet = readBet('crashBet'); if (!bet) return;
  busyGame = true;
  // 3% преимущество казино: P(краш ≥ x) = 0.97 / x
  Object.assign(crash, { on: true, bet, out: false, m: 1, t0: performance.now(), pts: [], at: Math.max(1, Math.floor(97 / (100 * (1 - rnd())) * 100) / 100) });
  const auto = +$('#crashAuto').value || 0;
  const step = now => {
    const btn = $('#crashGo');
    const t = now - crash.t0; crash.m = Math.min(Math.exp(0.00011 * t), crash.at); crash.pts.push([t, crash.m]);
    if (btn) btn.textContent = crash.out ? 'Ждём краш…' : `Забрать ${fmt(crash.bet * crash.m)}`;
    if (!crash.out && auto > 1 && crash.m >= auto) { crash.m = auto; crashCashout(); }
    if (crash.m >= crash.at) {
      crash.on = false; busyGame = false; drawCrash(crash.out ? 'out' : 'crashed');
      if (!crash.out) gameLose(crash.bet);
      addHist('crashHist', `<span class="${crash.at >= 2 ? 'g' : 'b'}">${crash.at.toFixed(2)}×</span>`);
      if (btn) btn.textContent = 'Ставка';
      return;
    }
    drawCrash(crash.out ? 'out' : 'run'); requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});

// монетка
let coinRot = 0;
GA.addEventListener('click', e => {
  const b = e.target.closest('[data-side]'); if (!b || busyGame) return;
  const bet = readBet('coinBet'); if (!bet) return;
  busyGame = true;
  const res = rnd() < 0.5 ? 'ct' : 't', side = b.dataset.side;
  coinRot += 1800 + ((res === 't' ? 180 : 0) - (coinRot % 360) + 360) % 360;
  $('#coin').style.transform = `rotateY(${coinRot}deg)`;
  setTimeout(() => {
    busyGame = false;
    if (res === side) gameWin(bet, Math.round(bet * 1.96 * 100) / 100); else gameLose(bet);
    addHist('coinHist', `<span class="${res === side ? 'g' : 'b'}">${res.toUpperCase()}</span>`);
  }, 2300);
});

// рулетка: 0 — зелёное, 1–7 красное, 8–14 чёрное
const RL_ORDER = [1, 14, 2, 13, 3, 12, 4, 0, 11, 5, 10, 6, 9, 7, 8];
const rlCol = n => (n === 0 ? 'g' : n <= 7 ? 'r' : 'b');
let rlPos = null;
GAME_INIT.roulette = () => {
  const strip = $('#rlStrip');
  strip.innerHTML = Array.from({ length: 15 * 8 }, (_, k) => { const n = RL_ORDER[k % 15]; return `<div class="rl-n ${rlCol(n)}">${n}</div>`; }).join('');
  strip.style.transform = `translateX(${rlPos ?? -(15 * 84)}px)`;
};
GA.addEventListener('click', e => {
  const b = e.target.closest('[data-rl]'); if (!b || busyGame) return;
  const bet = readBet('rlBet'); if (!bet) return;
  busyGame = true;
  const n = Math.floor(rnd() * 15), strip = $('#rlStrip'), wrap = strip.parentElement;
  const tw = 84, idx = 15 * 6 + RL_ORDER.indexOf(n);
  const startIdx = 15 + RL_ORDER.indexOf(RL_ORDER[0]);
  strip.style.transition = 'none'; strip.style.transform = `translateX(${-(startIdx * tw + 3 + 39 - wrap.clientWidth / 2)}px)`;
  strip.getBoundingClientRect();
  rlPos = -(idx * tw + 3 + 39 - wrap.clientWidth / 2) + (rnd() - 0.5) * 60;
  strip.style.transition = 'transform 5s cubic-bezier(.1,.6,.1,1)'; strip.style.transform = `translateX(${rlPos}px)`;
  setTimeout(() => {
    busyGame = false;
    const c = rlCol(n);
    if (c === b.dataset.rl) gameWin(bet, bet * (c === 'g' ? 14 : 2)); else gameLose(bet);
    addHist('rlHist', `<span class="r${c}">${n}</span>`);
  }, 5100);
});

// мины
const mn = { on: false, bet: 0, mines: 3, bombs: new Set(), open: new Set() };
const mnMult = (k, m) => { let x = 0.97; for (let j = 0; j < k; j++) x *= (25 - j) / (25 - m - j); return x; };
function renderMines(reveal) {
  $('#minesGrid').innerHTML = Array.from({ length: 25 }, (_, k) => {
    const o = mn.open.has(k), b = mn.bombs.has(k);
    const cls = o ? 'safe' : reveal != null && b ? (reveal === k ? 'boom' : 'boom ghost') : reveal != null ? 'ghost' : '';
    return `<button class="cell ${cls}" data-cell="${k}" ${!mn.on || o ? 'disabled' : ''}>${o ? '💎' : reveal != null && b ? '💣' : ''}</button>`;
  }).join('');
  const k = mn.open.size;
  $('#mnInfo').innerHTML = mn.on ? `×${(k ? mnMult(k, mn.mines) : 1).toFixed(2)} · следующая ×${mnMult(k + 1, mn.mines).toFixed(2)}` : '';
  const go = $('#mnGo');
  go.textContent = mn.on ? (k ? `Забрать ${fmt(mn.bet * mnMult(k, mn.mines))}` : 'Выберите клетку') : 'Играть';
  go.disabled = mn.on && !k;
}
GAME_INIT.mines = () => renderMines();
GA.addEventListener('click', e => {
  if (e.target.id === 'mnGo') {
    if (mn.on) { mn.on = false; busyGame = false; gameWin(mn.bet, mn.bet * mnMult(mn.open.size, mn.mines)); renderMines(-1); return; }
    const bet = readBet('mnBet'); if (!bet) return;
    Object.assign(mn, { mines: +$('#mnCount').value, bet, on: true, open: new Set(), bombs: new Set() }); busyGame = true;
    while (mn.bombs.size < mn.mines) mn.bombs.add(Math.floor(rnd() * 25));
    renderMines(); return;
  }
  const c = e.target.closest('[data-cell]'); if (!c || !mn.on) return;
  const k = +c.dataset.cell;
  if (mn.bombs.has(k)) {
    mn.on = false; busyGame = false; gameLose(mn.bet); renderMines(k);
    const r = c.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, ['#ff5a5f', '#ffb347', '#555'], 50); return;
  }
  mn.open.add(k); beep('coin');
  if (mn.open.size === 25 - mn.mines) { mn.on = false; busyGame = false; gameWin(mn.bet, mn.bet * mnMult(mn.open.size, mn.mines)); renderMines(-1); return; }
  renderMines();
});

// башня: 8 этажей по 3 клетки, на каждом одна бомба
const tw = { on: false, bet: 0, floor: 0, bombs: [], picks: [] };
const twMult = f => 0.97 * 1.5 ** f;
function renderTower(over) {
  $('#towerGrid').innerHTML = Array.from({ length: 8 }, (_, f) => {
    const cur = tw.on && f === tw.floor, past = f < tw.floor;
    return `<div class="row ${cur ? 'cur' : past ? 'past' : ''}">${[0, 1, 2].map(c => {
      const picked = tw.picks[f] === c, bomb = tw.bombs[f] === c, show = (past || over) && tw.bombs.length;
      const cls = picked ? (bomb ? 'boom' : 'safe') : show && bomb ? 'boom ghost' : '';
      return `<button class="cell ${cls}" data-tw="${f}-${c}" ${cur ? '' : 'disabled'}>${picked ? (bomb ? '💣' : '💎') : show && bomb ? '💣' : `<span class="m">×${twMult(f + 1).toFixed(2)}</span>`}</button>`;
    }).join('')}</div>`;
  }).join('');
  $('#twInfo').innerHTML = tw.on ? `Этаж ${tw.floor + 1}/8` : '';
  const go = $('#twGo');
  go.textContent = tw.on ? (tw.floor ? `Забрать ${fmt(tw.bet * twMult(tw.floor))}` : 'Выберите клетку') : 'Играть';
  go.disabled = tw.on && !tw.floor;
}
GAME_INIT.tower = () => renderTower();
GA.addEventListener('click', e => {
  if (e.target.id === 'twGo') {
    if (tw.on) { tw.on = false; busyGame = false; gameWin(tw.bet, tw.bet * twMult(tw.floor)); renderTower(true); return; }
    const bet = readBet('twBet'); if (!bet) return;
    Object.assign(tw, { on: true, bet, floor: 0, picks: [], bombs: Array.from({ length: 8 }, () => Math.floor(rnd() * 3)) }); busyGame = true;
    renderTower(); return;
  }
  const c = e.target.closest('[data-tw]'); if (!c || !tw.on) return;
  const [f, col] = c.dataset.tw.split('-').map(Number); if (f !== tw.floor) return;
  tw.picks[f] = col;
  if (tw.bombs[f] === col) { tw.on = false; busyGame = false; gameLose(tw.bet); renderTower(true); return; }
  tw.floor++; beep('coin');
  if (tw.floor === 8) { tw.on = false; busyGame = false; gameWin(tw.bet, tw.bet * twMult(8)); renderTower(true); return; }
  renderTower();
});

// джекпот
let jpSel = [];
const BOT_NAMES = ['xX_AWP_Xx', 'silver_god', 'NoScopeNik', 'Ящик_Пандоры', 'eco_round', 'KnifeOnly', 'tapok1337', 'rush_b_pls', 'ДедИнсайд', 'flickmaster', 'ez4fan', 'bomb_has_been', 'clutch_or_kick', 'smoke_mid'];
const JP_COL = ['#ff9f1c', '#4b69ff', '#d32ce6', '#3ee08f', '#eb4b4b', '#8847ff'];
function renderJackpot() {
  jpSel = jpSel.filter(u => S.inv.some(x => x.u === u));
  const v = jpSel.reduce((s, u) => s + priceOf(S.inv.find(x => x.u === u)), 0);
  $('#jpVal').textContent = fmt(v);
  $('#jpGo').disabled = !jpSel.length || busyGame;
  const inv = sortedInv('price', '').filter(x => x.u !== S.eq);
  $('#jpInv').innerHTML = inv.length ? inv.slice(0, 200).map(x => itemCard(x, { cls: jpSel.includes(x.u) ? 'sel' : '', attr: `data-jp="${x.u}"` })).join('') : '<div class="empty">Инвентарь пуст</div>';
}
GAME_INIT.jackpot = renderJackpot;
function botItems(target) {
  const out = []; let left = target;
  for (let k = 0; k < 6 && left > 0.03; k++) {
    const part = k === 5 ? left : left * (0.3 + rnd() * 0.6);
    let lo = 0, hi = CATALOG.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (CATALOG[m].p < part) lo = m + 1; else hi = m; }
    const v = CATALOG[Math.max(0, lo - Math.floor(rnd() * 20))];
    if (v.p > left * 1.2 && out.length) break;
    out.push(v); left -= v.p;
  }
  return out;
}
GA.addEventListener('click', e => {
  const c = e.target.closest('[data-jp]');
  if (c && !busyGame) {
    const u = +c.dataset.jp;
    if (jpSel.includes(u)) jpSel = jpSel.filter(x => x !== u); else if (jpSel.length < 10) jpSel.push(u); else toast('Максимум 10 скинов');
    renderJackpot(); return;
  }
  if (e.target.id !== 'jpGo' || busyGame || !jpSel.length) return;
  busyGame = true; $('#jpGo').disabled = true;
  const myVal = jpSel.reduce((s, u) => s + priceOf(S.inv.find(x => x.u === u)), 0);
  const names = BOT_NAMES.slice().sort(() => rnd() - 0.5);
  const players = [{ n: 'Вы', v: myVal, me: true, c: JP_COL[0] }];
  const nb = 2 + Math.floor(rnd() * 3);
  for (let k = 0; k < nb; k++) { const items = botItems(myVal * (0.3 + rnd() * 1.6)); players.push({ n: names[k], items, v: items.reduce((s, x) => s + x.p, 0), c: JP_COL[k + 1] }); }
  const pot = players.reduce((s, p) => s + p.v, 0);
  $('#jpPlayers').innerHTML = players.map(p => `<div class="jp-p" style="--c:${p.c}"><div class="av">${esc(p.n[0].toUpperCase())}</div><div><b>${esc(p.n)}</b><small>${fmt(p.v)} · ${(p.v / pot * 100).toFixed(1)}%</small></div></div>`).join('');
  $('#jpBar').innerHTML = players.map(p => `<i style="width:${p.v / pot * 100}%;background:${p.c}"></i>`).join('');
  let r = rnd() * pot, win = players[players.length - 1];
  for (const p of players) { if (r < p.v) { win = p; break; } r -= p.v; }
  const tiles = Array.from({ length: 70 }, (_, k) => {
    if (k === 60) return win;
    let q = rnd() * pot; for (const p of players) { if (q < p.v) return p; q -= p.v; } return players[0];
  });
  const strip = $('#jpStrip'), wrap = strip.parentElement;
  strip.style.transition = 'none'; strip.style.transform = 'translateX(0)';
  strip.innerHTML = tiles.map(p => `<div class="av" style="--c:${p.c}">${esc(p.n[0].toUpperCase())}</div>`).join('');
  strip.getBoundingClientRect();
  strip.style.transition = 'transform 6s cubic-bezier(.1,.6,.1,1)';
  strip.style.transform = `translateX(${-(60 * 70 + 3 + 32 - wrap.clientWidth / 2) + (rnd() - 0.5) * 50}px)`;
  setTimeout(() => {
    busyGame = false;
    if (win.me) {
      players.filter(p => !p.me).forEach(p => p.items.forEach(v => S.inv.push(newItem(v.i, origin.get(v.i), { w: v.w, st: v.st, plain: true }))));
      S.st.gameWins++; S.st.jackpots++; ev('game'); S.st.gambleNet += pot - myVal;
      toast('Вы выиграли джекпот!', fmt(pot), 'gold'); beep('rare');
      FX.burst(innerWidth / 2, innerHeight / 2, ['#ffd45c', '#ff9f1c', '#fff', '#3ee08f'], 180, 13);
    } else {
      removeUids(new Set(jpSel)); S.st.gambleNet -= myVal; beep('err');
      toast(`Победил ${win.n}`, `Ваш шанс был ${(myVal / pot * 100).toFixed(1)}%`, 'bad');
    }
    jpSel = []; save(); renderTop(); renderNav(); if ($('#jpInv')) renderJackpot(); checkAch();
  }, 6200);
});

// ---------- достижения ----------
const ACH = [
  ['c1', '📦', 'Первый кейс', 'Откройте 1 контейнер', () => S.st.opened >= 1, 1],
  ['c10', '📦', 'Коллекционер', 'Откройте 10 контейнеров', () => S.st.opened >= 10, 5],
  ['c100', '🗃️', 'Кейсоман', 'Откройте 100 контейнеров', () => S.st.opened >= 100, 50],
  ['c1000', '🏭', 'Склад Valve', 'Откройте 1000 контейнеров', () => S.st.opened >= 1000, 500],
  ['k1', '🔪', 'Ножевой бой', 'Нож или перчатки', () => S.st.knives >= 1, 100],
  ['k5', '⚔️', 'Арсенал', '5 ножей или перчаток', () => S.st.knives >= 5, 500],
  ['st', '🔢', 'Счётчик убийств', 'Выбейте StatTrak™', () => S.st.stDrops >= 1, 5],
  ['fl', '💎', 'Почти идеал', 'Float меньше 0.01', () => S.st.lowFloat < 0.01, 25],
  ['stk', '🏷️', 'Наклейщик', '10 наклеек', () => S.st.stickers >= 10, 10],
  ['sv', '🏆', 'Мейджорный', 'Получите сувенирный скин', () => S.st.souvenirs >= 1, 10],
  ['cl1k', '🖱️', 'Разминка', '1 000 кликов', () => S.st.clicks >= 1000, 5],
  ['cl10k', '🖱️', 'Аимбот', '10 000 кликов', () => S.st.clicks >= 10000, 50],
  ['cmb', '🔥', 'В ударе', 'Комбо ×3', () => S.st.maxCombo >= 3, 20],
  ['m1k', '💵', 'Тысячник', 'Баланс $1 000', () => S.money >= 1000, 50],
  ['m10k', '💰', 'Богач', 'Баланс $10 000', () => S.money >= 10000, 300],
  ['m100k', '🏦', 'Инвестор в скины', 'Баланс $100 000', () => S.money >= 100000, 2000],
  ['ms5', '🎯', 'Исполнитель', '5 миссий', () => S.st.missions >= 5, 10],
  ['ms50', '🎖️', 'Ветеран', '50 миссий', () => S.st.missions >= 50, 200],
  ['tu', '📝', 'Подписано', 'Контракт обмена', () => S.st.tradeups >= 1, 5],
  ['tu25', '📑', 'Бухгалтер', '25 контрактов', () => S.st.tradeups >= 25, 50],
  ['up', '⬆️', 'Апгрейд', 'Успешный апгрейд', () => S.st.upWins >= 1, 10],
  ['cr10', '🚀', 'Ракета', 'Краш на 10×', () => S.st.crashBest >= 10, 50],
  ['jp', '💰', 'Джекпот!', 'Выиграйте джекпот', () => S.st.jackpots >= 1, 50],
  ['bt1', '⚔️', 'Гладиатор', 'Выиграйте батл кейсов', () => S.st.battleWins >= 1, 25],
  ['bt10', '🛡️', 'Чемпион арены', '10 побед в батлах', () => S.st.battleWins >= 10, 250],
  ['or1', '📋', 'Под заказ', 'Выполните заказ коллекционера', () => S.st.orders >= 1, 10],
  ['or25', '🤝', 'Поставщик', '25 заказов коллекционеров', () => S.st.orders >= 25, 150],
  ['al1', '📗', 'Альбом', 'Соберите все предметы контейнера', () => albumCount() >= 1, 20],
  ['al10', '📚', 'Библиотекарь', '10 собранных коллекций', () => albumCount() >= 10, 400],
  ['bn25', '🎁', 'Охотник за тайниками', 'Поймайте 25 бонус-дропов', () => S.st.bonuses >= 25, 40],
  ['unl', '🔓', 'Всё открыто', 'Все разблокировки', () => UNLOCKS.every(u => S.unl[u[0]]), 500],
  ['l40', '⭐', 'Служба', 'Уровень 40', () => S.lvl >= LVL_MAX || S.medals > 0, 200],
  ['ge', '🌐', 'Global Elite', 'Высшее звание', () => rankOf() === RANKS.length - 1, 1000],
];
function checkAch() {
  for (const [id, , n, , ok, rew] of ACH) {
    if (!S.ach[id] && ok()) { S.ach[id] = Date.now(); addMoney(rew); toast('🏅 ' + n, '+' + fmt(rew), 'gold'); beep('rare'); }
  }
}

// ---------- профиль ----------
function renderProfile() {
  const st = S.st, invVal = S.inv.reduce((s, x) => s + priceOf(x), 0), r = rankOf();
  $('#profHead').innerHTML = `<div class="big-emb">${rankSVG(r, true)}</div>
    <div><h2>${RANKS[r][0]}</h2><div class="muted">Очки звания: ${S.rp}${r < RANKS.length - 1 ? ` / ${rankNeed(r + 1)} до ${RANKS[r + 1][0]}` : ''} · доход +${r * 5}%</div>
    <div class="muted">Приватный ранг: <b style="color:var(--text)">уровень ${S.lvl}</b> · опыт ${Math.floor(S.xp)} / ${lvlNeed(S.lvl)}</div>
    <div class="medals">${Array.from({ length: S.medals }, (_, k) => `<span class="medal" style="color:${MEDAL_COL[Math.min(k, 6)]};background:${MEDAL_COL[Math.min(k, 6)]}33">★</span>`).join('')}</div></div>
    <div>${S.lvl >= LVL_MAX ? `<button class="btn primary" id="prestige">Медаль за службу (+10% дохода)</button>` : `<span class="muted small">Звания — за миссии.<br>На 40 уровне — медаль за службу.</span>`}</div>`;
  const best = st.best ? KEYMAP.get(st.best.k) : null;
  const rows = [
    ['Кликов', st.clicks.toLocaleString('ru')], ['Заработано кликами', fmt(st.clickEarn)], ['Макс. комбо', '×' + st.maxCombo.toFixed(2)],
    ['Открыто', st.opened], ['Потрачено', fmt(st.spent)], ['Стоимость дропа', fmt(st.dropValue)],
    ['Окупаемость', st.spent ? Math.round(st.dropValue / st.spent * 100) + '%' : '—'], ['Ножей и перчаток', st.knives], ['StatTrak™', st.stDrops],
    ['Наклеек', st.stickers], ['Сувениров', st.souvenirs], ['Продано на', fmt(st.sold)], ['Миссий', st.missions], ['Контрактов', st.tradeups],
    ['Апгрейдов', `${st.upWins} / ${st.upWins + st.upLoss}`], ['Батлов', `${st.battleWins} / ${st.battles}`], ['Бонус-дропов', st.bonuses], ['Заказов', st.orders], ['Бесплатных кейсов', st.freeOpened],
    ['Альбом', `${albumCount()} колл. · +${albumCount()}% дохода`], ['Найдено предметов', `${Object.keys(S.found).length} / ${ITEMS.length}`], ['Казино', (st.gambleNet >= 0 ? '+' : '') + fmt(st.gambleNet)],
    ['Лучший краш', st.crashBest ? st.crashBest.toFixed(2) + '×' : '—'], ['Мин. float', st.lowFloat < 1 ? st.lowFloat.toFixed(6) : '—'],
    ['Инвентарь', `${S.inv.length} · ${fmt(invVal)}`], ['Лучший дроп', best != null ? `${fullName(best, st.best.st)} · ${fmt(st.best.p)}` : '—'],
  ];
  $('#stats').innerHTML = rows.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${esc(v)}</b></div>`).join('');
  $('#achCount').textContent = `${Object.keys(S.ach).length}/${ACH.length}`;
  $('#achs').innerHTML = ACH.map(([id, ic, n, d, , rew]) => `<div class="ach ${S.ach[id] ? 'done' : ''}"><i>${ic}</i><div><b>${n}</b><small>${d} · ${fmt(rew)}</small></div></div>`).join('');
  $('#soundOn').checked = S.set.sound; $('#fxOn').checked = S.set.fx;
  $('#dataInfo').textContent = `Цены Steam Market на ${D.built} (prices.csgotrader.app), состав — ByMykel/CSGO-API. ${BOXES.length} контейнеров, ${ITEMS.length} предметов. Фанатский проект, не связан с Valve.`;
}
RENDER.profile = renderProfile;
$('#profHead').addEventListener('click', e => {
  if (e.target.id !== 'prestige' || S.lvl < LVL_MAX) return;
  S.medals++; S.lvl = 1; S.xp = 0; beep('rare');
  FX.burst(innerWidth / 2, innerHeight / 3, MEDAL_COL, 200, 13);
  toast('Медаль за службу!', `Доход +${S.medals * 10}% навсегда`, 'gold'); save(); renderTop(); renderProfile();
});
$('#soundOn').addEventListener('change', e => { S.set.sound = e.target.checked; save(); });
$('#fxOn').addEventListener('change', e => { S.set.fx = e.target.checked; save(); });
$('#exportSave').addEventListener('click', () => {
  save();
  const code = btoa(unescape(encodeURIComponent(localStorage.getItem(SAVE_KEY) || '')));
  modal(`<h2>Код сохранения<button class="btn ghost" data-close>✕</button></h2><textarea id="saveCode" readonly style="width:100%;height:160px">${code}</textarea>
    <div class="modal-actions"><button class="btn primary" id="copyCode">Скопировать</button></div>`, box => {
    $('#copyCode', box).onclick = () => { $('#saveCode', box).select(); navigator.clipboard?.writeText(code).then(() => toast('Скопировано'), () => document.execCommand('copy')); };
  });
});
$('#importSave').addEventListener('click', () => {
  modal(`<h2>Загрузить сохранение<button class="btn ghost" data-close>✕</button></h2><textarea id="loadCode" style="width:100%;height:160px" placeholder="Вставьте код"></textarea>
    <div class="modal-actions"><button class="btn primary" id="loadGo">Загрузить</button></div>`, box => {
    $('#loadGo', box).onclick = () => {
      try {
        const o = JSON.parse(decodeURIComponent(escape(atob($('#loadCode', box).value.trim()))));
        if (typeof o.money !== 'number' || !Array.isArray(o.inv)) throw 0;
        localStorage.setItem(SAVE_KEY, JSON.stringify(o)); replacingSave = true; location.reload();
      } catch { toast('Неверный код', '', 'bad'); }
    };
  });
});
$('#resetSave').addEventListener('click', () => {
  modal(`<h2>Начать заново?</h2><p class="muted">Весь прогресс и инвентарь будут удалены.</p><div class="modal-actions"><button class="btn danger" id="resetGo">Удалить прогресс</button><button class="btn" data-close>Отмена</button></div>`, box => {
    $('#resetGo', box).onclick = () => { S = fresh(); save(); location.reload(); };
  });
});

// ---------- цикл ----------
(function offline() {
  const away = Date.now() - (S.last || Date.now());
  const income = perSec() * Math.min(away, (S.up.offline + 1) * 3600e3) / 1000 * 0.5;
  if (away > 60e3 && income >= 0.01) { addMoney(income); setTimeout(() => toast('Пока вас не было', `Автокликер заработал ${fmt(income)}`, 'good'), 600); }
})();
let lastT = performance.now(), saveAcc = 0, uiAcc = 0;
setInterval(() => {
  const now = performance.now(), dt = (now - lastT) / 1000; lastT = now;
  const ps = perSec(); if (ps) addMoney(ps * dt);
  if (combo > 1 && now - lastClick > 650) { combo = Math.max(1, combo - dt * 0.6); if (curTab === 'clicker') renderCombo(); }
  tickMoney(); tickBonus(now);
  saveAcc += dt; uiAcc += dt;
  if (uiAcc > 1) {
    uiAcc = 0; checkAch();
    if (tickOrders()) { renderNav(); if (curTab === 'orders') renderOrders(); }
    else $$('[data-left]').forEach(el => { el.textContent = fmtDur(Math.max(0, +el.dataset.left - Date.now()) / 1000); });
    if (curTab === 'clicker') { $('#perSec').textContent = fmt(perSec()); $('#perClick').textContent = fmt(perClick()); $('#quickUpg').innerHTML = Object.keys(UPG).filter(k => UPG[k].quick).map(upgRow).join(''); }
    if (curTab === 'shop') renderShop();
  }
  if (saveAcc > 5) { saveAcc = 0; save(); }
}, 100);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('beforeunload', save);

renderNav(); renderTop(); renderClicker(); checkAch();

if (S.set.seen !== VERSION) {
  if (S.st.opened || S.st.clicks) setTimeout(() => modal(`<h2>Обновление<button class="btn ghost" data-close>✕</button></h2>
    <ul class="news">
      <li><b>⚖️ Новый баланс.</b> Автокликер дорожает быстрее, чем растёт доход: каждый уровень окупается дольше (время окупаемости видно в улучшении). Продажа предметов — с комиссией 10%, как на торговой площадке.</li>
      <li><b>🛒 Маркет закрыт.</b> Любой скин теперь нужно выбить, скрафтить контрактом или поднять апгрейдом. Если маркет был куплен, $30 вернулись на баланс.</li>
      <li><b>📋 Заказы коллекционеров.</b> Новая вкладка: три заказа на конкретные предметы из доступных кейсов. Платят больше рынка и дают очко звания.</li>
      <li><b>🎁 Бесплатные кейсы.</b> За каждый новый уровень и иногда в бонус-дропе кликера — бесплатное открытие авторского кейса.</li>
    </ul><div class="modal-actions"><button class="btn primary" data-close>Играть</button></div>`), 900);
  S.set.seen = VERSION; save();
}

// Shareable catalogue link preserves the same origin and browser save.
if (new URLSearchParams(location.search).get('cases') === 'custom') {
  S.set.kind = 'custom';
  showTab('cases');
}
