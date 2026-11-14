# Data handling — development draft

Maintainer: alyacrush. Status: incomplete audit, not yet store-submission ready.

The player requests Twitch APIs, authentication/integrity information and media
playlists/segments required for playback. The embedded chat loads Twitch content
and can use the browser's Twitch session. Treat Twitch and media CDN traffic as
third-party data processing; this project does not claim zero data transmission.

Settings are stored in extension storage. The inherited runtime can keep detailed
logs, playlist URLs and playback tokens in memory for debugging. Do not copy these
raw values into issues. Storage fields and retention still need a complete audit.

Upstream crash/feedback upload and upstream version checks have been disabled.
There is no new maintainer telemetry endpoint. Manual diagnostic export creates a
local JSON file containing only schema, extension version, Firefox version and
report category. It does not include channel, URLs, tokens, logs, email or media.
The extension does not submit this file; users decide whether to share it.

No proxy functionality exists in this version. Adding a proxy will require a new
network/data review and appropriate disclosure/control. Before store submission,
complete the API/domain inventory, classification and consent implementation.
