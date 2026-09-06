"""Package the sixty reviewed-for-decoding voice candidates; never imply listening approval."""
import hashlib
import json
from pathlib import Path
import wave
import zipfile
import sys

root = Path(__file__).resolve().parent.parent
mutual = '--mutual' in sys.argv
summary_file = root / ('reports/beast-production/audio-summary-mutual.json' if mutual else 'reports/beast-production/audio-summary.json')
summary = json.loads(summary_file.read_text(encoding='utf-8'))
assert len(summary['rows']) == 60
target = root / ('reports/beast-production/audio-candidates-mutual-v2.zip' if mutual else 'reports/beast-production/audio-candidates.zip')
temporary = target.with_suffix('.zip.tmp')
with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as package:
    package.writestr('README.txt', 'Six-second PLAYER voice candidates. Technical decoding checks passed; listening, species expression, bite timing and audiovisual review remain pending. These are not approved battle movies. Each folder includes source, license, hashes and the reproducible audio recipe.\n')
    package.write(summary_file, summary_file.name)
    for row in summary['rows']:
        folder = root / '.tmp/beast-production' / row['cardId'] / 'voice'
        audio = folder / ('player-six-second-v2.wav' if mutual else 'player-six-second.wav')
        assert hashlib.sha256(audio.read_bytes()).hexdigest() == row['outputSha256']
        with wave.open(str(audio)) as sound:
            assert sound.getnframes() / sound.getframerate() == 6
        for name in ([audio.name, 'provenance-v2.json'] if mutual else [audio.name, 'provenance.json']):
            package.write(folder / name, f"{row['cardId']}/{name}")
with zipfile.ZipFile(temporary) as package:
    assert package.testzip() is None
    assert sum(name.endswith('.wav') for name in package.namelist()) == 60
temporary.replace(target)
print(f'Packaged sixty six-second audio candidates: {target} ({target.stat().st_size:,} bytes). Audiovisual approval: 0/60.')
