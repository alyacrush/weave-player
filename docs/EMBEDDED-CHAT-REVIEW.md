# Reviewer notes for the experimental self-distributed version 2026.11.19.4

Standalone mode embeds Twitch's native popout chat next to the video. In Twitch
page mode, the site's existing chat sits beside the Weave frame. It changes
the framing restrictions in the HTTP response for that frame. The handler in
addon/background.js requires a direct child frame of the extension's own
player.html and the exact Twitch popout chat URL pattern. It removes
X-Frame-Options and the CSP frame-ancestors directive and retains unrelated
CSP directives. It does not change the chat page's HTML or use a proxy.

We are explicitly requesting review of this behavior under Mozilla's add-on
policies before relying on it. This unsigned test build uses a separate prototype ID. Build with python3 scripts/check.py. The inherited WASM
source and its build command are in addon/sources/.
