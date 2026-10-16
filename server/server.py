"""Case Clicker: облачные сохранения и рейтинг. Только stdlib.
Запуск: PORT=8093 STATE_DIRECTORY=/var/lib/case-clicker python3 server.py
API (JSON):
  POST /api/register {name, password}  → {token, name}
  POST /api/login    {name, password}  → {token, name}
  POST /api/logout                      (Bearer)
  GET  /api/save                        (Bearer) → {save, updated}
  PUT  /api/save     {save, stats}      (Bearer) → {updated}
  GET  /api/top?by=net|best|opened|battles|rank  → {rows, me}
  GET  /api/health
"""
import hashlib, hmac, json, math, os, re, secrets, sqlite3, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get('PORT', '8093'))
STATE = os.environ.get('STATE_DIRECTORY', os.path.dirname(os.path.abspath(__file__)))
os.makedirs(STATE.split(':')[0], exist_ok=True)
DB = os.path.join(STATE.split(':')[0], 'case-clicker.db')
ORIGINS = {'https://l3thily.github.io', 'http://localhost:8765', 'http://127.0.0.1:8765'}
NAME_RE = re.compile(r'^[A-Za-zА-Яа-яЁё0-9_.-]{3,20}$')
MAX_SAVE = 3 * 1024 * 1024
BOARDS = {'net': 'net', 'best': 'best', 'opened': 'opened', 'battles': 'battles', 'rank': 'rank'}

lock = threading.Lock()
db = sqlite3.connect(DB, check_same_thread=False)
db.executescript('''
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT UNIQUE COLLATE NOCASE, salt BLOB, pw BLOB, created INTEGER);
CREATE TABLE IF NOT EXISTS tokens(hash BLOB PRIMARY KEY, uid INTEGER, created INTEGER);
CREATE TABLE IF NOT EXISTS saves(uid INTEGER PRIMARY KEY, data TEXT, updated INTEGER);
CREATE TABLE IF NOT EXISTS stats(uid INTEGER PRIMARY KEY, net REAL, best REAL, best_name TEXT, opened INTEGER,
  battles INTEGER, rank INTEGER, rank_name TEXT, updated INTEGER);
''')

hits = {}  # (ip, bucket) → [время запросов]


def limited(ip, bucket, n, window):
    now = time.time()
    with lock:
        q = [t for t in hits.get((ip, bucket), []) if now - t < window]
        if len(q) >= n:
            hits[(ip, bucket)] = q
            return True
        q.append(now)
        hits[(ip, bucket)] = q
    return False


def pw_hash(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 200_000)


def new_token(uid):
    tok = secrets.token_urlsafe(32)
    with lock:
        db.execute('INSERT INTO tokens VALUES(?,?,?)', (hashlib.sha256(tok.encode()).digest(), uid, int(time.time())))
        db.commit()
    return tok


def num(v, lo=0, hi=1e13):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return 0
    return 0 if not math.isfinite(v) else max(lo, min(hi, v))


