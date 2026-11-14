# Roadmap and task register

Status: DONE = local evidence exists; REVIEW = prepared, external/manual check needed;
TODO = not implemented; BLOCKED = named dependency required.

| ID | Task | Status | Acceptance evidence / dependency |
|---|---|---|---|
| P01 | Project identity | DONE | Owner chose Weave Player for Twitch, alyacrush, private first |
| P02 | Preserve license/provenance | DONE | LICENSE and PROVENANCE.md; upstream import tag |
| P03 | Third-party asset verification | REVIEW | Inventory prepared; source verification and license texts pending |
| P04 | Git source/checkpoint history | DONE | Separate base and fMP4 commits/tags |
| P05 | Packaging and test commands | DONE | Local checks pass; repeated packages have equal SHA-256 |
| P06 | Independent metadata/icon | REVIEW | Code prepared; Firefox UI retest pending |
| P07 | Disable upstream reporting/version checks | DONE | Removed endpoints; diagnostic allowlist test passes |
| P08 | Full network and privacy audit | REVIEW | PRIVACY draft and blockers; consent work pending |
| P09 | Private GitHub repository | DONE | https://github.com/alyacrush/weave-player; base, fMP4 patch and Weave preparation published as separate commits |
| P10 | GitHub CI | DONE | [Run 43581343611](https://github.com/alyacrush/weave-player/actions/runs/43581343611): checks, reproducible packaging and artifact upload passed |
| P11 | Public release readiness | BLOCKED | Resolve licensing, CSP/chat, privacy and manual test blockers |
| P12 | Firefox stability matrix | REVIEW | Checkpoint user-tested; new development changes pending |
| P13 | Mozilla submission | BLOCKED | P11/P12, publisher setup and review |
| P14 | Chrome Manifest V3 port | TODO | Separate browser adapter and compatibility matrix |
| P15 | Proxy feasibility experiment | TODO | User-provided/approved proxy and measurable quality difference |
| P16 | Proxy implementation | BLOCKED | P15; permission/privacy/licensing decisions |
| P17 | Chrome store release | BLOCKED | P14 and release-policy checks |

Work in small commits. Keep automated, maintainer-observed and untested outcomes
separate. Retain the fMP4 checkpoint. Do not mark a task complete merely because
code or a workflow file exists. Store publication is not automated by CI.
