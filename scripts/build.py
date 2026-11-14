"""Deterministic packaging of the checked-in extension; no network or signing."""
from pathlib import Path
import json, zipfile, hashlib
ROOT = Path(__file__).resolve().parents[1]
def build():
    addon = ROOT / 'addon'
    version = json.loads((addon / 'manifest.json').read_text())['version']
    out = ROOT / 'dist'; out.mkdir(exist_ok=True)
    target = out / f'weave-firefox-{version}.xpi'
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_STORED) as z:
        for p in sorted(addon.rglob('*')):
            if not p.is_file(): continue
            name = p.relative_to(addon).as_posix()
            if name.startswith('META-INF/') or '..' in p.relative_to(addon).parts:
                raise ValueError('Unexpected package member: ' + name)
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.external_attr = 0o100644 << 16
            z.writestr(info, p.read_bytes())
    (out / (target.name + '.sha256')).write_text(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + target.name + '\n')
    print(target)
    return target
if __name__ == '__main__': build()
