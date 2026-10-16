# Cloud saves

Python stdlib API + SQLite. The game remains playable offline. In Profile, register or log in, then explicitly choose upload or download. Successful selection enables autosave every minute. A revision mismatch pauses autosave and requires choosing which progress to keep. Local save before a cloud download is backed up under `caseclicker.before-cloud`. Sessions expire after 90 days; logout revokes the token. Passwords use PBKDF2-SHA256 with a per-user salt, tokens are stored as hashes on the server.

The leaderboard is casual: game progress is calculated on the client and is editable. It is not an anti-cheat system. Nicknames and submitted records are public; passwords and saves are private.

Local run: `PORT=8093 STATE_DIRECTORY=/private/tmp/case-clicker-data python3 server/server.py`, plus `python3 -m http.server 8765` at repository root. Production API: https://case-clicker.88-218-121-40.sslip.io (VPS-88).

Deployment: install `server.py` to `/opt/case-clicker/server.py`, unit to `/etc/systemd/system/case-clicker.service`, nginx config to `/etc/nginx/sites-enabled/case-clicker`; append `Caddyfile.fragment` to Restoration Control's Caddyfile only once. Validate nginx/Caddy before reloading. Enable the systemd unit and install/enable `case-clicker-backup.timer` with its service and `backup.py` in `/opt/case-clicker/`. Daily backups keep 14 snapshots in `/var/backups/case-clicker/` (same host). SQLite persists in `/var/lib/case-clicker/` and must be backed up using SQLite's backup API while running.

Tests: `python3 tests/cloud-api.py`. Creates a temporary database and process, checks authentication, persistence, revision conflicts, input validation, CORS and logout. No production users are created.
