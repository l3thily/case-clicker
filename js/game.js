'use strict';
/* Case Clicker — кликер с настоящими кейсами CS2. Данные: data/cases.js (tools/build_data.py) */
const D = window.GAME_DATA;
const CDN = D.cdn;
const KEY = D.key;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd = Math.random;

// ---------- справочники ----------
const GRADE = [
  { n: 'Армейское качество', c: 'var(--r0)', p: 79.92 },
  { n: 'Запрещённое', c: 'var(--r1)', p: 15.98 },
  { n: 'Засекреченное', c: 'var(--r2)', p: 3.2 },
  { n: 'Тайное', c: 'var(--r3)', p: 0.64 },
  { n: '★ Редкий особый предмет', c: 'var(--r4)', p: 0.26 },
];
const WEAR = [
  { n: 'Прямо с завода', s: 'FN', a: 0, b: 0.07 },
  { n: 'Немного поношенное', s: 'MW', a: 0.07, b: 0.15 },
  { n: 'После полевых испытаний', s: 'FT', a: 0.15, b: 0.38 },
  { n: 'Поношенное', s: 'WW', a: 0.38, b: 0.45 },
  { n: 'Закалённое в боях', s: 'BS', a: 0.45, b: 1 },
];
const RANKS = [
  ['Silver I', 'S1', '#9aa4b1'], ['Silver II', 'S2', '#9aa4b1'], ['Silver III', 'S3', '#9aa4b1'], ['Silver IV', 'S4', '#9aa4b1'],
  ['Silver Elite', 'SE', '#b6c0cc'], ['Silver Elite Master', 'SEM', '#c9d2dc'],
  ['Gold Nova I', 'GN1', '#e2b04a'], ['Gold Nova II', 'GN2', '#e2b04a'], ['Gold Nova III', 'GN3', '#e2b04a'], ['Gold Nova Master', 'GNM', '#f0c35e'],
  ['Master Guardian I', 'MG1', '#5f9cdf'], ['Master Guardian II', 'MG2', '#5f9cdf'], ['Master Guardian Elite', 'MGE', '#79b2ef'],
  ['Distinguished Master Guardian', 'DMG', '#8fc3ff'], ['Legendary Eagle', 'LE', '#c58cff'], ['Legendary Eagle Master', 'LEM', '#d6a3ff'],
  ['Supreme Master First Class', 'SMFC', '#ff7b7b'], ['The Global Elite', 'GE', '#ffd45c'],
];
const xpNeed = r => Math.round(80 * r * r + 120 * r); // суммарный опыт для звания r

const UPG = {
  click: { n: 'Сила клика', d: l => `+${fmt(clickBase(l + 1) - clickBase(l))} за клик`, cost: l => 1 * 1.17 ** l, max: 200 },
  auto: { n: 'Автокликер', d: l => `+${fmt(autoBase(l + 1) - autoBase(l))}/сек`, cost: l => 4 * 1.19 ** l, max: 200 },
  crit: { n: 'Хедшот', d: l => `Шанс ×10 клика: ${l * 2}% → ${(l + 1) * 2}%`, cost: l => 15 * 1.55 ** l, max: 25 },
  offline: { n: 'Оффлайн-доход', d: l => `Копится до ${l + 1} → ${l + 2} ч, пока вас нет`, cost: l => 25 * 2.1 ** l, max: 11 },
};
const clickBase = l => 0.05 + l * 0.05 * (1 + Math.floor(l / 25));
const autoBase = l => l * 0.03 * (1 + Math.floor(l / 25));

// ---------- предрасчёты ----------
const ITEMS = D.items;
const CASES = D.cases;
const itemCase = new Map(); // предмет → первый кейс, где он есть
CASES.forEach((c, ci) => c.g.forEach(g => g.forEach(i => { if (!itemCase.has(i)) itemCase.set(i, ci); })));

const img = (h, size = '256fx192f') => `${CDN}${h}/${size}`;
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
  if (st) return nearest(it.st, w) ?? +(nearest(it.p, w) * 1.4).toFixed(2);
  return nearest(it.p, w) ?? 0.03;
}
const priceOf = x => variantPrice(x.i, wearIdx(x.fl), x.st);
function displayName(i, st) {
  const it = ITEMS[i];
  let n = it.n;
  if (st) n = n.startsWith('★ ') ? '★ StatTrak™ ' + n.slice(2) : 'StatTrak™ ' + n;
  return n;
}
const splitName = n => { const k = n.indexOf(' | '); return k < 0 ? [n, ''] : [n.slice(0, k), n.slice(k + 3)]; };

// ожидаемая стоимость дропа из кейса (равномерный float, 10% StatTrak)
function itemEV(i) {
  const it = ITEMS[i];
  const [a, b] = it.f, span = Math.max(b - a, 1e-6);
  let ev = 0;
  WEAR.forEach((w, k) => {
    const ov = Math.max(0, Math.min(b, w.b) - Math.max(a, w.a));
    if (!ov) return;
    const share = ov / span;
    const stp = it.st ? 0.1 : 0;
    ev += share * ((1 - stp) * variantPrice(i, k, false) + stp * variantPrice(i, k, true));
  });
  return ev;
}
CASES.forEach(c => {
  c.ev = c.g.reduce((s, g, k) => s + GRADE[k].p / 100 * g.reduce((t, i) => t + itemEV(i), 0) / g.length, 0);
});

// каталог вариантов для маркета и апгрейда
const CATALOG = [];
ITEMS.forEach((it, i) => {
  const [a, b] = it.f;
  const wears = it.v ? [0] : WEAR.map((w, k) => k).filter(k => Math.min(b, WEAR[k].b) > Math.max(a, WEAR[k].a));
  for (const w of wears) {
    if (it.p[w] != null) CATALOG.push({ i, w, st: false, p: it.p[w] });
    if (it.st && it.st[w] != null) CATALOG.push({ i, w, st: true, p: it.st[w] });
  }
});
CATALOG.sort((x, y) => x.p - y.p);

// ---------- состояние ----------
const SAVE_KEY = 'caseclicker.v1';
const fresh = () => ({
  v: 1, money: 0.5, xp: 0, uid: 1, inv: [],
  up: { click: 0, auto: 0, crit: 0, offline: 0 },
  st: { clicks: 0, crits: 0, clickEarn: 0, opened: 0, spent: 0, dropValue: 0, sold: 0, knives: 0, stDrops: 0, tradeups: 0, upWins: 0, upLoss: 0, crashBest: 0, gambleNet: 0, bought: 0, best: null, lowFloat: 1 },
  ach: {}, daily: { last: '', streak: 0 }, last: Date.now(),
  set: { fast: false, sound: true },
});
let S;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  S = raw ? Object.assign(fresh(), JSON.parse(raw)) : fresh();
  S.st = Object.assign(fresh().st, S.st); S.up = Object.assign(fresh().up, S.up); S.set = Object.assign(fresh().set, S.set);
} catch { S = fresh(); }
S.inv = S.inv.filter(x => ITEMS[x.i]);
function save() { S.last = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }

