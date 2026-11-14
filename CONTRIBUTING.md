# Contributing

Use one focused branch and pull request per change. Explain the observed problem,
the resulting behavior and evidence from tests. Run `python scripts/check.py`.
Playback changes need live Firefox checks in addition to synthetic fixtures.
Keep original authorship notices and record new dependencies/assets and licenses.
Do not copy GPL code into this BSD-labelled codebase without an explicit licensing
review. TTV LOL PRO is a reference project, not an included dependency.

Never commit stream tokens, cookies, proxy credentials, raw Twitch playlists,
user crash logs, real stream captures, signing keys or store API secrets.
Use synthetic inputs and placeholders. Builds are unsigned and never uploaded
or published by the current CI workflow.
