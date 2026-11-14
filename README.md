# Weave Player for Twitch

Independent Firefox player fork maintained by **alyacrush**, based on
**Alternate Player for Twitch.tv 2026.6.21** by **Alexander Choporov (CoolCmd)**.
Original: https://addons.mozilla.org/firefox/addon/twitch_5/

**Development preview — not a Mozilla or Chrome store release.** Not affiliated
with or endorsed by Twitch or the original author. The name is a working brand;
a preliminary search found other products using “Weave”, not a trademark clearance.

## Current scope

- Original MPEG-TS playback plus unencrypted H.264/AAC fMP4 playback.
- fMP4 initialization segments, discontinuities and TS/fMP4 transitions.
- Local, manual diagnostic export with a strict field allowlist.
- No upstream report submission or upstream version check.
- No proxy or regional-quality feature yet. No Chrome-compatible build yet.

The fMP4 checkpoint was tested by the project owner in Firefox. The new branding
and local diagnostic UI still need manual Firefox verification. Automated checks
are useful but do not establish complete Twitch/browser compatibility.

## Temporary Firefox installation

1. Disable the original extension and the earlier fMP4 test extension.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on** and choose `addon/manifest.json`.
4. Open a Twitch channel in a new tab. Do not reuse an old extension URL.

This build uses a separate ID (`weave-player@alyacrush`) and separate settings.
It is unsigned; a temporary installation lasts until the browser restarts.

## Build and check

Requirements: Python 3.12+ and Node.js 22+ (no npm dependencies for basic checks).
Run from this repository:

```sh
python scripts/check.py
python scripts/build.py
```

The build writes `dist/weave-firefox-<version>.xpi` and a SHA-256 file. ZIP entry
order, permissions and timestamps are fixed. The basic build packages the tracked
runtime files, including the inherited `wasm.wasm`; see the source-build audit
in `docs/RELEASE-BLOCKERS.md` before submitting to Mozilla.

`tests/fixtures` contains synthetic FFmpeg video/audio, not Twitch captures.
`tests/playback.cjs` is an optional Playwright/Chromium MSE test, not part of the
basic check suite; it has not passed in the restricted preparation environment.

## History and licensing

The first commit imports runtime sources from the user-supplied original XPI;
Mozilla signature files were excluded. This is **not** the upstream author's Git
history. The next commit adds the fMP4 patch, tagged
`checkpoint-fmp4-2026.11.13.1`. Git import commits were made by preparation
automation; their author field does not claim authorship of imported code.

Code: BSD-3-Clause, with original copyright retained. Third-party assets retain
their separate licenses. Read `LICENSE`, `THIRD_PARTY_NOTICES.md` and
`docs/PROVENANCE.md`.

## Development status

See `ROADMAP.md`, `docs/RELEASE-BLOCKERS.md` and `docs/TEST-MATRIX.md`.
The new privacy document is an engineering draft, not a claim of completed
store-policy compliance. Do not publish raw logs, playlist URLs or credentials
in issues. Review `SECURITY.md` before reporting sensitive problems.
