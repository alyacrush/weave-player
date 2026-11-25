# Firefox quality proxy experiment

Version 2026.11.22.1 introduces an optional proxy for Weave's playback-token
and live master-playlist requests. The feature is off by default. It requires
your own HTTP or HTTPS proxy address and Firefox's optional proxy permission.
The server must permit this use. The experiment bundles no public proxy service.

Open the player settings, select Additional features, then Quality proxy
(experimental). Enter an address such as `http://proxy.example:3128`, enable
the option and save. Reload open Weave players after changing these settings.
Authenticated proxy servers are outside the scope of this prototype.

The proxy operator sees your IP address, destination domains and connection
metadata. HTTPS protects request contents with normal certificate validation.
The routed playback-token request omits Twitch OAuth, cookies and the permanent
device identifier. Account-restricted streams may be unavailable in this mode.

Video segments, chat and other Twitch API requests keep their normal route.
If the proxy fails, playback can stop. Disable the option and reload Weave to
return to the normal route. A saved address confirms configuration only.

The prototype requests H.264 variants. A proxy does not add HEVC/1440p support.
Availability of 1080p depends on the stream and the proxy's actual exit region.
Compare the complete quality menu and actual video resolution on the same
live channel with the feature off and on. The routing tests use a local proxy
and do not demonstrate recovery of region-restricted quality.

See [the research and experiment matrix](PROXY-QUALITY-TEST.md) for the remaining
checks, including an affected original region, two live channels, multiple
players, containers and server failures.
