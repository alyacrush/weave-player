# Firefox self-distribution signing candidate

Version 2026.11.14.6 on the firefox-signing branch. Keep the existing Gecko
ID weave-player@alyacrush. Build with python3 scripts/check.py.
The resulting XPI is an unsigned candidate. Mozilla supplies the signature.

Changes relative to 2026.11.14.4:
- Chat opens on Twitch in a separate tab. Follow and notification changes are
  handled on the Twitch channel page.
- Remove the response header override and hidden integrity-token iframe.
- Use HTTPS for network downloads and copied playlist URLs.
- Remove periodic minute-watched reporting. Do not expect the same behavior
  for rewards or features dependent on this reporting.
- Target desktop Firefox 140+ and declare install-time data categories.

The candidate continues to access Twitch authentication cookies and uses Twitch's
GraphQL and CDN services for playback, metadata and inherited ad-related requests.
Channel activity, content/request data, Twitch account ID and authentication
information are involved. Manual diagnostic export stays local.

Before submission check live playback, quality changes, replay, chat button and
login behavior in Firefox. Review the declared data categories against the actual
traffic, check inherited assets and prepare source instructions for the reviewer.
Include addon/sources/wasm.wat and its build instructions with the source package.

Submit as self-distributed in Mozilla's Developer Hub using the maintainer's
Mozilla account. Select “On your own”, upload the tested XPI and provide
the corresponding source and reviewer notes. Download the Mozilla-signed XPI
after validation. Verify installation in ordinary Firefox through about:addons,
gear menu, Install Add-on From File, with no temporary instance installed.

- https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
- https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
- https://extensionworkshop.com/documentation/publish/add-on-policies/
