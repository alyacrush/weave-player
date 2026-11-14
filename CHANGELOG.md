# Changelog

## 2026.11.14.2 — Player context menu

- Open the right-click menu below the pointer and keep it within the player.

## 2026.11.14.1 — Weave development preparation

- Independent name, maintainer metadata, ID and original W icon.
- Remove legacy HTTP crash/feedback submission; manual local allowlisted report.
- Disable upstream version checks; redirect upstream project links to local About.
- Add provenance, notices inventory, contribution guide and release blockers.
- Add deterministic packaging, checks and GitHub CI configuration.
- No change intended to the fMP4 media pipeline. New UI not yet owner-verified.

## 2026.11.13.1 — fMP4 test checkpoint

- Add unencrypted H.264/AAC fMP4, EXT-X-MAP loading and init cache.
- Preserve TS playback, reset initialization on format changes/discontinuities.
- Handle METHOD=NONE without an encryption error.
- Owner confirmed previously failing streams, quality switching and audio mode.
- Replay panel appeared after waiting; insufficient buffered history is a plausible
  explanation for the initial absence, not a log-proven root cause.

## 2026.6.21 — imported upstream base

Original Alternate Player by Alexander Choporov (CoolCmd), imported from supplied XPI.
