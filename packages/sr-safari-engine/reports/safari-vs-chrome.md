# Safari vs Chrome Engine Experiment

Generated: 2026-08-29T22:19:35.150Z

Outcome: **continue the independent Safari engine**

Evidence collection is incomplete for 6 target(s); no production conclusion is warranted yet.

The comparison keeps browser evidence and engine implementation separate. Reduced Safari context is not treated as inherently better than Chrome context.

## Evidence status

Safari targets pending three-run trust: www-sky-com-shop-mobile, www-gov-uk-find-local-council, www-nhs-uk-service-search-pharmacy-find-a-pharmacy, www-w3-org-wai, github-com-login, www-apple-com-accessibility

## Two-by-two results

| Target | Use | Engine | Corpus | Corpus status | Exact | Missing | Extra | Windows | Uncovered | Duplicates | Median ms | p95 ms |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| www-sky-com-shop-mobile | development | safari | chrome | candidate | no | 76 | 176 | 3 | 0 | 0 | 314.363 | 383.276 |
| www-sky-com-shop-mobile | development | chrome | chrome | candidate | no | 14 | 14 | 3 | 0 | 0 | 1389.971 | 1446.628 |
| www-gov-uk-find-local-council | development | safari | chrome | refined | no | 23 | 18 | 2 | 0 | 0 | 20.065 | 23.022 |
| www-gov-uk-find-local-council | development | chrome | chrome | refined | yes | 0 | 0 | 0 | 0 | 0 | 244.52 | 256.678 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | safari | chrome | refined | no | 25 | 32 | 2 | 0 | 0 | 10.508 | 11.726 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | chrome | chrome | refined | yes | 0 | 0 | 0 | 0 | 0 | 132.168 | 137.973 |
| www-w3-org-wai | development | safari | chrome | refined | no | 107 | 38 | 1 | 2 | 1 | 25.067 | 27.716 |
| www-w3-org-wai | development | chrome | chrome | refined | yes | 0 | 0 | 0 | 0 | 0 | 572.188 | 612.74 |
| github-com-login | holdout | safari | chrome | candidate | no | 16 | 12 | 1 | 0 | 0 | 9.779 | 12.19 |
| github-com-login | holdout | chrome | chrome | candidate | no | 2 | 3 | 1 | 0 | 0 | 128.958 | 139.921 |
| www-apple-com-accessibility | holdout | safari | chrome | candidate | no | 207 | 515 | 5 | 18 | 0 | 158.454 | 162.952 |
| www-apple-com-accessibility | holdout | chrome | chrome | candidate | no | 40 | 10 | 2 | 0 | 0 | 2732.658 | 2754.566 |

## Interpretation rules

- Trusted/refined rows are gates; candidate rows are informational.
- Own-browser rows measure fidelity to each engine's evidence source.
- Cross-browser rows help separate engine rules from browser DOM and VoiceOver differences.
- The Safari package remains experimental and is not connected to the extension.
