"""Собирает data/cases.js из открытых источников:
- состав кейсов/коллекций и картинки: github.com/ByMykel/CSGO-API
- цены Steam Market: prices.csgotrader.app (last_7d, фолбэки; затем Skinport, CSFloat, Buff163).
  Редкие предметы (сувенирный Dragon Lore, холо-наклейки Katowice 2014) в Steam почти не продаются —
  без запасных источников они пропадали из кейсов.
Запуск: python3 tools/build_data.py [папка_с_json]  (без аргумента — скачает сам)"""
import json, sys, os, urllib.request, gzip, datetime

SRC = {
    'crates': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json',
    'skins': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json',
    'collections': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/collections.json',
    'steam': 'https://prices.csgotrader.app/latest/steam.json',
    'skinport': 'https://prices.csgotrader.app/latest/skinport.json',
    'csfloat': 'https://prices.csgotrader.app/latest/csfloat.json',
    'buff163': 'https://prices.csgotrader.app/latest/buff163.json',
}
CDN = 'https://community.akamai.steamstatic.com/economy/image/'
WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred']
# единая шкала редкости: 0 ширпотреб … 5 тайное, 6 ★ редкий особый
TIER = {'Consumer Grade': 0, 'Base Grade': 0, 'Industrial Grade': 1, 'Mil-Spec Grade': 2, 'High Grade': 2,
        'Restricted': 3, 'Remarkable': 3, 'Classified': 4, 'Exotic': 4, 'Covert': 5, 'Extraordinary': 5, 'Contraband': 5}
# тип контейнера в данных → вид в игре
KIND = {'Case': 'case', 'Souvenir': 'souvenir', 'Souvenir Highlight': 'souvenir', 'Sticker Capsule': 'sticker',
        'Autograph Capsule': 'autograph', 'Patch Capsule': 'patch', 'Pins': 'pin'}
# во сколько раз Steam дороже площадки (медиана по ~15 тыс. предметов, 2026-10-16)
STEAM_RATIO = {'csfloat': 1.55, 'skinport': 1.45, 'buff163': 1.55}
KEY_PRICE = 2.49


