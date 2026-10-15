"""Собирает data/cases.js из открытых источников:
- состав кейсов/коллекций и картинки: github.com/ByMykel/CSGO-API
- цены Steam Market: prices.csgotrader.app (last_7d, фолбэки; затем Skinport)
Запуск: python3 tools/build_data.py [папка_с_json]  (без аргумента — скачает сам)"""
import json, sys, os, urllib.request, gzip, datetime

SRC = {
    'crates': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json',
    'skins': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json',
    'steam': 'https://prices.csgotrader.app/latest/steam.json',
    'skinport': 'https://prices.csgotrader.app/latest/skinport.json',
}
CDN = 'https://community.akamai.steamstatic.com/economy/image/'
WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred']
# единая шкала редкости: 0 ширпотреб … 5 тайное, 6 ★ редкий особый
TIER = {'Consumer Grade': 0, 'Base Grade': 0, 'Industrial Grade': 1, 'Mil-Spec Grade': 2, 'High Grade': 2,
        'Restricted': 3, 'Remarkable': 3, 'Classified': 4, 'Exotic': 4, 'Covert': 5, 'Extraordinary': 5, 'Contraband': 6}
# тип контейнера в данных → вид в игре
KIND = {'Case': 'case', 'Souvenir': 'souvenir', 'Souvenir Highlight': 'souvenir', 'Sticker Capsule': 'sticker',
        'Autograph Capsule': 'autograph', 'Patch Capsule': 'patch', 'Pins': 'pin'}
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

    def price(name):
        p = steam.get(name)
        if p:
            for k in ('last_7d', 'last_24h', 'last_30d', 'last_90d'):
                if p.get(k):
                    return round(p[k], 2)
        p = skinport.get(name)
        if p and p.get('starting_at'):
            return round(p['starting_at'], 2)
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
        if not any(prices):
            return None
        glove = 'Gloves' in (sk.get('category') or {}).get('name', '') or 'Wraps' in name
        rec = {'n': name, 'img': short(it['image']), 'r': tier, 't': 'k' if tier == 6 else ('sv' if souvenir else 'w'),
               'f': [0, 1] if vanilla else [sk.get('min_float', 0.0), sk.get('max_float', 1.0)],
               'p': prices, 'st': st if (not souvenir and not glove and any(st)) else None}
        if vanilla:
            rec['v'] = 1
        return add(key, rec)

    def flat(it, tier, kind):
        name = it['name']
        mk = {'sticker': 'Sticker | ', 'autograph': 'Sticker | ', 'patch': 'Patch | ', 'pin': ''}[kind] + name
        if mk in index:
            return index[mk]
        p = price(mk)
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
        pool = {}
        for it in c['contains']:
            t = TIER.get(it['rarity']['name'])
            if t is None:
                continue
            if kind in ('case', 'terminal', 'souvenir'):
                i = weapon(it, t, souvenir=kind == 'souvenir')
            else:
                i = flat(it, t, kind)
            if i is not None:
                pool.setdefault(t, []).append(i)
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

    order = {'case': 0, 'terminal': 1, 'souvenir': 2, 'sticker': 3, 'autograph': 4, 'patch': 5, 'pin': 6}
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
    print(len(boxes), 'boxes', dict(Counter(b['k'] for b in boxes)), len(items), 'items')


main()
