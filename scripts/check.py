from pathlib import Path
import json, subprocess, hashlib, sys, zipfile
ROOT=Path(__file__).resolve().parents[1]
def run(*args): subprocess.run(args,cwd=ROOT,check=True)
for p in (ROOT/'addon').rglob('*.json'): json.loads(p.read_text())
for p in (ROOT/'addon').glob('*.js'): run('node','--check',str(p))
for test in ['test.cjs','worker.cjs','diagnostics.cjs','autoclaim.cjs']: run('node','tests/'+test)
player=(ROOT/'addon/player.js').read_text()
assert 'report3.php' not in player
assert 'tw5/version.json' not in player
for obsolete in ('recordAdEvent', 'chrome.system.', 'WEBGL_debug_renderer_info'):
    assert obsolete not in player, obsolete
assert 'WeaveDiagnostics.createReport' in player
assert 'src=diagnostics.js' in (ROOT/'addon/player.html').read_text()
manifest=json.loads((ROOT/'addon/manifest.json').read_text())
assert manifest['author']=='alyacrush'
assert manifest['browser_specific_settings']['gecko']['id']=='weave-player@alyacrush'
run(sys.executable,'scripts/build.py')
package=ROOT/'dist'/f"weave-firefox-{manifest['version']}.xpi"
first=hashlib.sha256(package.read_bytes()).digest()
run(sys.executable,'scripts/build.py');assert hashlib.sha256(package.read_bytes()).digest()==first
with zipfile.ZipFile(package) as z:
 assert z.testzip() is None
 assert z.read('LICENSE')==(ROOT/'LICENSE').read_bytes()
 assert b'ISC License' in z.read('sources/LUCIDE-LICENSE.txt')
 assert b'The MIT License' in z.read('sources/LUCIDE-LICENSE.txt')
 assert not any(n.startswith('META-INF/') for n in z.namelist())
print('PASS: syntax, metadata, legacy endpoint removal and deterministic package')
