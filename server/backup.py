"""Consistent daily SQLite backup; retains 14 snapshots on the same host."""
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

source = Path('/var/lib/case-clicker/case-clicker.db')
target = Path('/var/backups/case-clicker')
target.mkdir(mode=0o700, parents=True, exist_ok=True)
backup = target / (datetime.now(timezone.utc).strftime('%Y-%m-%d') + '.db')
with sqlite3.connect(f'file:{source}?mode=ro', uri=True) as src, sqlite3.connect(backup) as dest:
    src.backup(dest)
backup.chmod(0o600)
for old in sorted(target.glob('*.db'))[:-14]:
    old.unlink()
