"""Render card voices from reviewed recordings. Requires ffmpeg on PATH or FFMPEG.

Sources and per-card design choices are in public/audio/beast-voices/manifest.json.
This script never downloads media or changes battle results.
"""
import array
import json
import html
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/audio/beast-voices'
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')

def run(args):
    return subprocess.run([FFMPEG, '-v', 'error', *args], check=True, capture_output=True).stdout

def build():
    manifest = json.loads((BASE / 'manifest.json').read_text(encoding='utf-8'))
    starts = {}
    for key, source in manifest['sources'].items():
        path = BASE / source['file']
        raw = run(['-i', str(path), '-t', '60', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'])
        samples = array.array('f', raw)
        # Find the strongest sustained call, rather than keeping leading silence.
        energies = [sum(x*x for x in samples[i:i+1600]) for i in range(0, len(samples), 1600)]
        width = min(16, len(energies))
        best = max(range(max(1, len(energies)-width+1)), key=lambda i: sum(energies[i:i+width]))
        starts[key] = max(0, best * .1 - .08)
    for card_id, card in manifest['cards'].items():
        source = manifest['sources'][card['source']]
        rate = card['pitch']
        filters = (f'aresample=44100,asetrate=44100*{rate},aresample=44100,highpass=f=65,lowpass=f=7500,'
                   'loudnorm=I=-20:TP=-3:LRA=7,'
                   f'aecho=0.8:0.65:{card["echoMs"]}:0.12,'
                   'atrim=duration=2.2,afade=t=in:d=0.025,afade=t=out:st=1.95:d=0.25')
        run(['-y', '-ss', str(starts[card['source']]), '-i', str(BASE/source['file']),
             '-t', '2.5', '-ac', '1', '-ar', '44100', '-af', filters,
             '-codec:a', 'libmp3lame', '-b:a', '80k', str(BASE/f'{card_id}.mp3')])
        card['clipStartSeconds'] = round(starts[card['source']], 2)
    (BASE/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    credits = ['# 神獸卡片聲音來源', '',
               '成品經剪輯、音高調整、響度整理與輕微回聲加工。神話角色的聲音屬設計音，並非真實神獸錄音。',
               '每個來源及其對應成品保留以下授權；CC BY-SA 的改作聲音以原版本相同授權提供。', '',
               '| 底材 | 作者 | 授權 | 原始來源 |', '|---|---|---|---|']
    rows=[]
    for key, source in manifest['sources'].items():
        title, author, url = source['title'], source['author'], source['sourceUrl']
        license = f'[{source["license"]}]({source["licenseUrl"]})' if source['licenseUrl'] else source['license']
        credits.append(f'| {key}: {title} | {author} | {license} | [來源]({url}) |')
        rows.append('<tr>'+''.join('<td>'+html.escape(str(v))+'</td>' for v in [key+': '+title,author])+f'<td><a href="{html.escape(source["licenseUrl"])}">{html.escape(source["license"])}</a></td><td><a href="{html.escape(url)}">來源</a></td></tr>')
    credits += ['', '## 六十張卡片對照', '', '| 卡片 | 本體 | 底材 | 設計 |', '|---|---|---|---|']
    cardrows=[]
    for card_id, card in manifest['cards'].items():
        credits.append(f'| {card_id} | {card["name"]} | {card["source"]} | {card["design"]} |')
        cardrows.append('<tr>'+''.join('<td>'+html.escape(str(v))+'</td>' for v in [card['name'],card['source'],card['design']])+'</tr>')
    (BASE/'CREDITS.md').write_text('\n'.join(credits)+'\n',encoding='utf-8')
    (BASE/'credits.html').write_text('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>神獸卡片聲音來源</title><style>body{background:#101827;color:#eee;font:16px/1.7 system-ui;margin:auto;padding:24px;max-width:1100px}a{color:#f5d88a}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:8px;border-bottom:1px solid #334155;text-align:left}section{overflow:auto}</style><h1>神獸卡片聲音來源</h1><p>成品經剪輯、音高調整、響度整理與輕微回聲加工。神話角色的聲音屬設計音，並非真實神獸錄音。CC BY-SA 的改作聲音保留原版本相同授權。</p><section><table><tr><th>底材</th><th>作者</th><th>授權</th><th>來源</th></tr>'+''.join(rows)+'</table></section><h2>卡片本體配音</h2><section><table><tr><th>卡片</th><th>底材</th><th>設計</th></tr>'+''.join(cardrows)+'</table></section></html>',encoding='utf-8')
    print(f'Rendered {len(manifest["cards"])} card voices')

if __name__ == '__main__':
    build()