def load(name, folder):
    if folder:
        return json.load(open(os.path.join(folder, name + '.json')))
    req = urllib.request.Request(SRC[name], headers={'Accept-Encoding': 'gzip', 'User-Agent': 'case-clicker'})
    raw = urllib.request.urlopen(req, timeout=180).read()
    if raw[:2] == b'\x1f\x8b':
        raw = gzip.decompress(raw)
    return json.loads(raw)


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else None
    crates = load('crates', folder)
    skins = {s['name']: s for s in load('skins', folder)}
    steam, skinport = load('steam', folder), load('skinport', folder)
    csfloat, buff = load('csfloat', folder), load('buff163', folder)
    fallback_used, corrected = [], []
    collections = load('collections', folder)

    def market_refs(name):
        # цены площадок, приведённые к уровню Steam
        out = []
        v = (csfloat.get(name) or {}).get('price')
        if v: out.append(v * STEAM_RATIO['csfloat'])
        v = (skinport.get(name) or {}).get('starting_at')
        if v: out.append(v * STEAM_RATIO['skinport'])
        v = ((buff.get(name) or {}).get('starting_at') or {}).get('price')
        if v: out.append(v * STEAM_RATIO['buff163'])
        return sorted(out)

    def price(name):
        sp = None
        p = steam.get(name) or {}
        for k in ('last_7d', 'last_24h', 'last_30d', 'last_90d'):
            if p.get(k):
                sp = p[k]
                break
        refs = market_refs(name)
        ref = refs[len(refs) // 2] if refs else None
        # Редкие сделки в Steam бывают накручены или случайно дешёвые. Если Steam расходится с рынком
        # больше чем в 2.5 раза, а площадки согласны между собой (разброс ≤ 1.6), берём рынок.
        if sp and ref and len(refs) >= 2 and refs[-1] / refs[0] <= 1.6 and not (0.4 <= sp / ref <= 2.5):
            corrected.append((name, sp, round(ref, 2)))
            return round(ref, 2)
        if sp:
            return round(sp, 2)
        if ref:
            fallback_used.append(name)
            return round(ref, 2)
        return None

    items, index = [], {}

    def add(key, rec):
        if key in index:
            return index[key]
        index[key] = len(items)
        items.append(rec)
        return index[key]

    def short(url):
        return url.replace(CDN, '')

    def wear_names(name, souvenir, stattrak, vanilla):
        if vanilla:
            return [('★ StatTrak™ ' + name[2:]) if stattrak else name] * 5
        if stattrak:
            name = ('★ StatTrak™ ' + name[2:]) if name.startswith('★ ') else 'StatTrak™ ' + name
        return [f"{'Souvenir ' if souvenir else ''}{name} ({w})" for w in WEARS]

    def weapon(it, tier, souvenir=False):
        name = it['name']
        key = ('Souvenir ' if souvenir else '') + name
        if key in index:
            return index[key]
        sk = skins.get(name, {})
        vanilla = '|' not in name
        star = name.startswith('★ ')
        prices, st = [], []
        for w in WEARS:
            if vanilla:
                prices.append(price(name)); st.append(price('★ StatTrak™ ' + name[2:]))
                continue
            if souvenir:
                prices.append(price(f'Souvenir {name} ({w})')); st.append(None)
                continue
            prices.append(price(f'{name} ({w})'))
            st_name = ('★ StatTrak™ ' + name[2:]) if star else 'StatTrak™ ' + name
            st.append(price(f'{st_name} ({w})'))
        # цена с одной площадки, в 5+ раз выше Steam-цен других износов, — чей-то завышенный лот
        fb = set(fallback_used)
        for arr, names in ((prices, wear_names(name, souvenir, False, vanilla)), (st, wear_names(name, souvenir, True, vanilla))):
            real = [v for v, n in zip(arr, names) if v and n not in fb]
            for k, (v, n) in enumerate(zip(arr, names)):
                if v and n in fb and real and v > 5 * max(real):
                    arr[k] = None
        if not any(prices):
            return None
        glove = 'Gloves' in (sk.get('category') or {}).get('name', '') or 'Wraps' in name
        rec = {'n': name, 'img': short(it['image']), 'r': tier, 't': 'k' if tier == 6 else ('sv' if souvenir else 'w'),
               'f': [0, 1] if vanilla else [sk.get('min_float', 0.0), sk.get('max_float', 1.0)],
               'p': prices, 'st': st if (not souvenir and not glove and any(st)) else None}
        if vanilla:
            rec['v'] = 1
        return add(key, rec)

    def flat(it, tier, kind, guess=None):
        name = it['name']
        mk = {'sticker': 'Sticker | ', 'autograph': 'Sticker | ', 'patch': 'Patch | ', 'pin': ''}[kind] + name
        if mk in index:
            return index[mk]
        p = price(mk) or guess
        if p is None:
            return None
        return add(mk, {'n': mk, 'img': short(it['image']), 'r': tier, 't': 's' if kind in ('sticker', 'autograph') else kind,
                        'f': [0, 1], 'p': [p], 'st': None, 'v': 1})

    boxes = []
    for c in crates:
        kind = KIND.get(c.get('type'))
        if c.get('type') is None and 'Terminal' in c['name']:
            kind = 'terminal'
        if not kind:
            continue
        cp = price(c['market_hash_name'] or c['name'])
        if cp is None:
            continue
        pool, unpriced = {}, []
        for it in c['contains']:
            t = TIER.get(it['rarity']['name'])
            if t is None:
                continue
            if kind in ('case', 'terminal', 'souvenir'):
                i = weapon(it, t, souvenir=kind == 'souvenir')
            else:
                i = flat(it, t, kind)
                if i is None:
                    unpriced.append((it, t))
            if i is not None:
                pool.setdefault(t, []).append(i)
        # предмет без цены нигде (не было продаж) не выкидываем: оценка — медиана той же редкости в капсуле
        for it, t in unpriced:
            same = sorted(items[j]['p'][0] for j in pool.get(t, []))
            if same:
                pool[t].append(flat(it, t, kind, guess=same[len(same) // 2]))
        seen = set()
        for it in c['contains_rare']:
            if it['name'] in seen:
                continue  # фазы доплера — одна запись, цена Steam у них общая
            seen.add(it['name'])
            i = weapon(it, 6)
            if i is not None:
                pool.setdefault(6, []).append(i)
        if not pool or (kind in ('case', 'terminal') and len(pool) < 4):
            continue
        for t in pool:
            pool[t] = sorted(set(pool[t]), key=pool[t].index)
        date = (c.get('first_sale_date') or '').replace('/', '-')
        boxes.append({'n': c['name'], 'img': short(c['image']), 'p': cp, 'date': date, 'k': kind,
                      'g': {str(t): v for t, v in sorted(pool.items())}})

    # коллекции карт и операций: скины, которых нет ни в одном оружейном кейсе, выпадают отсюда
    in_cases = {items[i]['n'] for b in boxes if b['k'] in ('case', 'terminal') for l in b['g'].values() for i in l}
    for c in collections:
        if 'Agents' in c['name'] or not c.get('contains'):
            continue
        if all(it['name'] in in_cases for it in c['contains']):
            continue  # коллекция кейса — уже есть как кейс
        pool = {}
        for it in c['contains']:
            t = TIER.get(it['rarity']['name'])
            if t is None:
                continue
            i = weapon(it, t)
            if i is not None:
                pool.setdefault(t, []).append(i)
        if not pool:
            continue
        date = (c.get('release_date') or '').replace('/', '-') or '2013-08-14'
        boxes.append({'n': c['name'], 'img': c['image'], 'p': 0, 'date': date, 'k': 'collection',
                      'g': {str(t): sorted(set(v), key=v.index) for t, v in sorted(pool.items())}})
    # остальные скины (без контейнера) — для маркета и апгрейдера
    for sk in skins.values():
        cat = (sk.get('category') or {}).get('name')
        t = TIER.get((sk.get('rarity') or {}).get('name'))
        if t is None or not sk.get('image') or cat in ('Agents', None):
            continue
        weapon(sk, 6 if sk['name'].startswith('★ ') else t)
        if sk.get('souvenir') and not sk['name'].startswith('★ '):
            weapon(sk, t, souvenir=True)

    order = {'case': 0, 'terminal': 1, 'collection': 2, 'souvenir': 3, 'sticker': 4, 'autograph': 5, 'patch': 6, 'pin': 7}
    for b in boxes:  # у сувениров мейджоров нет даты — берём год из названия
        if not b['date']:
            yr = next((w for w in b['n'].split() if w.isdigit() and len(w) == 4), '2025' if b['k'] == 'terminal' else '2013')
            b['date'] = yr + '-06-01'
        b['date'] = '-'.join(x.zfill(2) for x in b['date'].split('-'))
    boxes.sort(key=lambda b: b['date'], reverse=True)
    boxes.sort(key=lambda b: order[b['k']])
    data = {'built': datetime.date.today().isoformat(), 'key': KEY_PRICE, 'cdn': CDN, 'boxes': boxes, 'items': items}
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, '..', 'data', 'cases.js'), 'w') as f:
        f.write('window.GAME_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    from collections import Counter
    print(len(set(fallback_used)), 'prices from CSFloat/Skinport/Buff163;', len(corrected), 'Steam outliers corrected, e.g.', corrected[:3])
    print(len(boxes), 'boxes', dict(Counter(b['k'] for b in boxes)), len(items), 'items')


main()
