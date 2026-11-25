# Weave privacy notes

These notes describe the Firefox build, including the optional quality-proxy experiment in 2026.11.22.1.

## Watching a stream

Weave contacts Twitch to get stream details and playback tokens. These requests
include the selected channel and a device identifier. The player uses the
playback tokens to request playlists and video from Twitch and its media servers.

The standalone player reads the Twitch session and device cookies for the
current Firefox profile or container. If you sign in to Twitch, some Twitch API
requests use your Twitch authentication token. Twitch also handles sign-in and
messages in the chat panel. See the [Twitch privacy notice][twitch].

## Optional quality proxy

The experimental quality proxy is off by default and requires Firefox's optional
proxy permission. You supply the HTTP or HTTPS proxy address. When enabled,
Weave routes its anonymous playback-token request and live master-playlist
request through that server. The token request omits Twitch OAuth and cookies
and uses a temporary device identifier. Account-restricted streams may be
unavailable in this mode. Reload open Weave players after changing the setting.

The proxy operator can see your IP address, destination domains and connection
metadata. HTTPS protects request contents between Firefox and Twitch while
normal certificate validation remains enabled. The operator's own privacy
policy applies. Video segments, chat and other Twitch API operations use their
normal route. If the selected proxy fails, playback can stop. Disable the option
and reload the player to return to your normal route.

## Settings and reports

Weave stores settings in Firefox. Playback logs can contain stream URLs and
tokens. Keep raw logs out of GitHub issues.

The diagnostic export saves a JSON file on your device. It contains the report
format, Weave version, Firefox version, and report category. Weave has no
analytics service or automatic report upload. The extension does not send ad
event reports.

[twitch]: https://www.twitch.tv/p/en/legal/privacy-notice/
