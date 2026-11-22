# Weave Player for Twitch

This branch preserves the legacy Chrome Manifest V3 port. Chrome development and Chrome Web Store publication were discontinued on 22 November 2026. The code, build scripts and tests remain available for anyone who wants to maintain the port. Active development focuses on Firefox.

Weave is a live Twitch player for desktop Firefox 140 and later, with a Chrome Manifest V3 build. It lets you
adjust buffering and replay the part of a stream already in the buffer.

## Watch a stream

Open a live channel on Twitch. Use the controls next to **W** to choose a mode.

- **Player on Twitch** replaces the video player and keeps Twitch chat on the channel page.
- **Standalone Weave page** opens the stream on its own page. In Firefox, the chat button shows Twitch chat next to the video. In Chrome, it opens the official chat in a new tab.
- **Off** keeps the Twitch player.

## Privacy

Weave keeps settings and diagnostic reports on your device. It has no analytics
service or automatic report upload.

Weave connects to Twitch and its media servers for playback. Twitch handles
sign-in and chat. See the [privacy notes](PRIVACY.md) for details.

## Try the Firefox preview

Mozilla signed the earlier `2026.11.19.5` preview for self-distribution. If you have the
signed `.xpi`, open `about:addons`. Open the gear menu and select
**Install Add-on From File…**. Select the `.xpi`.

For development, open `about:debugging#/runtime/this-firefox`. Select
**Load Temporary Add-on…**, then select `addon/manifest.json`. Firefox removes
the temporary installation when it restarts.

## Build the legacy Chrome version

The Chrome build is unmaintained and is available from source. It has no Chrome Web Store listing.

For development, run `python scripts/build_chrome.py`, extract the ZIP from `dist/`, then open `chrome://extensions`. Enable **Developer mode**, select **Load unpacked**, and choose the extracted folder.

## Build and test

Use Python 3.12 or later and Node.js 22 or later.

```sh
python scripts/check.py
python scripts/build.py
```

The build writes an unsigned `.xpi` and its SHA-256 checksum to `dist/`.

## Report a problem

Open an [issue](https://github.com/alyacrush/weave-player/issues) with your Weave
version, browser name and version, player mode, and the steps to reproduce the problem.
Keep cookies, playback URLs, and raw logs out of issues. See the
[security reporting guide](SECURITY.md).

## Credits

Weave is an independent fork of
[Alternate Player for Twitch.tv](https://addons.mozilla.org/firefox/addon/twitch_5/)
by Alexander Choporov (CoolCmd). See the [BSD 3-Clause license](LICENSE) and
[third-party notices](THIRD_PARTY_NOTICES.md).
