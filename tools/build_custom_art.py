"""Regenerate vector covers from the authored catalogue: python3 tools/build_custom_art.py."""
import json, subprocess
from pathlib import Path
from html import escape
ROOT=Path(__file__).resolve().parents[1]
code="global.window=global;require('./data/cases.js');require('./js/custom-cases.js');console.log(JSON.stringify(buildCustomCases(GAME_DATA)))"
boxes=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,text=True))
shapes={
 'rarity':'<path d="m240 114 42 28-16 49h-52l-16-49Z"/><path d="m222 150 12 12 25-27" fill="none" stroke-width="5"/>',
 'weapon':'<path d="M181 140h95l27 15-10 12h-58l-15 24h-19l8-27h-28Z"/><path d="M269 143v-19h10v21M183 145h-19v13h20"/>',
 'theme':'<path d="M171 150q32-42 69 0t69 0M171 170q32-42 69 0t69 0M171 190q32-42 69 0t69 0" fill="none" stroke-width="5"/>',
 'sticker':'<circle cx="222" cy="155" r="31"/><circle cx="260" cy="171" r="29"/><path d="m210 153 9 10 18-23m13 30 8 8 13-19" fill="none" stroke-width="4"/>',
 'elite':'<circle cx="240" cy="160" r="40"/><circle cx="240" cy="160" r="13"/><path d="M240 121v26m0 26v26m-39-39h26m26 0h26m-67-27 19 18m18 18 19 18m-56 0 19-18m18-18 19-18" fill="none" stroke-width="4"/>',
}
for j,b in enumerate(boxes):
 if b['series']=='classic':continue
 color=b['color']; motif=shapes[b['series']]; label=escape(b['id'].upper().replace('-',' ')); labelsize=10 if len(label)>16 else 13
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="{color}" stop-opacity=".42"/><stop offset="1" stop-color="#111a29"/></linearGradient><radialGradient id="h"><stop stop-color="{color}" stop-opacity=".22"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></radialGradient></defs><ellipse cx="240" cy="255" rx="200" ry="80" fill="url(#h)"/><path d="m110 92 130-36 130 36 24 29v133l-154 51-154-51V121Z" fill="#111b2b" stroke="{color}" stroke-width="2"/><path d="m110 92 130 44 130-44-130-36Z" fill="url(#g)"/><path d="M105 120h270v128l-135 43-135-43Z" fill="url(#g)" stroke="{color}" stroke-opacity=".5"/><path d="m105 220 135 43 135-43M135 115v131m210-131v131" fill="none" stroke="{color}" stroke-opacity=".5"/><g stroke="{color}" fill="#111b2b" stroke-width="2">{motif}</g><path d="M166 218h148v28H166Z" fill="#0a111c" stroke="{color}" stroke-opacity=".4"/><text x="240" y="237" text-anchor="middle" fill="{color}" font-family="sans-serif" font-weight="bold" font-size="{labelsize}" letter-spacing="1">{label}</text><text x="240" y="332" text-anchor="middle" fill="{color}" font-family="sans-serif" letter-spacing="5" font-size="11">{escape(b['series'].upper())} / {j+1:02}</text></svg>'''
 (ROOT/'assets/custom'/f"{b['id']}.svg").write_text(svg)
print(f"Generated {sum(b['series']!='classic' for b in boxes)} covers")
