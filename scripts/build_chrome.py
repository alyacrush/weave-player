"""Package the shared Weave extension as a Chrome Manifest V3 ZIP."""

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]


def build():
    addon = ROOT / "addon"
    manifest = json.loads((addon / "manifest.json").read_text(encoding="utf-8"))
    manifest.pop("browser_specific_settings")
    manifest["manifest_version"] = 3
    manifest["icons"] = {"128": "weave-chrome-icon.png"}
    manifest["background"] = {"service_worker": "background.js"}
    permissions = manifest["permissions"]
    manifest["host_permissions"] = [
        permission for permission in permissions if permission.startswith("https://")
    ]
    manifest["permissions"] = [
        permission for permission in permissions
        if permission not in {"webRequest", "webRequestBlocking"}
        and permission not in manifest["host_permissions"]
    ]
    # The bundled player worker compiles the packaged WebAssembly module.
    manifest["content_security_policy"] = {
        "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'none'"
    }
    manifest["web_accessible_resources"] = [{
        "resources": manifest["web_accessible_resources"],
        "matches": ["https://www.twitch.tv/*", "https://m.twitch.tv/*"],
    }]
    out = ROOT / "dist" / f"weave-chrome-{manifest['version']}.zip"
    out.parent.mkdir(exist_ok=True)
    with ZipFile(out, "w", compression=ZIP_DEFLATED) as archive:
        for path in sorted(addon.rglob("*")):
            if not path.is_file():
                continue
            name = path.relative_to(addon).as_posix()
            info = ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.external_attr = 0o100644 << 16
            content = path.read_bytes()
            if name == "manifest.json":
                content = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
            archive.writestr(info, content, compress_type=ZIP_DEFLATED)
        icon = ZipInfo("weave-chrome-icon.png", (2026, 1, 1, 0, 0, 0))
        icon.external_attr = 0o100644 << 16
        archive.writestr(icon, (ROOT / "assets/weave-mozilla-icon.png").read_bytes(), compress_type=ZIP_DEFLATED)
    print(out)


if __name__ == "__main__":
    build()
