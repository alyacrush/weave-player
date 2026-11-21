# Mozilla review notes — Weave Player for Twitch 2026.11.21.1

Open a live Twitch channel in desktop Firefox 140 or later. Use the W control
on Twitch to select a mode. Both modes are in the release. Ordinary public
streams play without a Twitch account.

- **Player on Twitch** replaces the video player on the channel page. The
  page keeps its existing Twitch chat. Right-click Weave and select Following
  to verify that the link opens in a new tab.
- **Standalone Weave page** shows the video on a separate extension page.
  Use the chat button to open Twitch's official popout chat beside the video.
  Chat sign-in and messaging follow Twitch's normal requirements.

For the standalone chat only, `addon/background.js` removes
`X-Frame-Options` and the `frame-ancestors` CSP directive. The handler
requires a matching Twitch popout chat URL in a direct child frame of the
extension's own top-level player page. Other CSP directives are preserved.
This is the same handler disclosed with unlisted version 2026.11.19.5.

This version removes ad event reports and automatic channel points clicks.
The report button exports a minimal local JSON file. See `PRIVACY.md` for
Twitch requests and local storage.

Build with `python3 scripts/build.py`. Run `python3 scripts/check.py` with
Node.js 22 and Python 3.12. The WebAssembly source and rebuild instructions
are in `addon/sources/`.
