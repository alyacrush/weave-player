# Test evidence

| Scenario | Evidence | Status |
|---|---|---|
| fMP4 and TS parsing/worker | Node regression tests with synthetic fixtures | PASS locally |
| Format transitions/discontinuities | Actual worker in VM with WebAssembly | PASS locally |
| Returned media decodes | FFmpeg check on checkpoint output | PASS |
| Previously failing Twitch stream | Owner Firefox test of 2026.11.13.1 | PASS reported |
| Quality switching/audio/other streams | Owner report on checkpoint | PASS reported |
| Replay panel | Owner reported it appeared later | Observed, detailed seeking matrix pending |
| Local diagnostics allowlist | Automated malicious-string inputs | PASS locally |
| Deterministic XPI | Two builds, equal SHA-256 | PASS locally |
| Weave renamed build in Firefox | Not run yet | PENDING |
| Local diagnostic UI download/reload | Browser UI not run yet | PENDING |
| Network failure/recovery, end of stream | Not systematically tested | PENDING |
| Clips/timing/statistics/frame stepping | fMP4 limitations remain | PENDING |
| Browser MediaSource automation | Host denied browser launch | BLOCKED locally |
| Hosted GitHub CI | Workflow file only | PENDING |
| Chrome | Not ported | NOT SUPPORTED |
