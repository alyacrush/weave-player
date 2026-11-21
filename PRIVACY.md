# Weave privacy notes

These notes describe the Firefox build 2026.11.19.5.

## Watching a stream

Weave sends the channel name and a device identifier to Twitch. It requests
stream details and playback tokens from Twitch. The player uses these tokens to
get playlists and video from Twitch and its media servers. Weave sends ad
playback events to Twitch when a playlist contains the data for those events.

The standalone player reads Twitch cookies from the current Firefox profile.
If you are signed in to Twitch, some Twitch API requests use your Twitch
authentication token. The Twitch chat panel uses the Twitch session in your
browser. Twitch handles chat messages under its [privacy policy][twitch].

## Settings and reports

Weave stores its settings in Firefox. The player can keep temporary playback
logs that contain URLs and tokens. Keep raw playback logs out of GitHub issues.

The diagnostic export saves a JSON file on your device. It contains the report
format, Weave version, browser version, and report category. Weave has no
maintainer telemetry or report upload service.

[twitch]: https://www.twitch.tv/p/en/legal/privacy-notice/
