# Mozilla reviewer notes — Weave Player for Twitch 2026.11.19.5

This update adds a mode that replaces only the Twitch video player on a channel's
page, alongside Twitch's existing chat. Weave also offers a standalone player page.
Use the W control on twitch.tv to select a mode and test it on a live channel.
In the embedded mode, open the player menu with right-click and select Following
to verify that it opens in a separate tab while the video stays in place.

The standalone mode embeds Twitch's native popout chat. As in 2026.11.14.8, the
handler in addon/background.js removes X-Frame-Options and the CSP frame-ancestors
directive only for the exact Twitch popout chat URL pattern in a direct child
frame of the extension's own top-level player.html. Other CSP directives are
retained. We explicitly disclose this behavior for Mozilla's review.

Playback of ordinary public streams can be tested without a Twitch account.
Chat login and chat submission follow Twitch's normal requirements.

Build with python3 scripts/build.py. Run python3 scripts/check.py for local
checks (Node.js 22 and Python 3.12). The inherited WASM source and rebuild
instructions are in addon/sources/.
