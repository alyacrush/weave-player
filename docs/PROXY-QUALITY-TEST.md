# Proxy quality experiment

The experiment checks whether network routing changes the video quality options
that Weave receives for a live channel. It uses the existing quality menu and
requires no change to playback, Twitch credentials, or the extension package.
TTV LOL PRO documents HTTP proxy support for ad filtering. Its documentation
does not demonstrate a change in Twitch quality for this experiment.

## Run a matched comparison

1. Pick a live channel where the expected quality is missing. Use the same
   Firefox profile, Twitch account, and Weave version throughout.
2. With the alternate route off, open the stream and screenshot the complete
   quality menu. Note the time and highest resolution and frame rate offered.
3. Turn on an existing VPN or trusted proxy route for this Firefox session.
   Record its exit country if known. Reopen the same stream and capture the
   same menu while the broadcast is still live.
4. Restore the initial route and reopen the stream again. Capture the menu a
   third time. Keep the three observations close together so changes on the
   broadcaster's side are less likely to affect the comparison.

Share screenshots of the quality menu or just the offered resolutions and
frame rates. Signed playlist URLs, cookies and proxy credentials are unnecessary.

## Evaluate

- A quality that appears during the alternate route and disappears after
  restoring the initial route is a candidate routing effect. Select it and
  confirm actual playback. Repeat on another affected stream before treating
  it as a reliable outcome.
- A change in the selected quality alone does not establish a change in the
  options offered. Compare the entire menu.
- No difference is valid evidence for the tested route and broadcast.
- A whole-browser test cannot establish which request must be routed. If the
  comparison succeeds, isolate playlist routing in a separate experiment
  before deciding the scope of a proxy feature.

Status: procedure prepared. Live comparison requires an affected channel
and an existing approved route.
