"""Stamp local entrypoint assets with their content hash. Run before publishing."""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def version_assets():
    page = ROOT / 'index.html'
    source = page.read_text()
    def stamp(match):
        attr, path = match.groups()
        digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()[:12]
        return f'{attr}="{path}?v={digest}"'
    result = re.sub(r'(src|href)="((?:js|css|data)/[^"?]+)(?:\?[^"\s]*)?"', stamp, source)
    if result != source:
        page.write_text(result)
    return result != source

if __name__ == '__main__':
    print('Asset versions updated' if version_assets() else 'Asset versions current')