const rankOf = () => { let r = 0; while (r < RANKS.length - 1 && S.xp >= xpNeed(r + 1)) r++; return r; };
const rankMult = () => 1 + 0.05 * rankOf();
const perClick = () => clickBase(S.up.click) * rankMult();
const perSec = () => autoBase(S.up.auto) * rankMult();

// ---------- утилиты UI ----------
function fmt(n) {
  const v = Math.abs(n) >= 100 ? n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : n.toFixed(2);
  return '$' + v;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function addMoney(x) { S.money = Math.round((S.money + x) * 1e4) / 1e4; }
function canPay(x) { return S.money + 1e-9 >= x; }
function pay(x) { if (!canPay(x)) { toast('Недостаточно денег', `Нужно ${fmt(x)}`); beep('err'); return false; } addMoney(-x); return true; }
function addXP(x) {
  const before = rankOf(); S.xp += x; const after = rankOf();
  if (after > before) { toast('Новое звание!', RANKS[after][0] + ` · доход +${after * 5}%`); beep('rare'); }
}
function toast(title, text = '') {
  const el = document.createElement('div');
  el.className = 'toast'; el.innerHTML = `<b>${esc(title)}</b>${esc(text)}`;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 3500);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
}
function modal(html, onBind) {
  $('#modalBox').innerHTML = html; $('#modal').hidden = false;
  onBind && onBind($('#modalBox'));
}
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
    const cfg = { tick: [1400, 0.03, 0.05, 'square'], click: [520, 0.05, 0.06, 'triangle'], win: [880, 0.25, 0.12, 'triangle'], rare: [1320, 0.6, 0.15, 'sine'], err: [180, 0.15, 0.08, 'sawtooth'], coin: [700, 0.1, 0.08, 'triangle'] }[kind];
    o.type = cfg[3]; o.frequency.setValueAtTime(cfg[0], t);
    if (kind === 'win' || kind === 'rare') o.frequency.exponentialRampToValueAtTime(cfg[0] * 1.5, t + cfg[1]);
    g.gain.setValueAtTime(cfg[2], t); g.gain.exponentialRampToValueAtTime(0.0001, t + cfg[1]);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + cfg[1]);
  } catch {}
}

// карточка предмета
function itemCard(x, opts = {}) {
  const it = ITEMS[x.i];
  const w = x.fl != null ? wearIdx(x.fl) : x.w;
  const [wp, sk] = splitName(it.n);
  const price = opts.price ?? (x.fl != null ? priceOf(x) : variantPrice(x.i, w, x.st));
  const wear = it.v || w == null ? '' : WEAR[w].s;
  return `<div class="item ${opts.cls || ''}" style="--c:${GRADE[it.r].c}" ${opts.attr || ''}>
    <span class="w">${wear}</span>${x.st ? '<span class="stt">ST™</span>' : ''}
    <img loading="lazy" src="${img(it.img)}" alt="">
    <div class="nm">${esc(sk || wp)}${it.ph ? ' · ' + esc(it.ph) : ''}<em>${esc(wp)}</em></div>
    ${opts.extra || ''}<div class="pr">${fmt(price)}</div></div>`;
}

// ---------- вкладки ----------
let curTab = 'clicker';
function showTab(t) {
  curTab = t;
  $$('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + t));
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t || (t === 'open' && b.dataset.tab === 'cases')));
  ({ clicker: renderUpgrades, cases: renderCases, inventory: renderInv, tradeup: renderTU, upgrade: renderUp, market: renderMarket, profile: renderProfile, games: () => {} , open: () => {} })[t]();
  window.scrollTo({ top: 0 });
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });

// ---------- шапка ----------
function renderTop() {
  $('#money').textContent = fmt(S.money);
  const r = rankOf(), a = xpNeed(r), b = xpNeed(r + 1);
  const ri = $('#rankImg'); ri.textContent = RANKS[r][1]; ri.style.color = RANKS[r][2]; ri.style.borderColor = RANKS[r][2];
  $('#rankName').textContent = RANKS[r][0];
  $('#xpFill').style.width = r === RANKS.length - 1 ? '100%' : ((S.xp - a) / (b - a) * 100).toFixed(1) + '%';
  $('#rank').title = `${RANKS[r][0]} · опыт ${Math.floor(S.xp)} / ${r === RANKS.length - 1 ? '—' : b} · бонус дохода +${r * 5}%`;
  $('#invCount').textContent = S.inv.length;
}
$('#rank').addEventListener('click', () => showTab('profile'));

// ---------- кликер ----------
$('#clickBtn').addEventListener('pointerdown', e => {
  e.preventDefault();
  let v = perClick(); const crit = rnd() < S.up.crit * 0.02;
  if (crit) { v *= 10; S.st.crits++; }
  addMoney(v); S.st.clicks++; S.st.clickEarn += v; addXP(0.2);
  beep(crit ? 'win' : 'click');
  const zone = $('.click-zone'), r = zone.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'floater' + (crit ? ' crit' : '');
  f.textContent = (crit ? 'HS! +' : '+') + fmt(v);
  f.style.left = (e.clientX - r.left - 20 + (rnd() * 30 - 15)) + 'px'; f.style.top = (e.clientY - r.top - 30) + 'px';
  zone.append(f); setTimeout(() => f.remove(), 900);
  renderTop(); checkAch();
});
function renderUpgrades() {
  $('#perClick').textContent = fmt(perClick());
  $('#perSec').textContent = fmt(perSec());
  $('#upgrades').innerHTML = Object.entries(UPG).map(([k, u]) => {
    const l = S.up[k], max = l >= u.max, c = u.cost(l);
    return `<div class="upg"><b>${u.n}<span class="lvl">ур. ${l}</span></b>
      <button class="btn ${canPay(c) && !max ? 'primary' : ''}" data-up="${k}" ${max ? 'disabled' : ''}>${max ? 'Макс.' : fmt(c)}</button>
      <small>${max ? 'Максимальный уровень' : u.d(l)}</small></div>`;
  }).join('');
  renderDaily();
}
$('#upgrades').addEventListener('click', e => {
  const b = e.target.closest('[data-up]'); if (!b) return;
  const k = b.dataset.up, u = UPG[k];
  if (S.up[k] >= u.max || !pay(u.cost(S.up[k]))) return;
  S.up[k]++; beep('coin'); renderUpgrades(); renderTop(); save();
});
const today = () => new Date().toISOString().slice(0, 10);
const dailyReward = () => Math.round((1 + Math.min(S.daily.streak, 6) * 0.75) * rankMult() * 100) / 100;
function renderDaily() {
  const done = S.daily.last === today();
  $('#daily').innerHTML = done
    ? `<span class="muted">Ежедневная награда получена · серия ${S.daily.streak} дн.</span>`
    : `<button class="btn primary" id="dailyBtn">Ежедневная награда ${fmt(dailyReward())}</button>`;
}
$('#daily').addEventListener('click', e => {
  if (e.target.id !== 'dailyBtn') return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  S.daily.streak = S.daily.last === y ? S.daily.streak + 1 : 0;
  const r = dailyReward(); addMoney(r); S.daily.last = today(); S.daily.streak = Math.max(S.daily.streak, 1);
  toast('Ежедневная награда', '+' + fmt(r)); beep('win'); renderDaily(); renderTop(); save();
});

