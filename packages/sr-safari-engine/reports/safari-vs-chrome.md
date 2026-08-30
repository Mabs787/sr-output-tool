# Safari vs Chrome Engine Experiment

Generated: 2026-08-30T01:33:57.399Z

Outcome: **transfer specific proven mechanisms**

The ownership ledger is useful, but announcement fidelity does not justify replacing the Chrome engine.

Safari engine freeze: `4d1725f`

The comparison keeps browser evidence and engine implementation separate. Reduced Safari context is not treated as inherently better than Chrome context.

## Key findings

- Safari produced trusted three-run evidence for 1 of 6 targets; Chrome produced trusted evidence for 3 of 6.
- Two complete Safari Sky runs announced two prices but omitted the Samsung £38 price, so direct VoiceOver capture does not guarantee text coverage.
- The Safari engine did not exactly match its only trusted Safari corpus; the Chrome engine also did not exactly match any trusted fresh Chrome corpus.
- Safari capture was much faster, but 5 of 22 matrix attempts failed; all 18 Chrome attempts succeeded at substantially higher median and p95 cost.
- The ownership ledger is useful, but W3C retained uncovered and duplicate candidates, while Apple retained uncovered candidates.
- No production engine, extension, permission, or public API was changed by this experiment.

## Evidence status

Trusted Safari targets: www-gov-uk-find-local-council

Candidate Safari targets: www-sky-com-shop-mobile, www-nhs-uk-service-search-pharmacy-find-a-pharmacy, www-w3-org-wai, github-com-login, www-apple-com-accessibility

Trusted Chrome targets: www-gov-uk-find-local-council, www-w3-org-wai, github-com-login

Candidate Chrome targets: www-sky-com-shop-mobile, www-nhs-uk-service-search-pharmacy-find-a-pharmacy, www-apple-com-accessibility

Safari targets pending three-run trust: none

## Evidence cost

| Browser | Attempts | Successful | Failed | Stable targets | Median job | p95 job | Manual refinement in fresh matrix |
|---|---:|---:|---:|---:|---:|---:|---|
| Safari | 22 | 17 | 5 | 1/6 | 216s | 458s | no |
| Chrome | 18 | 18 | 0 | 3/6 | 1667s | 3482s | no |

Safari canary: 1/2 successful. Historical Chrome corpus fixtures may still contain manually refined expectations; the fresh comparison matrix does not.

## Two-by-two results

| Target | Use | Engine | Corpus | Corpus status | Exact | Missing | Extra | Windows | Uncovered | Duplicates | Median ms | p95 ms |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| www-sky-com-shop-mobile | development | safari | safari | candidate | no | 60 | 208 | 1 | 0 | 0 | 466.66 | 568.367 |
| www-sky-com-shop-mobile | development | chrome | safari | candidate | no | 118 | 152 | 1 | 0 | 0 | 6928.17 | 7060.339 |
| www-sky-com-shop-mobile | development | safari | chrome | candidate | no | 150 | 262 | 2 | 0 | 0 | 349.255 | 354.897 |
| www-sky-com-shop-mobile | development | chrome | chrome | candidate | no | 19 | 19 | 3 | 0 | 0 | 1490.261 | 1577.175 |
| www-gov-uk-find-local-council | development | safari | safari | trusted | no | 44 | 52 | 8 | 0 | 0 | 29.774 | 31.009 |
| www-gov-uk-find-local-council | development | chrome | safari | trusted | no | 75 | 80 | 8 | 0 | 0 | 279.155 | 287.354 |
| www-gov-uk-find-local-council | development | safari | chrome | trusted | no | 64 | 74 | 1 | 0 | 0 | 23.7 | 25.714 |
| www-gov-uk-find-local-council | development | chrome | chrome | trusted | no | 9 | 12 | 5 | 0 | 0 | 252.921 | 277.429 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | safari | safari | candidate | no | 30 | 45 | 5 | 0 | 0 | 15.991 | 18.905 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | chrome | safari | candidate | no | 50 | 65 | 7 | 0 | 0 | 286.254 | 295.19 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | safari | chrome | candidate | no | 47 | 62 | 1 | 0 | 0 | 12.387 | 13.668 |
| www-nhs-uk-service-search-pharmacy-find-a-pharmacy | development | chrome | chrome | candidate | no | 3 | 2 | 1 | 0 | 0 | 134.181 | 136.783 |
| www-w3-org-wai | development | safari | safari | candidate | no | 94 | 54 | 6 | 2 | 1 | 30.519 | 35.331 |
| www-w3-org-wai | development | chrome | safari | candidate | no | 163 | 137 | 8 | 0 | 0 | 467.914 | 486.538 |
| www-w3-org-wai | development | safari | chrome | trusted | no | 173 | 142 | 9 | 2 | 1 | 30.683 | 33.472 |
| www-w3-org-wai | development | chrome | chrome | trusted | no | 50 | 43 | 22 | 0 | 0 | 530.099 | 536.29 |
| github-com-login | holdout | safari | safari | candidate | no | 12 | 15 | 3 | 0 | 0 | 19.359 | 23.129 |
| github-com-login | holdout | chrome | safari | candidate | no | 20 | 21 | 1 | 0 | 0 | 203.774 | 210.383 |
| github-com-login | holdout | safari | chrome | trusted | no | 20 | 23 | 1 | 0 | 0 | 10.19 | 11.075 |
| github-com-login | holdout | chrome | chrome | trusted | no | 3 | 4 | 1 | 0 | 0 | 136.41 | 139.222 |
| www-apple-com-accessibility | holdout | safari | safari | candidate | no | 170 | 583 | 3 | 18 | 0 | 198.427 | 203.893 |
| www-apple-com-accessibility | holdout | chrome | safari | candidate | no | 292 | 338 | 3 | 0 | 0 | 8573.093 | 8729.12 |
| www-apple-com-accessibility | holdout | safari | chrome | candidate | no | 312 | 689 | 8 | 18 | 0 | 179.208 | 181.216 |
| www-apple-com-accessibility | holdout | chrome | chrome | candidate | no | 82 | 45 | 3 | 0 | 0 | 2846.195 | 2870.58 |

## Interpretation rules

- Trusted/refined rows are gates; candidate rows are informational.
- Own-browser rows measure fidelity to each engine's evidence source.
- Cross-browser rows help separate engine rules from browser DOM and VoiceOver differences.
- The Safari package remains experimental and is not connected to the extension.
