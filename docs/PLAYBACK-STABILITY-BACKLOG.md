# Playback memory and stability backlog

Keep findings here when a bug or workaround could affect both browser builds.
Record the test and its limits. A passing Chrome test does not complete the
Firefox check.

## Memory optimization

Weave keeps played segments for instant replay and future segments for smooth
playback. Both player modes use the same media pipeline.

1. Compare native Twitch, embedded Weave, and standalone Weave at the same
   resolution and frame rate. Run each for at least 10 minutes. Record browser
   process memory, the played and unplayed buffer durations, and memory after
   closing or restoring the player. Repeat the switch several times. Keep the
   Twitch chat and browser profile comparable when testing embedded mode.
2. Test a light memory preset in both Weave modes. Start with the existing
   30-second replay setting. Keep playback quality and the buffer ahead of the
   playhead the same. Record the tradeoff in replay length and check for stalls.
3. If high-bitrate streams still use too much memory, prototype a byte budget
   for previously played segments. Track bytes as segments enter and leave the
   media buffer. Expire the oldest played segments first. Protect the next
   segment needed for playback. Treat the budget as a limit on retained media,
   since it cannot limit the browser's decoder, GPU, or Twitch page memory.
4. Keep the preset optional until measurements show a repeatable saving.
   Check replay, quality changes, buffering recovery, and player teardown
   before offering it in a release.

## Findings to revisit in Firefox

| Finding | Chrome status | Firefox check |
| --- | --- | --- |
| A fatal error leaves downloaded media queued | Fixed on `feature/chrome-mv3`. A fixture test releases an 8 MiB queued segment and empties the queue. [Test run][release-test] | Reproduce a fatal error with queued media in both player modes. Verify the queue empties, network requests stop, and reopening playback works. |
| The embedded player can remain blank during startup | Observed in one connected Chrome profile. The host page now shows a frame startup timeout. The cause is open. [Diagnostic tests][diagnostic-test] | Check that the embedded frame mounts and starts. Exercise startup failure and restoration on the channel page. |
| Chrome denied the nested error report inside the embedded player | Fixed in the Chrome package. The encrypted-stream fixture now displays the error in the panel and in the player's report. [Diagnostic tests][diagnostic-test] | Trigger an unsupported stream in the embedded player. Confirm that the error is visible and that the native Twitch player can be restored. |
| Memory rises during playback | One live run reached 1,026 MiB across Chrome processes. The native player was at 720p and Weave at 1080p. Memory fell after restoration and did not climb across four cycles. [Live measurement][memory-test] | Run the matched memory comparison and check that the replay buffer stops growing at its configured limit. Include both modes and repeated mode switches. |

Review this list after the Chrome port passes its browser checks and before
carrying shared playback changes to the Firefox release branch. Record Firefox
results here as each case is verified.

[release-test]: https://github.com/alyacrush/weave-player/actions/runs/44944098013
[diagnostic-test]: https://github.com/alyacrush/weave-player/actions/runs/44942160620
[memory-test]: https://github.com/alyacrush/weave-player/actions/runs/44943946106