// ---------- кейсы ----------
function renderCases() {
  $('#keyPrice').textContent = fmt(KEY);
  const q = $('#caseSearch').value.trim().toLowerCase(), sort = $('#caseSort').value;
  let list = CASES.map((c, i) => ({ c, i })).filter(x => x.c.n.toLowerCase().includes(q));
  if (sort === 'cheap') list.sort((a, b) => a.c.p - b.c.p);
  if (sort === 'exp') list.sort((a, b) => b.c.p - a.c.p);
  $('#caseGrid').innerHTML = list.map(({ c, i }) => {
    const cost = c.p + KEY;
    return `<div class="case-card ${canPay(cost) ? '' : 'locked'}" data-case="${i}">
      <span class="yr">${c.date.slice(0, 4)}</span>
      <img loading="lazy" src="${img(c.img)}" alt="">
      <div class="nm">${esc(c.n)}</div>
      <div class="pr">${fmt(cost)}</div></div>`;
  }).join('') || '<div class="empty">Ничего не найдено</div>';
}
$('#caseSearch').addEventListener('input', renderCases);
$('#caseSort').addEventListener('change', renderCases);
$('#caseGrid').addEventListener('click', e => { const c = e.target.closest('[data-case]'); if (c) openCasePage(+c.dataset.case); });

let curCase = 0, qty = 1, rolling = false;
function openCasePage(ci) {
  curCase = ci; const c = CASES[ci];
  $('#openTitle').textContent = c.n;
  $('#rollArea').innerHTML = `<div class="case-hero"><img src="${img(c.img, '360fx270f')}" alt=""></div>`;
  $('#fastOpen').checked = S.set.fast;
  renderQty();
  const rows = [];
  for (let g = 4; g >= 0; g--) {
    const share = GRADE[g].p / c.g[g].length;
    c.g[g].forEach(i => {
      const it = ITEMS[i], ps = it.p.filter(v => v != null);
      const lo = Math.min(...ps), hi = Math.max(...ps);
      rows.push(itemCard({ i }, { price: lo, extra: `<div class="chance">${share < 0.1 ? share.toFixed(3) : share.toFixed(2)}% · до ${fmt(Math.max(hi, ...(it.st || []).filter(v => v != null)))}</div>` }));
    });
  }
  $('#caseContents').innerHTML = rows.join('');
  c.g.slice(0, 4).flat().forEach(i => { new Image().src = img(ITEMS[i].img, '128fx96f'); }); // предзагрузка для рулетки
  showTab('open');
}
function renderQty() {
  const c = CASES[curCase];
  $('#qty').innerHTML = [1, 2, 3, 4, 5].map(n => `<button class="${n === qty ? 'on' : ''}" data-q="${n}">${n}</button>`).join('');
  const cost = (c.p + KEY) * qty;
  const b = $('#openBtn');
  b.textContent = `Открыть ${qty > 1 ? qty + ' шт. ' : ''}за ${fmt(cost)}`;
  b.disabled = rolling;
  b.title = `Кейс ${fmt(c.p)} + ключ ${fmt(KEY)}. Средняя стоимость дропа ${fmt(c.ev)} (${Math.round(c.ev / (c.p + KEY) * 100)}% окупаемость)`;
}
$('#qty').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b && !rolling) { qty = +b.dataset.q; renderQty(); } });
$('#backToCases').addEventListener('click', () => showTab('cases'));
$('#fastOpen').addEventListener('change', e => { S.set.fast = e.target.checked; save(); });

