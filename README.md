# Weave Player for Twitch

<img src="assets/weave-mozilla-icon.png" alt="Weave logo" width="80" height="80">

Weave is a live Twitch player for desktop Firefox 140 and later. It lets you
adjust buffering and replay the part of a stream already in the buffer.

[Install from Firefox Add-ons](https://addons.mozilla.org/firefox/addon/weave-player-for-twitch/)

Available in English and Russian. Requires desktop Firefox 140 or later.

## Watch a stream

Open a live channel on Twitch. Use the mode controls next to **W**, or right-click
**W** to cycle through the modes. On a live channel, left-click **W** to launch
the selected mode. In **Off** mode, Twitch keeps its own player.

- **Player on Twitch** replaces the video player and keeps Twitch chat on the channel page.
- **Standalone Weave page** opens the stream on its own page. Use the chat button to show Twitch chat next to the video.
- **Off** keeps the Twitch player.

## Privacy

Weave keeps settings and diagnostic reports on your device. It has no analytics
service or automatic report upload.

Weave connects to Twitch and its media servers for playback. Twitch handles
sign-in and chat. Automatic Channel Points bonus claims are optional and off by
default. See the [privacy notes](PRIVACY.md) for details.

## Development installation

For development, open `about:debugging#/runtime/this-firefox`. Select
**Load Temporary Add-on…**, then select `addon/manifest.json`. Firefox removes
the temporary installation when it restarts.

## Build and test

Use Python 3.12 or later and Node.js 22 or later.

```sh
python scripts/check.py
python scripts/build.py
```

The build writes an unsigned `.xpi` and its SHA-256 checksum to `dist/`.

## Repository layout

- `addon/` contains the Firefox extension and its bundled source and license files.
- `scripts/` builds and checks the extension.
- `tests/` contains regression tests and synthetic media fixtures.
- `assets/` contains the Mozilla listing icon.
- `docs/PROVENANCE.md` records the origin of the code.

Chrome development and store publication ended on 22 November 2026. The
[legacy Chrome branch](https://github.com/alyacrush/weave-player/tree/legacy/chrome-mv3)
preserves its source, build scripts and tests. Firefox is the maintained version.

## Report a problem

Open an [issue](https://github.com/alyacrush/weave-player/issues) with your Weave
version, Firefox version, player mode, and the steps to reproduce the problem.
Keep cookies, playback URLs, and raw logs out of issues. See the
[security reporting guide](SECURITY.md).

## Credits

Weave is an independent fork of
[Alternate Player for Twitch.tv](https://addons.mozilla.org/firefox/addon/twitch_5/)
by Alexander Choporov (CoolCmd). See the [BSD 3-Clause license](LICENSE) and
[third-party notices](THIRD_PARTY_NOTICES.md).
