# Release blockers and audit findings

1. **Chat/security headers:** inherited background.js removes X-Frame-Options and
   CSP headers containing frame-ancestors for Twitch chat subframes. Mozilla policy
   prohibits relaxing web-page security headers. Need a compliant chat embedding
   design and regression testing before claiming AMO readiness. Left unchanged in
   this preparation branch to avoid an untested chat breakage.
2. **Third-party resources:** retained upstream notices are evidence of declarations,
   not independent verification. Verify all asset licenses and include required
   license texts/attribution, or replace them. New manifest W icon is original SVG.
3. **Privacy:** audit all data/API flows, local persistent identifiers, logs and
   embedded chat. Select supported Firefox baseline and consent approach. The
   current draft is not a final store disclosure.
4. **Source reproducibility:** runtime wasm.wasm and compacted upstream assets
   are currently checked in. sources/wasm.wat exists; pin WABT and verify a rebuild
   of wasm before review submission. Verify provenance/build instructions for
   minified CSS/HTML as applicable. Packaging reproducibility alone is insufficient.
5. **Manual QA:** new diagnostic view, About links, new ID and settings behavior
   need Firefox verification. Clipboard, chat, replay, clips, statistics and recovery
   require the full matrix. Browser MSE automation was blocked in the preparation host.
6. **Brand/name:** Weave is already used by other products. Owner selected the more
   specific “Weave Player for Twitch”; no trademark clearance is claimed.
7. **Distribution:** unsigned temporary build only. No store account, signing,
   submission or automatic update distribution has been configured.
8. **Security reporting:** configure private reporting before opening publicly.
9. **Chrome:** MV2 is not a current Chrome release solution; MV3 port remains TODO.
10. **Historical help:** inherited help/version history still needs editorial review;
    it can contain first-person upstream claims or references to the original stores.

References (review again at submission time):
- https://extensionworkshop.com/documentation/publish/add-on-policies/
- https://extensionworkshop.com/documentation/publish/source-code-submission/
- https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline
