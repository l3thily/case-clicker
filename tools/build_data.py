"""Собирает data/cases.js из открытых источников:
- состав кейсов и картинки: github.com/ByMykel/CSGO-API
- цены Steam Market: prices.csgotrader.app (last_7d, фолбэки)
Запуск: python3 tools/build_data.py [папка_с_json]  (без аргумента — скачает сам)"""
import json, sys, os, urllib.request, gzip, datetime

SRC = {
    'crates': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json',
    'skins': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json',
    'steam': 'https://prices.csgotrader.app/latest/steam.json',
    'skinport': 'https://prices.csgotrader.app/latest/skinport.json',
}
WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred']
RAR = {'Mil-Spec Grade': 0, 'Restricted': 1, 'Classified': 2, 'Covert': 3}
KEY_PRICE = 2.49

def load(name, folder):
    if folder:
        return json.load(open(os.path.join(folder, name + '.json')))
    req = urllib.request.Request(SRC[name], headers={'Accept-Encoding': 'gzip', 'User-Agent': 'case-clicker'})
    raw = urllib.request.urlopen(req, timeout=120).read()
    if raw[:2] == b'\x1f\x8b':
        raw = gzip.decompress(raw)
    return json.loads(raw)

def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else None
    crates = [c for c in load('crates', folder) if c.get('type') == 'Case']
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

    items, out_cases = {}, []

    def add_item(it, rare):
        name = it['name']
        if name in items:
            return items[name]['i']
        sk = skins.get(name, {})
        vanilla = '|' not in name
        base = name
        prices, st = [], []
        for w in WEARS:
            if vanilla:
                prices.append(price(base)); st.append(price('★ StatTrak™ ' + base[2:]))
                continue
            prices.append(price(f'{base} ({w})'))
            st_name = ('★ StatTrak™ ' + base[2:]) if base.startswith('★ ') else 'StatTrak™ ' + base
            st.append(price(f'{st_name} ({w})'))
        if not any(prices):
            return None
        is_glove = 'Gloves' in (sk.get('category') or {}).get('name', '') or 'Gloves' in name or 'Wraps' in name
        rec = {
            'i': len(items), 'n': name, 'img': it['image'].replace('https://community.akamai.steamstatic.com/economy/image/', ''),
            'r': 4 if rare else RAR[it['rarity']['name']],
            'f': [sk.get('min_float', 0.0), sk.get('max_float', 1.0)] if not vanilla else [0, 1],
            'p': prices, 'st': st if (sk.get('stattrak', True) and not is_glove and any(st)) else None,
            'v': 1 if vanilla else 0,
        }
        items[name] = rec
        return rec['i']

    for c in crates:
        cp = price(c['market_hash_name'] or c['name'])
        if cp is None:
            continue
        grades = [[], [], [], [], []]
        for it in c['contains']:
            if it['rarity']['name'] not in RAR:
                continue
            i = add_item(it, False)
            if i is not None:
                grades[RAR[it['rarity']['name']]].append(i)
        seen = set()
        for it in c['contains_rare']:
            key = it['name']
            if key in seen:
                continue  # дубли фаз доплера — одна запись
            seen.add(key)
            i = add_item(it, True)
            if i is not None:
                grades[4].append(i)
        if not all(grades):
            print('skip incomplete', c['name'], [len(g) for g in grades]); continue
        out_cases.append({'id': c['id'], 'n': c['name'], 'img': c['image'].replace('https://community.akamai.steamstatic.com/economy/image/', ''),
                          'p': cp, 'date': c['first_sale_date'].replace('/', '-'), 'g': grades})

    out_cases.sort(key=lambda c: c['date'], reverse=True)
    arr = sorted(items.values(), key=lambda x: x['i'])
    for x in arr:
        del x['i']
    data = {'built': datetime.date.today().isoformat(), 'key': KEY_PRICE,
            'cdn': 'https://community.akamai.steamstatic.com/economy/image/', 'cases': out_cases, 'items': arr}
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, '..', 'data', 'cases.js'), 'w') as f:
        f.write('window.GAME_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(len(out_cases), 'cases,', len(arr), 'items')

main()
