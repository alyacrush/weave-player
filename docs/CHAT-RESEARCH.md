# Embedded chat investigation — 2026-11-14

Status: owner reports embedded chat works (2026-11-14); exact probe mode and
header observations not yet supplied. Do not infer all three modes passed or
that production header interception can already be removed.
The owner prefers retaining chat beside the player. No production playback or chat
code was changed by this investigation. Store readiness is NOT established.

## Findings in this repository

- `addon/background.js` removes X-Frame-Options and the ENTIRE CSP header when it
  contains frame-ancestors. It covers chat URLs and `/popout/`.
- `ПолучитьАдресПанелиЧата` in player.js uses popout or embed with parent=localhost,
  although the actual top-level page uses moz-extension. This is not a documented
  match for Twitch's parent parameter.
- `получитьТокенGql` loads `/popout/` in a hidden frame to obtain an integrity token.
  Removing header interception may therefore affect authenticated operations or
  playback, not just visible chat. Must test cold/expired-token paths.
- Player startup returns immediately when window.top !== window. Embedding our
  existing player on Twitch is not a one-line change. Its background XHR hook also
  currently accepts only top-level requests. An integration needs a browser/API
  boundary, lifecycle handling and a security review of any messaging interface.

## External evidence and limits

Twitch documents chat embedding on web domains with an accurate parent parameter
and requires SSL on embed domains. It does not document moz-extension as a
supported parent in the pages reviewed. Absence of documentation is not proof of
impossibility. CSP frame-ancestors checks every ancestor, so adding an HTTPS wrapper
inside the extension does not by itself resolve an incompatible ancestor.
Old Firefox bugs describe historical XFO exceptions; they are not evidence that
current Firefox accepts Twitch's current CSP. W3C issue 483 remains a proposal,
not a shipping cross-browser embedding API.

A direct HEAD request from the execution environment returned an envoy 403.
This is NOT evidence of Twitch's own response headers or embedding behavior.
No live chat, login or message sending has been verified here.

## Candidate paths

1. First run the isolated probe below without header-changing extensions. If an
   iframe works, verify actual rendered chat, login state, input availability,
   channel switching and raid navigation before selecting it. Then test a separate
   Weave build without interception, including token refresh and playback.
2. If direct embedding fails: prototype Weave video on the Twitch channel page,
   alongside its existing native chat. This is the preferred architectural research
   fallback, NOT an implemented or proven solution. Keep tokens out of page-visible
   DOM and postMessage, stop the original video cleanly, handle SPA navigation,
   and check fullscreen/autoplay and extension API availability.
3. A custom chat UI using Twitch's supported chat APIs is a larger independent
   project requiring authentication, scopes, moderation/emotes and parity decisions.
   It is not a quick replacement for the native chat.
4. Separate popout window remains a fallback only; the owner has not selected it.

Do not proxy/rewrite Twitch HTML, spoof parent origins or remove CSP to claim this
blocker is resolved. No external hosting/domain is required for the first test.

## Isolated Firefox probe

Source: `experiments/chat-probe/`. Separate ID; it does not replace Weave.
It observes only CSP/XFO on iframe requests in its own probe tab. Records stay in
background memory, capped at 20; closing the tab clears them. No cookie values,
request headers, message contents or URL queries are recorded. It does not send
chat messages or alter response headers. Opening chat contacts Twitch normally.

1. Download the repository ZIP from GitHub (Code → Download ZIP) and extract it.
2. Temporarily disable Weave, Alternate Player and other extensions that modify
   Twitch; otherwise their header rewriting can produce a false success.
3. Firefox: about:debugging → This Firefox → Load Temporary Add-on → select
   `experiments/chat-probe/manifest.json`.
4. Click the probe toolbar button (possibly inside the extensions menu).
5. Enter a channel with an active chat. Try each mode separately: popout, embed
   with the extension hostname, then localhost as a negative/legacy control.
6. For each mode wait for the frame to settle, note visible chat/messages/input,
   then click Show diagnostics. A document-ready record or iframe load alone is
   NOT proof that chat works. Record Firefox version and whether logged into Twitch.
7. If blocked, copy only the relevant CSP/XFO console error (avoid cookies/tokens).
   Reports can include the channel path and extension UUID; redact if desired.
8. Remove the temporary probe and re-enable the working extension afterwards.

Pass criterion: functional native chat with intact response headers, then successful
real Weave playback/token-refresh regression. Probe success alone is insufficient.

Automated probe check: `node experiments/chat-probe/test.cjs`.
This verifies the read-only observer and message routing, not browser rendering.

## Primary sources

- https://dev.twitch.tv/docs/embed/chat/
- https://dev.twitch.tv/docs/embed/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- https://extensionworkshop.com/documentation/publish/add-on-policies/
- https://github.com/w3c/webextensions/issues/483
- https://bugzilla.mozilla.org/show_bug.cgi?id=1595652 (historical only)
- https://bugzilla.mozilla.org/show_bug.cgi?id=1619338 (historical only)