function rollGrade() {
  let r = rnd() * 100;
  for (let g = 0; g < 4; g++) { if (r < GRADE[g].p) return g; r -= GRADE[g].p; }
  return 4;
}
function newItem(i, c, opts = {}) {
  const it = ITEMS[i];
  let [a, b] = it.f;
  if (opts.w != null && !it.v) { a = Math.max(a, WEAR[opts.w].a); b = Math.min(b, WEAR[opts.w].b); }
  const fl = opts.fl ?? (a + rnd() * (b - a));
  const st = opts.st ?? (!!it.st && rnd() < 0.1);
  return { u: S.uid++, i, c, fl: Math.min(0.999999, +fl.toFixed(6)), st, s: Math.floor(rnd() * 1000), t: Date.now() };
}
function trackDrop(x) {
  const it = ITEMS[x.i], p = priceOf(x);
  S.st.dropValue += p;
  if (it.r === 4) S.st.knives++;
  if (x.st) S.st.stDrops++;
  if (!it.v && x.fl < S.st.lowFloat) S.st.lowFloat = x.fl;
  if (!S.st.best || p > S.st.best.p) S.st.best = { i: x.i, st: x.st, fl: x.fl, p };
}
function rollCase(ci) {
  const c = CASES[ci], g = rollGrade(), list = c.g[g];
  return newItem(list[Math.floor(rnd() * list.length)], ci);
}
function tileHTML(i) {
  const it = ITEMS[i];
  if (it.r === 4) return `<div class="tile rare" style="--c:var(--r4)"><div class="gold">★</div><span>Редкий особый предмет</span></div>`;
  return `<div class="tile" style="--c:${GRADE[it.r].c}"><img src="${img(it.img, '128fx96f')}" alt=""><span>${esc(splitName(it.n)[1] || it.n)}</span></div>`;
}
$('#openBtn').addEventListener('click', () => {
  if (rolling) return;
  const c = CASES[curCase], cost = (c.p + KEY) * qty;
  if (!pay(cost)) return;
  rolling = true; renderQty();
  S.st.opened += qty; S.st.spent += cost;
  const drops = [];
  for (let k = 0; k < qty; k++) { const x = rollCase(curCase); drops.push(x); S.inv.push(x); trackDrop(x); }
  addXP(25 * qty); save(); renderTop();

  const N = 56, WIN = 48, fast = S.set.fast;
  const area = $('#rollArea');
  area.innerHTML = drops.map(() => `<div class="roll ${qty > 1 ? 'compact' : ''}"><div class="strip"></div></div>`).join('');
  const rolls = $$('.roll', area);
  const dur = fast ? 900 : 6200;
  rolls.forEach((r, k) => {
    const tiles = [];
    for (let t = 0; t < N; t++) tiles.push(t === WIN ? drops[k].i : (() => { const l = c.g[rollGrade()]; return l[Math.floor(rnd() * l.length)]; })());
    const strip = $('.strip', r);
    strip.innerHTML = tiles.map(tileHTML).join('');
    const tw = strip.firstElementChild.getBoundingClientRect().width;
    const target = -(WIN * tw + tw / 2 - r.clientWidth / 2) + (rnd() - 0.5) * tw * 0.8;
    strip.style.transform = 'translateX(0)';
    strip.getBoundingClientRect();
    strip.style.transition = `transform ${dur + k * 180}ms cubic-bezier(.08,.6,.12,1)`;
    strip.style.transform = `translateX(${target}px)`;
    if (k === 0 && !fast) {
      let lastIdx = -1;
      const tick = () => {
        const m = new DOMMatrix(getComputedStyle(strip).transform).m41;
        const idx = Math.floor((-m + r.clientWidth / 2) / tw);
        if (idx !== lastIdx) { lastIdx = idx; beep('tick'); }
        if (rolling) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  });
  setTimeout(() => { rolling = false; renderQty(); showDrops(drops); checkAch(); }, dur + (qty - 1) * 180 + 250);
});

function dropDetails(x) {
  const it = ITEMS[x.i], [wp, sk] = splitName(displayName(x.i, x.st));
  return `<div class="drop" style="--c:${GRADE[it.r].c}">
    <img src="${img(it.img, '512fx384f')}" alt="">
    <div class="nm" style="color:${GRADE[it.r].c}">${esc(wp)}${sk ? ' | ' + esc(sk) : ''}${it.ph ? ' (' + esc(it.ph) + ')' : ''}</div>
    <div class="meta">${GRADE[it.r].n} · ${it.v ? 'Ванильный' : WEAR[wearIdx(x.fl)].n}</div>
    ${it.v ? '' : `<div class="float-bar"><i style="left:${x.fl * 100}%"></i></div><div class="meta">Float ${x.fl.toFixed(6)} · паттерн ${x.s}</div>`}
    <div class="meta">Из: ${esc(CASES[x.c]?.n || '—')}</div>
    <div class="pr">${fmt(priceOf(x))}</div></div>`;
}
function showDrops(drops) {
  const total = drops.reduce((s, x) => s + priceOf(x), 0);
  const top = Math.max(...drops.map(x => ITEMS[x.i].r));
  beep(top >= 3 ? 'rare' : 'win');
  if (top === 4) toast('★ Редкий особый предмет!', displayName(drops.find(x => ITEMS[x.i].r === 4).i));
  const body = drops.length === 1 ? dropDetails(drops[0])
    : `<div class="item-grid small">${drops.map(x => itemCard(x)).join('')}</div><p class="muted" style="text-align:center">Итого: <b style="color:var(--good)">${fmt(total)}</b></p>`;
  modal(`<h2>${drops.length === 1 ? 'Вам выпало' : 'Ваш дроп'}<button class="btn ghost" data-close>✕</button></h2>${body}
    <div class="modal-actions"><button class="btn" id="dSell">Продать за ${fmt(total)}</button><button class="btn primary" data-close>В инвентарь</button><button class="btn" id="dAgain">Ещё раз</button></div>`, box => {
    $('#dSell', box).onclick = () => { sellUids(drops.map(x => x.u)); closeModal(); };
    $('#dAgain', box).onclick = () => { closeModal(); $('#openBtn').click(); };
  });
}

// ---------- инвентарь ----------
const invSel = new Set();
let invLimit = 240;
function sortedInv(sort, q) {
  let list = S.inv.slice();
  if (q) list = list.filter(x => displayName(x.i, x.st).toLowerCase().includes(q));
  const by = { new: (a, b) => b.t - a.t || b.u - a.u, price: (a, b) => priceOf(b) - priceOf(a), cheap: (a, b) => priceOf(a) - priceOf(b), rarity: (a, b) => ITEMS[b.i].r - ITEMS[a.i].r || priceOf(b) - priceOf(a) }[sort];
  return list.sort(by);
}
function renderInv() {
  const list = sortedInv($('#invSort').value, $('#invSearch').value.trim().toLowerCase());
  for (const u of [...invSel]) if (!S.inv.some(x => x.u === u)) invSel.delete(u);
  $('#invValue').textContent = fmt(S.inv.reduce((s, x) => s + priceOf(x), 0));
  const selVal = S.inv.filter(x => invSel.has(x.u)).reduce((s, x) => s + priceOf(x), 0);
  $('#sellSel').disabled = !invSel.size;
  $('#sellSel').textContent = invSel.size ? `Продать ${invSel.size} за ${fmt(selVal)}` : 'Продать выбранные';
  $('#selAll').textContent = invSel.size ? 'Снять выбор' : 'Выбрать все';
  $('#invGrid').innerHTML = list.length
    ? list.slice(0, invLimit).map(x => itemCard(x, { cls: invSel.has(x.u) ? 'sel' : '', attr: `data-u="${x.u}"`, extra: `<button class="btn ghost small" data-info="${x.u}" style="position:absolute;right:4px;bottom:4px;padding:2px 7px">i</button>` })).join('')
      + (list.length > invLimit ? `<button class="btn" id="invMore" style="grid-column:1/-1">Показать ещё (${list.length - invLimit})</button>` : '')
    : '<div class="empty">Инвентарь пуст. Откройте кейс!</div>';
}
$('#invSearch').addEventListener('input', renderInv);
$('#invSort').addEventListener('change', renderInv);
$('#invGrid').addEventListener('click', e => {
  if (e.target.id === 'invMore') { invLimit += 240; renderInv(); return; }
  const info = e.target.closest('[data-info]');
  if (info) { showItem(+info.dataset.info); return; }
  const c = e.target.closest('[data-u]'); if (!c) return;
  const u = +c.dataset.u; invSel.has(u) ? invSel.delete(u) : invSel.add(u); renderInv();
});
$('#selAll').addEventListener('click', () => {
  if (invSel.size) invSel.clear(); else sortedInv('new', $('#invSearch').value.trim().toLowerCase()).forEach(x => invSel.add(x.u));
  renderInv();
});
$('#sellSel').addEventListener('click', () => { sellUids([...invSel]); invSel.clear(); renderInv(); });
$('#sellCheap').addEventListener('click', () => {
  modal(`<h2>Продать дешёвые<button class="btn ghost" data-close>✕</button></h2>
    <p class="muted">Продать все предметы дешевле указанной цены (ножи и перчатки не трогаем).</p>
    <div class="game-row"><label>Дешевле $ <input type="number" id="cheapLim" value="1" min="0" step="0.1"></label><button class="btn primary" id="cheapGo">Продать</button></div>
    <p class="muted" id="cheapInfo"></p>`, box => {
    const upd = () => {
      const lim = +$('#cheapLim', box).value || 0;
      const l = S.inv.filter(x => ITEMS[x.i].r < 4 && priceOf(x) < lim);
      $('#cheapInfo', box).textContent = `${l.length} предм. на ${fmt(l.reduce((s, x) => s + priceOf(x), 0))}`;
      return l;
    };
    upd(); $('#cheapLim', box).oninput = upd;
    $('#cheapGo', box).onclick = () => { sellUids(upd().map(x => x.u)); closeModal(); renderInv(); };
  });
});
function sellUids(uids) {
  const set = new Set(uids); let sum = 0, n = 0;
  S.inv = S.inv.filter(x => { if (set.has(x.u)) { sum += priceOf(x); n++; return false; } return true; });
  if (!n) return;
  addMoney(sum); S.st.sold += sum;
  tuSel = tuSel.filter(u => !set.has(u)); upSel = upSel.filter(u => !set.has(u));
  toast(`Продано: ${n}`, '+' + fmt(sum)); beep('coin'); save(); renderTop(); checkAch();
}
function showItem(u) {
  const x = S.inv.find(y => y.u === u); if (!x) return;
  modal(`<h2>Предмет<button class="btn ghost" data-close>✕</button></h2>${dropDetails(x)}
    <div class="modal-actions"><button class="btn primary" id="iSell">Продать за ${fmt(priceOf(x))}</button><button class="btn" data-close>Закрыть</button></div>`,
  box => { $('#iSell', box).onclick = () => { sellUids([u]); closeModal(); if (curTab === 'inventory') renderInv(); }; });
}

// ---------- контракты обмена ----------
let tuSel = [];
const tuItems = () => tuSel.map(u => S.inv.find(x => x.u === u)).filter(Boolean);
function tuCap() { const l = tuItems(); return l.length && ITEMS[l[0].i].r === 3 ? 5 : 10; }
function tuEligible(x) {
  const it = ITEMS[x.i]; if (it.r > 3 || x.c == null) return false;
  const l = tuItems(); if (!l.length) return true;
  return ITEMS[l[0].i].r === it.r && l[0].st === x.st;
}
function tuOutcomes() {
  const l = tuItems(); if (!l.length) return [];
  const g = ITEMS[l[0].i].r + 1, st = l[0].st;
  const norm = l.reduce((s, x) => { const [a, b] = ITEMS[x.i].f; return s + (b > a ? (x.fl - a) / (b - a) : 0); }, 0) / l.length;
  const map = new Map();
  l.forEach(x => {
    const pool = CASES[x.c].g[g];
    pool.forEach(i => {
      const o = map.get(i) || { i, c: x.c, p: 0 };
      o.p += 1 / l.length / pool.length; map.set(i, o);
    });
  });
  return [...map.values()].map(o => {
    const [a, b] = ITEMS[o.i].f;
    o.fl = a + norm * (b - a); o.st = st && !!ITEMS[o.i].st; o.price = variantPrice(o.i, wearIdx(o.fl), o.st);
    return o;
  }).sort((a, b) => b.price - a.price);
}
function renderTU() {
  tuSel = tuSel.filter(u => S.inv.some(x => x.u === u));
  const l = tuItems(), cap = tuCap();
  $('#tuSlots').innerHTML = Array.from({ length: 10 }, (_, k) => {
    if (k >= cap) return '<div class="slot off"></div>';
    const x = l[k];
    return x ? `<div class="slot" style="--c:${GRADE[ITEMS[x.i].r].c}" data-rm="${x.u}" title="${esc(displayName(x.i, x.st))}"><img src="${img(ITEMS[x.i].img, '128fx96f')}" alt=""></div>` : '<div class="slot">+</div>';
  }).join('');
  const inVal = l.reduce((s, x) => s + priceOf(x), 0);
  const outs = tuOutcomes(), ev = outs.reduce((s, o) => s + o.p * o.price, 0);
  $('#tuInfo').innerHTML = l.length ? `${l.length}/${cap} · вложено <b>${fmt(inVal)}</b> · ожидаемо <b style="color:${ev >= inVal ? 'var(--good)' : 'var(--bad)'}">${fmt(ev)}</b>` : 'Добавьте предметы из инвентаря ниже';
  $('#tuGo').disabled = l.length !== cap;
  $('#tuOutcomes').innerHTML = outs.length ? outs.map(o => itemCard({ i: o.i, fl: o.fl, st: o.st }, { price: o.price, extra: `<div class="chance">${(o.p * 100).toFixed(1)}% · ${o.fl.toFixed(3)}</div>` })).join('') : '<div class="empty">—</div>';
  const inv = sortedInv('cheap', '').filter(x => ITEMS[x.i].r <= 3 && x.c != null && !tuSel.includes(x.u));
  $('#tuInv').innerHTML = inv.length ? inv.slice(0, 300).map(x => itemCard(x, { cls: tuEligible(x) && l.length < cap ? '' : 'dim', attr: `data-add="${x.u}"` })).join('') : '<div class="empty">Нет подходящих предметов</div>';
}
$('#tuInv').addEventListener('click', e => {
  const c = e.target.closest('[data-add]'); if (!c) return;
  const x = S.inv.find(y => y.u === +c.dataset.add);
  if (x && tuEligible(x) && tuItems().length < tuCap()) { tuSel.push(x.u); renderTU(); }
});
$('#tuSlots').addEventListener('click', e => { const s = e.target.closest('[data-rm]'); if (s) { tuSel = tuSel.filter(u => u !== +s.dataset.rm); renderTU(); } });
$('#tuClear').addEventListener('click', () => { tuSel = []; renderTU(); });
$('#tuAuto').addEventListener('click', () => {
  let l = tuItems();
  if (!l.length) {
    const cand = sortedInv('cheap', '').filter(x => ITEMS[x.i].r <= 3 && x.c != null);
    const groups = {};
    cand.forEach(x => { const k = ITEMS[x.i].r + (x.st ? 's' : ''); (groups[k] = groups[k] || []).push(x); });
    const full = Object.values(groups).find(g => g.length >= (ITEMS[g[0].i].r === 3 ? 5 : 10));
    const pick = full || Object.values(groups).sort((a, b) => b.length - a.length)[0];
    if (!pick) { toast('Нет предметов для контракта'); return; }
    tuSel = [pick[0].u];
  }
  for (const x of sortedInv('cheap', '')) { if (tuItems().length >= tuCap()) break; if (!tuSel.includes(x.u) && tuEligible(x)) tuSel.push(x.u); }
  renderTU();
});
$('#tuGo').addEventListener('click', () => {
  const l = tuItems(); if (l.length !== tuCap()) return;
  const outs = tuOutcomes();
  let r = rnd(), o = outs[outs.length - 1];
  for (const c of outs) { if (r < c.p) { o = c; break; } r -= c.p; }
  const set = new Set(tuSel);
  S.inv = S.inv.filter(x => !set.has(x.u)); tuSel = [];
  const x = newItem(o.i, o.c, { fl: o.fl, st: o.st });
  S.inv.push(x); trackDrop(x); S.st.tradeups++; addXP(40); save(); renderTop(); renderTU(); checkAch();
  beep(ITEMS[x.i].r >= 3 ? 'rare' : 'win');
  modal(`<h2>Результат контракта<button class="btn ghost" data-close>✕</button></h2>${dropDetails(x)}<div class="modal-actions"><button class="btn primary" data-close>Отлично</button></div>`);
});

// ---------- апгрейд ----------
let upSel = [], upTarget = null, upSpinning = false, needleRot = 0;
const upInVal = () => upSel.map(u => S.inv.find(x => x.u === u)).filter(Boolean).reduce((s, x) => s + priceOf(x), 0);
const upChance = () => { const a = upInVal(); return upTarget && a > 0 && upTarget.p > a ? Math.min(0.9, a / upTarget.p * 0.9) : 0; };
function renderUp() {
  upSel = upSel.filter(u => S.inv.some(x => x.u === u));
  const inv = sortedInv('price', ''), a = upInVal();
  if (upTarget && upTarget.p <= a) upTarget = null;
  $('#upIn').innerHTML = upSel.map(u => S.inv.find(x => x.u === u)).map(x => itemCard(x, { attr: `data-uprm="${x.u}"` })).join('');
  $('#upInVal').textContent = fmt(a);
  $('#upTarget').innerHTML = upTarget ? itemCard(upTarget, { price: upTarget.p }) : '';
  $('#upTVal').textContent = upTarget ? fmt(upTarget.p) : '—';
  const ch = upChance();
  $('#upChance').textContent = (ch * 100).toFixed(ch < 0.1 ? 2 : 1) + '%';
  $('#wheel').style.setProperty('--p', ch * 100);
  $('#upGo').disabled = !ch || upSpinning;
  $('#multBtns').innerHTML = [1.5, 2, 3, 5, 10, 20].map(m => `<button data-m="${m}" ${a ? '' : 'disabled'}>×${m}</button>`).join('');
  $('#upInv').innerHTML = inv.length ? inv.slice(0, 300).map(x => itemCard(x, { cls: upSel.includes(x.u) ? 'sel' : '', attr: `data-upadd="${x.u}"` })).join('') : '<div class="empty">Инвентарь пуст</div>';
  renderUpCatalog();
}
function renderUpCatalog() {
  const a = upInVal(), q = $('#upSearch').value.trim().toLowerCase();
  const list = [];
  for (const v of CATALOG) {
    if (v.p <= a * 1.05) continue;
    if (q && !displayName(v.i, v.st).toLowerCase().includes(q)) continue;
    list.push(v); if (list.length >= 150) break;
  }
  $('#upCatalog').innerHTML = list.map(v => itemCard(v, { price: v.p, cls: upTarget === v ? 'sel' : '', attr: `data-cat="${CATALOG.indexOf(v)}"` })).join('') || '<div class="empty">Ничего не найдено</div>';
}
$('#upSearch').addEventListener('input', renderUpCatalog);
$('#upInv').addEventListener('click', e => {
  const c = e.target.closest('[data-upadd]'); if (!c || upSpinning) return;
  const u = +c.dataset.upadd;
  if (upSel.includes(u)) upSel = upSel.filter(x => x !== u); else if (upSel.length < 6) upSel.push(u); else toast('Максимум 6 предметов');
  renderUp();
});
$('#upIn').addEventListener('click', e => { const c = e.target.closest('[data-uprm]'); if (c && !upSpinning) { upSel = upSel.filter(u => u !== +c.dataset.uprm); renderUp(); } });
$('#upCatalog').addEventListener('click', e => { const c = e.target.closest('[data-cat]'); if (c && !upSpinning) { upTarget = CATALOG[+c.dataset.cat]; renderUp(); } });
$('#multBtns').addEventListener('click', e => {
  const b = e.target.closest('[data-m]'); if (!b || upSpinning) return;
  const want = upInVal() * +b.dataset.m;
  upTarget = CATALOG.find(v => v.p >= want) || CATALOG[CATALOG.length - 1]; renderUp();
});
$('#upGo').addEventListener('click', () => {
  const ch = upChance(); if (!ch || upSpinning) return;
  upSpinning = true; $('#upGo').disabled = true;
  const r = rnd(), win = r < ch, t = upTarget;
  const wheel = $('#wheel'), needle = $('#needle');
  wheel.classList.remove('win', 'lose');
  needleRot = needleRot - (needleRot % 360) + 360 * 5 + r * 360;
  needle.style.transition = 'transform 4s cubic-bezier(.15,.7,.2,1)';
  needle.style.transform = `rotate(${needleRot}deg)`;
  setTimeout(() => {
    upSpinning = false;
    const set = new Set(upSel);
    S.inv = S.inv.filter(x => !set.has(x.u)); upSel = [];
    addXP(15);
    if (win) {
      const x = newItem(t.i, itemCase.get(t.i), { w: t.w, st: t.st });
      S.inv.push(x); trackDrop(x); S.st.upWins++; wheel.classList.add('win'); beep('rare');
      toast('Апгрейд успешен!', displayName(t.i, t.st) + ' · ' + fmt(t.p));
    } else { S.st.upLoss++; wheel.classList.add('lose'); beep('err'); toast('Не повезло', 'Предметы сгорели'); }
    upTarget = null; save(); renderTop(); renderUp(); checkAch();
  }, 4100);
});

// ---------- маркет ----------
function renderMarket() {
  const q = $('#mkSearch').value.trim().toLowerCase(), r = $('#mkRarity').value, st = $('#mkST').checked, sort = $('#mkSort').value;
  const src = sort === 'exp' ? [...CATALOG].reverse() : CATALOG;
  const list = [];
  for (const v of src) {
    if (v.st !== st) continue;
    if (r !== '' && ITEMS[v.i].r !== +r) continue;
    if (q && !displayName(v.i, v.st).toLowerCase().includes(q)) continue;
    list.push(v); if (list.length >= 160) break;
  }
  $('#mkGrid').innerHTML = list.map(v => itemCard(v, { price: v.p, cls: canPay(v.p) ? '' : 'locked', attr: `data-buy="${CATALOG.indexOf(v)}"` })).join('') || '<div class="empty">Ничего не найдено</div>';
}
['#mkSearch', '#mkRarity', '#mkSort', '#mkST'].forEach(s => $(s).addEventListener(s === '#mkSearch' ? 'input' : 'change', renderMarket));
$('#mkGrid').addEventListener('click', e => {
  const c = e.target.closest('[data-buy]'); if (!c) return;
  const v = CATALOG[+c.dataset.buy], it = ITEMS[v.i];
  modal(`<h2>Покупка<button class="btn ghost" data-close>✕</button></h2>
    <div class="drop" style="--c:${GRADE[it.r].c}"><img src="${img(it.img, '512fx384f')}" alt="">
    <div class="nm" style="color:${GRADE[it.r].c}">${esc(displayName(v.i, v.st))}${it.ph ? ' (' + esc(it.ph) + ')' : ''}</div>
    <div class="meta">${GRADE[it.r].n} · ${it.v ? 'Ванильный' : WEAR[v.w].n}</div><div class="pr">${fmt(v.p)}</div></div>
    <div class="modal-actions"><button class="btn primary" id="buyGo" ${canPay(v.p) ? '' : 'disabled'}>Купить</button><button class="btn" data-close>Отмена</button></div>`, box => {
    $('#buyGo', box).onclick = () => {
      if (!pay(v.p)) return;
      const x = newItem(v.i, itemCase.get(v.i), { w: v.w, st: v.st });
      S.inv.push(x); S.st.bought++; save(); renderTop(); closeModal(); renderMarket(); beep('coin');
      toast('Куплено', displayName(v.i, v.st)); checkAch();
    };
  });
});

// ---------- краш ----------
const crash = { on: false, bet: 0, at: 1, t0: 0, m: 1, out: false, pts: [] };
const crashHist = [], coinHist = [];
const cv = $('#crashCanvas'), cx = cv.getContext('2d');
const crashMult = ms => Math.exp(0.00011 * ms);
function drawCrash(state) {
  const W = cv.width, H = cv.height; cx.clearRect(0, 0, W, H);
  cx.strokeStyle = '#ffffff10'; cx.lineWidth = 1;
  for (let y = 0; y < H; y += 50) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
  const pts = crash.pts; const maxT = Math.max(8000, pts.length ? pts[pts.length - 1][0] : 0), maxM = Math.max(2, crash.m * 1.15);
  if (pts.length > 1) {
    cx.beginPath();
    pts.forEach(([t, m], k) => { const X = 20 + t / maxT * (W - 40), Y = H - 20 - (m - 1) / (maxM - 1) * (H - 50); k ? cx.lineTo(X, Y) : cx.moveTo(X, Y); });
    cx.strokeStyle = state === 'crashed' ? '#e5534b' : '#e8a33d'; cx.lineWidth = 4; cx.stroke();
  }
  cx.fillStyle = state === 'crashed' ? '#e5534b' : state === 'out' ? '#4cc76b' : '#e6e9ef';
  cx.font = '700 56px Rajdhani, sans-serif'; cx.textAlign = 'center';
  cx.fillText(state === 'idle' ? 'Сделайте ставку' : crash.m.toFixed(2) + '×', W / 2, H / 2);
  if (state === 'crashed') { cx.font = '600 22px Inter, sans-serif'; cx.fillText('КРАШ', W / 2, H / 2 + 36); }
}
drawCrash('idle');
function crashCashout() {
  if (!crash.on || crash.out) return;
  crash.out = true; const win = crash.bet * crash.m;
  addMoney(win); S.st.gambleNet += win - crash.bet; S.st.crashBest = Math.max(S.st.crashBest, crash.m);
  toast(`Забрали на ${crash.m.toFixed(2)}×`, '+' + fmt(win)); beep('win'); renderTop(); save(); checkAch();
  $('#crashGo').textContent = 'Ждём краш…'; $('#crashGo').disabled = true;
}
function hist(el, arr, txt, good) { arr.unshift(`<span class="${good ? 'g' : 'b'}">${txt}</span>`); arr.length = Math.min(arr.length, 14); $(el).innerHTML = arr.join(''); }
$('#crashGo').addEventListener('click', () => {
  if (crash.on) return crashCashout();
  const bet = Math.round(+$('#crashBet').value * 100) / 100;
  if (!(bet > 0)) return toast('Введите ставку');
  if (!pay(bet)) return;
  Object.assign(crash, { on: true, bet, out: false, m: 1, t0: performance.now(), pts: [], at: Math.max(1, Math.floor(97 / (100 * (1 - rnd())) * 100) / 100) });
  if (crash.at < 1.01) crash.at = 1;
  renderTop();
  const btn = $('#crashGo'); btn.disabled = false;
  const auto = +$('#crashAuto').value || 0;
  const step = now => {
    const t = now - crash.t0; crash.m = Math.min(crashMult(t), crash.at); crash.pts.push([t, crash.m]);
    btn.textContent = crash.out ? 'Ждём краш…' : `Забрать ${fmt(crash.bet * crash.m)}`;
    if (!crash.out && auto > 1 && crash.m >= auto) { crash.m = auto; crashCashout(); }
    if (crash.m >= crash.at) {
      crash.on = false; drawCrash('crashed');
      if (!crash.out) { S.st.gambleNet -= crash.bet; beep('err'); save(); }
      hist('#crashHist', crashHist, crash.at.toFixed(2) + '×', crash.at >= 2);
      btn.textContent = 'Ставка'; btn.disabled = false; return;
    }
    drawCrash(crash.out ? 'out' : 'run'); requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});

// ---------- монетка ----------
let coinRot = 0, coinBusy = false;
$$('[data-side]').forEach(b => b.addEventListener('click', () => {
  if (coinBusy) return;
  const bet = Math.round(+$('#coinBet').value * 100) / 100;
  if (!(bet > 0)) return toast('Введите ставку');
  if (!pay(bet)) return;
  coinBusy = true; renderTop();
  const res = rnd() < 0.5 ? 'ct' : 't', side = b.dataset.side;
  coinRot += 1800 + ((res === 't' ? 180 : 0) - (coinRot % 360) + 360) % 360;
  $('#coin').style.transform = `rotateY(${coinRot}deg)`;
  setTimeout(() => {
    coinBusy = false;
    if (res === side) { const w = Math.round(bet * 1.96 * 100) / 100; addMoney(w); S.st.gambleNet += w - bet; beep('win'); toast('Победа!', '+' + fmt(w)); }
    else { S.st.gambleNet -= bet; beep('err'); }
    hist('#coinHist', coinHist, res.toUpperCase(), res === side);
    renderTop(); save();
  }, 2300);
}));

// ---------- достижения ----------
const ACH = [
  ['c1', '📦', 'Первый кейс', 'Откройте 1 кейс', () => S.st.opened >= 1, 1],
  ['c10', '📦', 'Коллекционер', 'Откройте 10 кейсов', () => S.st.opened >= 10, 5],
  ['c100', '🗃️', 'Кейсоман', 'Откройте 100 кейсов', () => S.st.opened >= 100, 50],
  ['c1000', '🏭', 'Склад Valve', 'Откройте 1000 кейсов', () => S.st.opened >= 1000, 500],
  ['k1', '🔪', 'Ножевой бой', 'Выбейте нож или перчатки', () => S.st.knives >= 1, 100],
  ['k5', '⚔️', 'Арсенал', 'Выбейте 5 ножей или перчаток', () => S.st.knives >= 5, 500],
  ['st', '🔢', 'Счётчик убийств', 'Выбейте StatTrak™', () => S.st.stDrops >= 1, 5],
  ['red', '🟥', 'Тайное', 'Получите тайный предмет', () => S.inv.some(x => ITEMS[x.i].r === 3) || (S.st.best && ITEMS[S.st.best.i].r >= 3), 20],
  ['fl', '💎', 'Почти идеал', 'Float меньше 0.01', () => S.st.lowFloat < 0.01, 25],
  ['cl1k', '🖱️', 'Разминка', '1 000 кликов', () => S.st.clicks >= 1000, 5],
  ['cl10k', '🖱️', 'Аимбот', '10 000 кликов', () => S.st.clicks >= 10000, 50],
  ['m1k', '💵', 'Тысячник', 'Баланс $1 000', () => S.money >= 1000, 50],
  ['m10k', '💰', 'Богач', 'Баланс $10 000', () => S.money >= 10000, 300],
  ['m100k', '🏦', 'Инвестор в скины', 'Баланс $100 000', () => S.money >= 100000, 2000],
  ['tu', '📝', 'Подписано', 'Выполните контракт обмена', () => S.st.tradeups >= 1, 5],
  ['tu25', '📑', 'Бухгалтер', '25 контрактов', () => S.st.tradeups >= 25, 50],
  ['up', '⬆️', 'Апгрейд', 'Успешный апгрейд', () => S.st.upWins >= 1, 10],
  ['cr10', '🚀', 'Ракета', 'Заберите краш на 10×', () => S.st.crashBest >= 10, 50],
  ['ge', '🌐', 'Global Elite', 'Получите высшее звание', () => rankOf() === RANKS.length - 1, 1000],
];
function checkAch() {
  for (const [id, , n, , ok, rew] of ACH) {
    if (!S.ach[id] && ok()) { S.ach[id] = Date.now(); addMoney(rew); toast('Достижение: ' + n, '+' + fmt(rew)); beep('rare'); }
  }
  renderTop();
}

// ---------- профиль ----------
function renderProfile() {
  const st = S.st, invVal = S.inv.reduce((s, x) => s + priceOf(x), 0);
  const rows = [
    ['Звание', RANKS[rankOf()][0]], ['Опыт', Math.floor(S.xp)], ['Кликов', st.clicks.toLocaleString('ru')], ['Заработано кликами', fmt(st.clickEarn)],
    ['Открыто кейсов', st.opened], ['Потрачено на кейсы', fmt(st.spent)], ['Стоимость дропа', fmt(st.dropValue)],
    ['Окупаемость', st.spent ? Math.round(st.dropValue / st.spent * 100) + '%' : '—'], ['Ножей и перчаток', st.knives], ['StatTrak™', st.stDrops],
    ['Продано на', fmt(st.sold)], ['Контрактов', st.tradeups], ['Апгрейдов', `${st.upWins} / ${st.upWins + st.upLoss}`], ['Мини-игры', (st.gambleNet >= 0 ? '+' : '') + fmt(st.gambleNet)],
    ['Лучший краш', st.crashBest ? st.crashBest.toFixed(2) + '×' : '—'], ['Мин. float', st.lowFloat < 1 ? st.lowFloat.toFixed(6) : '—'], ['Инвентарь', `${S.inv.length} · ${fmt(invVal)}`],
    ['Лучший дроп', st.best ? `${displayName(st.best.i, st.best.st)} · ${fmt(st.best.p)}` : '—'],
  ];
  $('#stats').innerHTML = rows.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${esc(v)}</b></div>`).join('');
  $('#achCount').textContent = `${Object.keys(S.ach).length}/${ACH.length}`;
  $('#achs').innerHTML = ACH.map(([id, ic, n, d, , rew]) => `<div class="ach ${S.ach[id] ? 'done' : ''}"><i>${ic}</i><div><b>${n}</b><small>${d} · ${fmt(rew)}</small></div></div>`).join('');
  $('#soundOn').checked = S.set.sound;
  $('#dataInfo').textContent = `Цены Steam Market на ${D.built} (prices.csgotrader.app), состав кейсов — ByMykel/CSGO-API. ${CASES.length} кейсов, ${ITEMS.length} предметов.`;
}
$('#soundOn').addEventListener('change', e => { S.set.sound = e.target.checked; save(); });
$('#exportSave').addEventListener('click', () => {
  save();
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  modal(`<h2>Код сохранения<button class="btn ghost" data-close>✕</button></h2><textarea id="saveCode" readonly style="width:100%;height:160px;background:var(--bg2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:8px">${code}</textarea>
    <div class="modal-actions"><button class="btn primary" id="copyCode">Скопировать</button></div>`, box => {
    $('#copyCode', box).onclick = () => { $('#saveCode', box).select(); navigator.clipboard?.writeText(code).then(() => toast('Скопировано'), () => document.execCommand('copy')); };
  });
});
$('#importSave').addEventListener('click', () => {
  modal(`<h2>Загрузить сохранение<button class="btn ghost" data-close>✕</button></h2><textarea id="loadCode" style="width:100%;height:160px;background:var(--bg2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:8px" placeholder="Вставьте код"></textarea>
    <div class="modal-actions"><button class="btn primary" id="loadGo">Загрузить</button></div>`, box => {
    $('#loadGo', box).onclick = () => {
      try {
        const o = JSON.parse(decodeURIComponent(escape(atob($('#loadCode', box).value.trim()))));
        if (typeof o.money !== 'number' || !Array.isArray(o.inv)) throw 0;
        localStorage.setItem(SAVE_KEY, JSON.stringify(o)); location.reload();
      } catch { toast('Неверный код'); }
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
  const capMs = (S.up.offline + 1) * 3600e3;
  const income = perSec() * Math.min(away, capMs) / 1000 * 0.5;
  if (away > 60e3 && income >= 0.01) { addMoney(income); setTimeout(() => toast('Пока вас не было', `Автокликер заработал ${fmt(income)}`), 500); }
})();
let lastT = performance.now(), saveAcc = 0, uiAcc = 0;
setInterval(() => {
  const now = performance.now(), dt = (now - lastT) / 1000; lastT = now;
  const ps = perSec(); if (ps) addMoney(ps * dt);
  $('#money').textContent = fmt(S.money);
  saveAcc += dt; uiAcc += dt;
  if (uiAcc > 1) { uiAcc = 0; if (curTab === 'clicker') renderUpgrades(); checkAch(); }
  if (saveAcc > 5) { saveAcc = 0; save(); }
}, 100);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('beforeunload', save);

renderTop(); renderUpgrades(); checkAch();
