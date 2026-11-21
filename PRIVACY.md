# Weave privacy notes

These notes describe the Firefox build 2026.11.21.1.

## Watching a stream

Weave contacts Twitch to get stream details and playback tokens. These requests
include the selected channel and a device identifier. The player uses the
playback tokens to request playlists and video from Twitch and its media servers.

The standalone player reads the Twitch session and device cookies for the
current Firefox profile or container. If you sign in to Twitch, some Twitch API
requests use your Twitch authentication token. Twitch also handles sign-in and
messages in the chat panel. See the [Twitch privacy notice][twitch].

## Settings and reports

Weave stores settings in Firefox. Playback logs can contain stream URLs and
tokens. Keep raw logs out of GitHub issues.

The diagnostic export saves a JSON file on your device. It contains the report
format, Weave version, Firefox version, and report category. Weave has no
analytics service or automatic report upload. The extension does not send ad
event reports.

[twitch]: https://www.twitch.tv/p/en/legal/privacy-notice/
