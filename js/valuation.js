'use strict';
// Shared drop premiums: game, authored cases and weekly economy checks.
(function () {
const BLUE_GEMS = new Set([661, 670, 321, 955, 151, 179, 555, 828, 760, 168, 592, 387, 809, 868, 442, 4, 32, 147, 278, 905]);
// доля синего у Case Hardened: у большинства паттернов мало, высокий синий редок
const chBlue = s => (BLUE_GEMS.has(s) ? 90 + (s % 10) : Math.round(100 * (((s * 7919 + 13) % 1000) / 1000) ** 2.4));
const PATTERNS = [
  [/Marble Fade/, s => (s < 25 ? ['Fire & Ice', 3.5] : s < 70 ? ['Fake Fire & Ice', 1.35] : s % 5 === 0 ? ['Tricolor', 1.15] : [null, 1])],
  [/\| Fade/, s => { const f = 80 + (s * 7919 % 1000) / 999 * 20; return [`Fade ${f.toFixed(1)}%`, f >= 99.5 ? 1.6 : f >= 97 ? 1.25 : f >= 93 ? 1.08 : 1]; }],
  [/Case Hardened/, (s, it) => {
    const b = chBlue(s), big = it.t === 'k' || it.n.startsWith('AK-47');
    if (BLUE_GEMS.has(s)) return [`Blue Gem · синий ${b}%`, big ? 10 : 4];
    return [`Синий ${b}%`, 1 + (big ? 1.5 : 0.8) * (b / 100) ** 2];
  }],
  [/Crimson Web/, s => (s % 100 < 6 ? ['Центральная паутина', 1.6] : s % 100 < 20 ? ['Две паутины', 1.15] : [null, 1])],
  [/Slaughter/, s => (s % 100 < 4 ? ['Diamond', 1.4] : s % 100 < 9 ? ['Heart', 1.25] : s % 100 < 14 ? ['Angel', 1.15] : [null, 1])],
  [/Fire Serpent/, s => (s % 100 < 5 ? ['Голова змеи', 1.5] : [null, 1])],
  [/Hypnotic|Lore|Autotronic/, s => (s % 100 < 5 ? ['Идеальная сетка', 1.3] : [null, 1])],
  [/Tiger Tooth|Damascus Steel|Rust Coat/, s => (s % 100 < 4 ? ['Редкий узор', 1.3] : [null, 1])],
  [/Heat Treated|Blue Steel/, s => (s % 100 < 5 ? ['Синий отлив', 1.5] : [null, 1])],
  [/Phoenix Blacklight|Wild Lotus|Gold Arabesque|Dragon Lore|Howl|Medusa|Fire Elemental|Asiimov|Printstream/, s => (s < 10 ? ['Тир-1 паттерн', 1.4] : [null, 1])],
];
const family = it => it.v || !['w', 'sv', 'k', 'g'].includes(it.t) ? null : PATTERNS.find(([re]) => re.test(it.n))?.[1] || null;
function pattern(it, seed) { const f = seed == null ? null : family(it); return f ? f(seed, it) : [null, 1]; }
// float: премия за редкое значение внутри своего износа
function float(it, value) { // → [подпись | null, множитель ≥ 1]
  if (it.v || !['w', 'sv', 'k', 'g'].includes(it.t) || value == null) return [null, 1];
  const f = value, w = [0.07, 0.15, 0.38, 0.45].filter(b => f >= b).length;
  if (w === 0) return f < 0.001 ? ['Двойной ноль', 2] : f < 0.005 ? ['Сверхнизкий float', 1.35] : f < 0.01 ? ['Низкий float', 1.12] : [null, 1];
  if (w === 1 && f < 0.075) return ['Почти FN', 1.12];
  if (w === 2 && f < 0.16) return ['Почти MW', 1.1];
  if (w === 4 && f > 0.99) return ['Максимальный float', 1.4];
  return [null, 1];
}

const cache = new WeakMap();
function patternMean(it) {
  if (!cache.has(it)) { let sum = 0; for (let seed = 0; seed < 1000; seed++) sum += pattern(it, seed)[1]; cache.set(it, sum / 1000); }
  return cache.get(it);
}
function floatMean(it, a, b) {
  if (b <= a) return float(it, a)[1];
  const cuts = [a, ...[.001,.005,.01,.07,.075,.15,.16,.38,.45,.99].filter(x => x > a && x < b), b];
  return cuts.slice(1).reduce((sum, hi, k) => sum + (hi - cuts[k]) * float(it, (hi + cuts[k]) / 2)[1], 0) / (b - a);
}
window.VALUATION = { pattern, float, patternMean, floatMean, chBlue };
})();
