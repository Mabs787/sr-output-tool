# Safari vs Chrome Engine Experiment

Generated: 2026-08-29T23:05:01.648Z

Outcome: **continue the independent Safari engine**

Evidence collection is incomplete for 2 target(s); no production conclusion is warranted yet.

The comparison keeps browser evidence and engine implementation separate. Reduced Safari context is not treated as inherently better than Chrome context.

## Evidence status

Trusted Safari targets: www-gov-uk-find-local-council

Candidate Safari targets: www-sky-com-shop-mobile, www-nhs-uk-service-search-pharmacy-find-a-pharmacy, www-w3-org-wai

Safari targets pending three-run trust: github-com-login, www-apple-com-accessibility

## Two-by-two results

| Target | Use | Engine | Corpus | Corpus status | Exact | Missing | Extra | Windows | Uncovered | Duplicates | Median ms | p95 ms |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| www-sky-com-shop-mobile | development | safari | safari | candidate | no | 60 | 208 | 1 | 0 | 0 | 468.567 | 567.438 |
| www-sky-com-shop-mobile | development | chrome | safari | candidate | no | 118 | 152 | 1 | 0 | 0 | 6822.544 | 6873.553 |
| www-sky-com-shop-mobile | development | safari | chrome | candidate | no | 137 | 269 | 2 | 0 | 0 | 304.816 | 307.516 |
| www-sky-com-shop-mobile | development | chrome | chrome | candidate | no | 14 | 14 | 3 | 0 | 0 | 1468.303 | 1495.482 |
| www-gov-uk-find-local-council | development | safari | safari | trusted | no | 44 | 52 | 8 | 0 | 0 | 27.399 | 32.453 |
| www-gov-uk-find-local-council | development | chrome | safari | trusted | no | 75 | 80 | 8 | 0 | 0 | 277.589 | 285.742 |
| www-gov-uk-find-local-council | development | safari | chrome | refined | no | 64 | 74 | 1 | 0 | 0 | 22.227 | 25.951 |
| www-gov-uk-find-local-council | development | chrome | chrome | refined | yes | 0 | 0 | 0 | 0 | 0 | 261.194 | 268.789 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | safari | safari | candidate | no | 30 | 45 | 5 | 0 | 0 | 16.719 | 18.566 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | chrome | safari | candidate | no | 50 | 65 | 7 | 0 | 0 | 289.216 | 304.765 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | safari | chrome | refined | no | 46 | 64 | 3 | 0 | 0 | 12.469 | 15.595 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | chrome | chrome | refined | yes | 0 | 0 | 0 | 0 | 0 | 146.167 | 148.566 |
| www-w3-org-wai | development | safari | safari | candidate | no | 94 | 54 | 6 | 2 | 1 | 32.209 | 34.717 |
| www-w3-org-wai | development | chrome | safari | candidate | no | 163 | 137 | 8 | 0 | 0 | 471.877 | 474.118 |
| www-w3-org-wai | development | safari | chrome | refined | no | 175 | 141 | 10 | 2 | 1 | 30.438 | 33.172 |
| www-w3-org-wai | development | chrome | chrome | refined | yes | 0 | 0 | 0 | 0 | 0 | 623.653 | 638.443 |
| github-com-login | holdout | safari | chrome | candidate | no | 20 | 23 | 1 | 0 | 0 | 11.571 | 12.902 |
| github-com-login | holdout | chrome | chrome | candidate | no | 2 | 3 | 1 | 0 | 0 | 141.118 | 147.007 |
| www-apple-com-accessibility | holdout | safari | chrome | candidate | no | 310 | 659 | 8 | 18 | 0 | 171.379 | 176.295 |
| www-apple-com-accessibility | holdout | chrome | chrome | candidate | no | 40 | 10 | 2 | 0 | 0 | 2970.385 | 3089.853 |

## Interpretation rules

- Trusted/refined rows are gates; candidate rows are informational.
- Own-browser rows measure fidelity to each engine's evidence source.
- Cross-browser rows help separate engine rules from browser DOM and VoiceOver differences.
- The Safari package remains experimental and is not connected to the extension.
