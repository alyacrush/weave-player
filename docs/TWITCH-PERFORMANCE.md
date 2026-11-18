# Twitch performance on Firefox

The first experiment changes one thing in embedded mode: Weave reuses its
250 ms navigation check to clean up a removed player instead of watching
child changes throughout the entire Twitch page. The player still checks the
video container's size and restores the original controls when closed. This
removes a source of work for Weave during active chats. It has not been
measured as a fix for live Twitch stutter.

## Compare on the same live channel

Run each step for roughly 90 seconds after playback has settled. Use the same
Firefox profile, fixed resolution and frame rate, and window size. Close the
previous playback tab before starting each run.

| Run | Player | Chat | Comparison |
| --- | --- | --- | --- |
| A | Twitch | Open | Baseline |
| B | Twitch | Collapsed, or unloaded if there is an option | Effect of chat UI |
| C | Weave standalone | Closed | Playback without the full Twitch page |
| D | Weave embedded 2026.11.19.4 or 2026.11.19.5 | Open | Baseline for the embedded test |
| E | Weave embedded 2026.11.19.6 | Open | Effect of the observer change |

Repeat A or D when the result is marginal. Click the Twitch player's Advanced
> Video Stats or open Weave's statistics to get the difference in dropped
frames over the interval. Also note buffering pauses and whether the page
itself responds slowly while video plays. Compare process CPU in
`about:processes` using several readings. The process may be shared between
tabs, so treat these readings as estimates, not per-player CPU usage. Keep
profiles local unless you choose to share them.

## Decide what to change

- If B helps, try static emotes and no animated cheers or GIFs through the
  chat extension's settings before changing Weave. FrankerFaceZ already
  supports these controls. Weave could expose a separate quiet chat setting
  if a reversible implementation measurably improves the result.
- If C helps substantially but embedded mode stays slow, offer standalone
  playback as the lighter mode. Hiding a Twitch element only changes its
  appearance unless the underlying work actually stops.
- If buffering starts when Twitch low latency is enabled, compare with it
  disabled on the same stream. Weave already buffers ahead. More buffer costs
  latency and cannot fix rendering or decoding stutter.
- If dropped frames rise even in C, check Firefox's `about:support` for
  hardware decoding and graphics status, and capture a local media profile if
  needed. Codec support does not prove a specific stream used hardware decode.
- If E improves on D, repeat on another channel. The observer change has a
  clear mechanism but its CPU and frame-drop impact must be measured.

## Sources

- Firefox Process Manager: https://support.mozilla.org/en-US/kb/task-manager-tabs-or-extensions-are-slowing-firefox
- Firefox media diagnostics: https://firefox-source-docs.mozilla.org/media/Diagnostics.html
- Twitch low latency settings: https://help.twitch.tv/s/article/low-latency-video?language=en_US
- Historical CPU report, resolved: https://bugzilla.mozilla.org/show_bug.cgi?id=1941315
- Chat-related report, unconfirmed: https://bugzilla.mozilla.org/show_bug.cgi?id=2079645
- FrankerFaceZ chat settings: https://github.com/FrankerFaceZ/FrankerFaceZ/blob/master/src/modules/chat/index.js
- Streamlink's external player and HLS options: https://streamlink.github.io/cli.html
