# Weave privacy notes

These notes describe the Firefox and Chrome builds of Weave.

## Watching a stream

Weave contacts Twitch to get stream details and playback tokens. These requests
include the selected channel and a device identifier. The player uses the
playback tokens to request playlists and video from Twitch and its media servers.

The standalone player reads the Twitch session and device cookies for the
current browser profile. Firefox containers use their own cookie store. If you sign in to Twitch, some Twitch API
requests use your Twitch authentication token. Twitch also handles sign-in and
messages in chat. Firefox can show chat inside the standalone player. Chrome opens the official chat in a separate tab. In the mode that replaces the video on Twitch, the site's chat stays on the channel page. See the [Twitch privacy notice][twitch].

## Settings and reports

Weave stores settings in your browser. Playback logs can contain stream URLs and
tokens. Keep raw logs out of GitHub issues.

The diagnostic export saves a JSON file on your device. It contains the report
format, Weave version, browser version, and report category. Weave has no
analytics service or automatic report upload. The extension does not send ad
event reports.

[twitch]: https://www.twitch.tv/p/en/legal/privacy-notice/