class H(BaseHTTPRequestHandler):
    server_version = 'case-clicker'

    def log_message(self, *a):
        pass

    def ip(self):
        return self.headers.get('X-Real-IP') or self.client_address[0]

    def cors(self):
        o = self.headers.get('Origin')
        if o in ORIGINS:
            self.send_header('Access-Control-Allow-Origin', o)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
            self.send_header('Access-Control-Max-Age', '86400')

    def reply(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        try:
            n = int(self.headers.get('Content-Length') or 0)
            if n < 0 or n > MAX_SAVE + 4096:
                return None
            value = json.loads(self.rfile.read(n) or b'{}')
            return value if isinstance(value, dict) else None
        except (ValueError, UnicodeError):
            return None

    def user(self):
        a = self.headers.get('Authorization', '')
        if not a.startswith('Bearer '):
            return None
        h = hashlib.sha256(a[7:].strip().encode()).digest()
        row = db.execute('SELECT u.id, u.name FROM tokens t JOIN users u ON u.id=t.uid WHERE t.hash=? AND t.created > ?', (h, int(time.time()) - 90 * 86400)).fetchone()
        return row

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == '/api/health':
            return self.reply(200, {'ok': True})
        if url.path == '/api/save':
            u = self.user()
            if not u:
                return self.reply(401, {'error': 'Войдите заново'})
            row = db.execute('SELECT data, updated FROM saves WHERE uid=?', (u[0],)).fetchone()
            return self.reply(200, {'name': u[1], 'save': row[0] if row else None, 'updated': row[1] if row else 0})
        if url.path == '/api/top':
            by = BOARDS.get((parse_qs(url.query).get('by') or ['net'])[0], 'net')
            rows = db.execute(f'''SELECT u.name, s.{by}, s.best_name, s.rank_name FROM stats s JOIN users u ON u.id=s.uid
                                  WHERE s.{by} > 0 ORDER BY s.{by} DESC, s.updated ASC LIMIT 50''').fetchall()
            out = {'rows': [{'name': r[0], 'value': r[1], 'best_name': r[2], 'rank_name': r[3]} for r in rows], 'me': None}
            u = self.user()
            if u:
                mine = db.execute(f'SELECT {by} FROM stats WHERE uid=?', (u[0],)).fetchone()
                if mine:
                    place = db.execute(f'SELECT COUNT(*) FROM stats WHERE {by} > ?', (mine[0],)).fetchone()[0] + 1
                    out['me'] = {'name': u[1], 'value': mine[0], 'place': place}
            return self.reply(200, out)
        self.reply(404, {'error': 'not found'})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/api/logout':
            a = self.headers.get('Authorization', '')
            if a.startswith('Bearer '):
                with lock:
                    db.execute('DELETE FROM tokens WHERE hash=?', (hashlib.sha256(a[7:].strip().encode()).digest(),))
                    db.commit()
            return self.reply(200, {'ok': True})
        if path not in ('/api/register', '/api/login'):
            return self.reply(404, {'error': 'not found'})
        d = self.body() or {}
        name, password = str(d.get('name', '')).strip(), str(d.get('password', ''))
        if len(password) > 200:
            return self.reply(400, {'error': 'Пароль слишком длинный'})
        if path == '/api/register':
            if limited(self.ip(), 'reg', 5, 3600):
                return self.reply(429, {'error': 'Слишком много регистраций, попробуйте через час'})
            if not NAME_RE.match(name):
                return self.reply(400, {'error': 'Ник: 3–20 символов, буквы, цифры, _ . -'})
            if len(password) < 6 or len(password) > 200:
                return self.reply(400, {'error': 'Пароль: от 6 символов'})
            salt = secrets.token_bytes(16)
            try:
                with lock:
                    cur = db.execute('INSERT INTO users(name, salt, pw, created) VALUES(?,?,?,?)', (name, salt, pw_hash(password, salt), int(time.time())))
                    db.commit()
            except sqlite3.IntegrityError:
                return self.reply(409, {'error': 'Такой ник уже занят'})
            return self.reply(200, {'token': new_token(cur.lastrowid), 'name': name})
        if limited(self.ip(), 'login', 20, 600):
            return self.reply(429, {'error': 'Слишком много попыток, подождите 10 минут'})
        row = db.execute('SELECT id, name, salt, pw FROM users WHERE name=?', (name,)).fetchone()
        if not row or not hmac.compare_digest(pw_hash(password, row[2]), row[3]):
            return self.reply(401, {'error': 'Неверный ник или пароль'})
        return self.reply(200, {'token': new_token(row[0]), 'name': row[1]})

    def do_PUT(self):
        if urlparse(self.path).path != '/api/save':
            return self.reply(404, {'error': 'not found'})
        u = self.user()
        if not u:
            return self.reply(401, {'error': 'Войдите заново'})
        if limited(self.ip(), 'save', 30, 60):
            return self.reply(429, {'error': 'Слишком часто'})
        d = self.body()
        if not d or not isinstance(d.get('save'), str) or len(d['save'].encode()) > MAX_SAVE:
            return self.reply(400, {'error': 'Неверное сохранение'})
        try:
            obj = json.loads(d['save'])
            if not isinstance(obj, dict) or obj.get('v') != 2 or not isinstance(obj.get('inv'), list) or not isinstance(obj.get('money'), (float, int)) or not math.isfinite(obj['money']) or obj['money'] < 0 or not all(isinstance(obj.get(k), dict) for k in ('st', 'up', 'set')):
                raise ValueError()
        except (ValueError, TypeError, OverflowError):
            return self.reply(400, {'error': 'Неверное сохранение'})
        st = d.get('stats') or {}
        if not isinstance(st, dict) or not isinstance(d.get('expected'), int):
            return self.reply(400, {'error': 'Неверная версия сохранения'})
        now = int(time.time() * 1000)
        with lock:
            current = db.execute('SELECT updated FROM saves WHERE uid=?', (u[0],)).fetchone()
            revision = current[0] if current else 0
            if d['expected'] != revision:
                return self.reply(409, {'error': 'В облаке более новое сохранение', 'updated': revision})
            now = max(now, revision + 1)
            db.execute('INSERT OR REPLACE INTO saves VALUES(?,?,?)', (u[0], d['save'], now))
            db.execute('INSERT OR REPLACE INTO stats VALUES(?,?,?,?,?,?,?,?,?)', (
                u[0], num(st.get('net')), num(st.get('best')), str(st.get('best_name', ''))[:120],
                int(num(st.get('opened'), hi=1e9)), int(num(st.get('battles'), hi=1e9)),
                int(num(st.get('rank'), hi=1e9)), str(st.get('rank_name', ''))[:60], now))
            db.commit()
        self.reply(200, {'updated': now})


if __name__ == '__main__':
    print(f'case-clicker API on 127.0.0.1:{PORT}, db {DB}')
    server = ThreadingHTTPServer(('127.0.0.1', PORT), H)
    server.timeout = 20
    server.serve_forever()
