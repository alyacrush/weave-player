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

## Firefox checks

`python scripts/check.py` checks JavaScript syntax, English/Russian translations,
playlist parsing, worker format transitions, diagnostics, channel points and
reproducible packaging. The workflow also runs navigation and fMP4 playback tests
in Firefox with Playwright.

For browser tests, install Playwright 1.62.1 and its Firefox browser in a separate
directory. Set `PLAYWRIGHT_MODULE` to the absolute path of the installed
`playwright` package, then run from this repository

```sh
node tests/player-navigation.cjs
WEAVE_TEST_BROWSER=firefox node tests/playback.cjs
```

Before submitting a playback change, check a live stream in both player modes.
Verify quality and audio changes, replay, chat, resizing, fullscreen, middle-click
mute and links opened from the player menu. Automated fixtures cover only part of
this behavior.

## Paused experiments

The proxy prototype and its research remain in the draft
[Firefox quality proxy PR](https://github.com/alyacrush/weave-player/pull/2).
Resume that work separately from Firefox maintenance.
