"""Isolated stdlib integration tests; never touches production data."""
import concurrent.futures
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request


def main():
    with tempfile.TemporaryDirectory(prefix='cc-cloud-test-') as state:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        proc = subprocess.Popen([sys.executable, str(Path(__file__).resolve().parents[1] / 'server/server.py')],
                                env={**os.environ, 'PORT': str(port), 'STATE_DIRECTORY': state}, stdout=subprocess.DEVNULL)
        def request(path, method='GET', data=None, token=None, origin='http://localhost:8765'):
            headers = {'Content-Type': 'application/json', 'Origin': origin}
            if token:
                headers['Authorization'] = 'Bearer ' + token
            req = urllib.request.Request(f'http://127.0.0.1:{port}/api/{path}',
                                         data=None if data is None else json.dumps(data).encode(), method=method, headers=headers)
            try:
                res = urllib.request.urlopen(req, timeout=5)
            except urllib.error.HTTPError as e:
                res = e
            raw = res.read()
            return res.status, json.loads(raw) if raw else {}, res.headers
        try:
            for _ in range(100):
                try:
                    assert request('health')[0] == 200
                    break
                except OSError:
                    if proc.poll() is not None:
                        raise RuntimeError('API failed to start')
                    time.sleep(.05)
            else:
                raise RuntimeError('API startup timeout')
            assert request('save')[0] == 401
            assert request('register', 'POST', [1, 2])[0] == 400
            assert request('register', 'POST', {'name':'x', 'password':'123456'})[0] == 400
            code, auth, headers = request('register', 'POST', {'name':'Test_user', 'password':'test-pass-123'})
            assert code == 200 and headers['Access-Control-Allow-Origin'] == 'http://localhost:8765'
            token = auth['token']
            assert request('register', 'POST', {'name':'test_user', 'password':'test-pass-123'})[0] == 409
            assert request('login', 'POST', {'name':'Test_user', 'password':'wrong'})[0] == 401
            second = request('login', 'POST', {'name':'Test_user', 'password':'test-pass-123'})[1]['token']
            assert request('save', token=token)[1]['save'] is None
            save = {'v':2,'money':42.5,'inv':[{'k':'AK-47 | Redline','u':1,'stickers':[None,'Sticker | test']}], 'st':{'opened':10},'up':{},'set':{}}
            payload = {'save':json.dumps(save), 'stats':{'net':100,'best':50,'opened':10,'battles':2,'rank':3,'rank_name':'Silver III'}, 'expected':0}
            revision = request('save','PUT',payload,token)[1]['updated']
            assert request('save','PUT',payload,second)[0] == 409
            loaded = request('save',token=second)[1]
            assert loaded['updated'] == revision and json.loads(loaded['save']) == save
            payload['expected'] = revision
            with concurrent.futures.ThreadPoolExecutor(2) as pool:
                codes = list(pool.map(lambda t:request('save','PUT',payload,t)[0], [token, second]))
            assert sorted(codes) == [200,409], codes
            for by in ['net','best','opened','battles','rank']:
                board = request('top?by='+by,token=token)[1]
                assert board['rows'][0]['name'] == 'Test_user' and board['me']['place'] == 1
            assert request('top?by=invalid')[0] == 200
            for bad in [[], {'save':'[]','expected':0}, {'save':json.dumps(save),'expected':'old'}, {'save':json.dumps({**save,'money':float('nan')}),'expected':0}]:
                assert request('save','PUT',bad,token)[0] == 400
            assert request('health',origin='https://untrusted.example')[2].get('Access-Control-Allow-Origin') is None
            assert request('save','OPTIONS')[0] == 204
            assert request('logout','POST',token=token)[0] == 200
            assert request('save',token=token)[0] == 401
            assert request('save',token=second)[0] == 200
            # A process restart must preserve the saved progress and sessions.
            proc.terminate(); proc.wait(timeout=5)
            proc = subprocess.Popen([sys.executable, str(Path(__file__).resolve().parents[1] / 'server/server.py')],env={**os.environ,'PORT':str(port),'STATE_DIRECTORY':state},stdout=subprocess.DEVNULL)
            for _ in range(100):
                try:
                    assert json.loads(request('save',token=second)[1]['save']) == save
                    break
                except OSError:
                    time.sleep(.05)
            else:
                raise RuntimeError('API restart timeout')
            print('PASS: cloud auth, private saves, persistence, concurrent revision conflicts, boards, validation, CORS, logout')
        finally:
            proc.terminate(); proc.wait(timeout=5)


if __name__ == '__main__':
    main()
