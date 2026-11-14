# Provenance

Base: Alternate Player for Twitch.tv 2026.6.21 by Alexander Choporov (CoolCmd).
Source: user-supplied signed XPI, originally linked to
https://addons.mozilla.org/firefox/addon/twitch_5/
Original archive SHA-256: `2658e9f391a922141c2602ef0feac48a30b358fbfc46e31874d0ae7b9aaabcab`.

The upstream import retains runtime bytes, license and source/wasm instructions;
META-INF signatures were excluded because they do not sign the modified build.
No original upstream Git history is claimed or reconstructed.

The fMP4 patch was developed in this conversation, tested with synthetic FFmpeg
fixtures and checked by the owner in Firefox. No TTV LOL PRO source is included.
Local Git author “Weave preparation” and the GitHub upload account identify
automated preparation, not authorship of the upstream code. GitHub commits
recreate the preparation stages on top of the repository bootstrap commit;
the original local commit history is retained in the saved checkpoint bundle.
alyacrush is the project maintainer selected by the owner.

New source is BSD-3-Clause as specified in LICENSE. Synthetic fixtures were generated
with FFmpeg lavfi testsrc2 and sine; no Twitch media or user tokens are included.
