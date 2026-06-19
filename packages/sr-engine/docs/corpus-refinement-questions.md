# Corpus Refinement Questions

These are the remaining open questions blocking candidate VoiceOver fixtures
from becoming exact or partial engine gates.

When answering, use:

- `keep VO`: captured VoiceOver output is correct.
- `refine expected`: stored expected output is capture/OCR/caption noise.
- `fix engine`: rebuilt engine output is wrong.
- `skip/partial`: fixture is too ambiguous, or only part of it should gate.

## Runner Context

Treat runner output as a US, `en-US`, UTC, 980px-wide Chrome page state unless a
newer fixture-specific `runner-environment.json` says otherwise.

UK-local manual checks can differ because of geo, locale, timezone, cookie
state, responsive breakpoint, or personalization.

When final `rendered-html.html` disagrees with VoiceOver output, check the
nearest `step-snapshots.json` entry before deciding whether the scan or expected
output is wrong.

## web-dev

Status: `candidate`

Already resolved:

- Expected output should include `link, image, web.dev` after `banner`.
- The skipped logo was capture loss, not expected VoiceOver behavior.

Remaining question:

1. The latest diagnostic evidence shows VoiceOver reads Appearance/Language
   controls after the search combobox, but final rendered HTML does not expose
   the same subtree. Should this fixture become `partial` around the reliable
   header controls, or stay `candidate` until richer step-snapshot import exists?

## www-apple-com-accessibility

Status: `partial`

Already promoted:

- Global navigation is an exact partial gate.
- The Store nested list includes parent position:
  `list 2 items, level 2 2 of 4`.
- Later global-nav nested lists omit the parent position:
  `list 2 items, level 2`.

Remaining question:

1. Should the local navigation/main content after
   `end of, Global, navigation` become another partial assertion, or stay
   candidate until the local-nav `group` discrepancy is resolved from
   step-snapshot evidence?

## www-bbc-co-uk-news

Status: `partial`

Already promoted:

- Header through `main`, `article`, and the article h1 is an exact partial gate.

Next mismatch:

```text
expected: 22 hours ago
actual:   Share, button

expected after that: Share, button, group / Save, button, group
actual after that:   Share, button / Save, button
```

Remaining question:

1. Using nearest step snapshots, was the timestamp present in the live
   accessibility tree at this point, and should the Share/Save buttons carry
   the `group` suffix?

## www-bbc-co-uk-weather

Status: `candidate`

Current unresolved area:

```text
expected: Enter a city, list box pop up collapsed, combo box
actual:   combo box, auto complete available

expected next: My locations
actual next:   end of, search
```

Relevant HTML:

```html
<input
  type="text"
  placeholder="Enter a city"
  aria-owns="location-list"
  aria-description="Enter a city"
  aria-expanded="false"
  aria-autocomplete="list"
  role="combobox"
>

<p>My locations</p>
```

Already resolved:

- The combobox should announce
  `Enter a city, list box pop up collapsed, combo box`.
- The leading `•` before `Search, button` is a caption artifact.

Remaining question:

1. In the rendered DOM/AX traversal for the live step, is `My locations` inside
   the same search region as the location form, or after `end of, search`?

## www-gov-uk

Status: `candidate`

Current unresolved area:

```text
expected: You have accepted additional cookies. You can
actual:   You have accepted additional cookies. You can at any time.

expected next: Hide cookie message, button
actual next:   link, change your cookie settings
```

Relevant HTML:

```html
<p>
  You have accepted additional cookies.
  <span>
    You can
    <a href="/help/cookies">change your cookie settings</a>
    at any time.
  </span>
</p>
```

Already resolved:

- The first diagnostic announcement `Open System Settings, button` is startup
  noise.
- Latest runner output omitted `link, change your cookie settings` despite the
  link being present in rendered HTML.

Remaining question:

1. Is the omitted cookie-settings link caused by a general inline-link
   VoiceOver behavior, or by GOV-specific cookie-banner focus/caption behavior?

## www-microsoft-com-en-us-accessibility

Status: `candidate`

Current unresolved area:

```text
expected: Search Microsoft.com, button, group
actual:   Search Microsoft.com, button
```

Relevant HTML:

```html
<uhf-search placeholder="Search Microsoft.com">
  <button aria-label="Search Microsoft.com" title="Search Microsoft.com">
    <span>Search</span>
  </button>
</uhf-search>
```

Already resolved:

- `Pause, selected, toggle button` is now modeled for pressed toggle buttons.
- The slideshow should use its accessible label plus `slideshow`.

Remaining questions:

1. What DOM/AX condition causes this standalone search button to receive
   `group`?
2. Is this Microsoft-specific header behavior, or a general VoiceOver rule for
   icon/search buttons?

## www-nhs-uk

Status: `candidate`

Current unresolved area:

```text
expected: Change your cookie settings at any time using our
actual:   Change your cookie settings at any time using our .
```

Relevant HTML:

```html
<p>
  Change your cookie settings at any time using our
  <a href="/our-policies/choose-your-cookie-settings/">
    cookie settings page
  </a>.
</p>
```

Remaining questions:

1. Should text before a link strip punctuation if the punctuation belongs after
   the link?
2. Is this a general inline-text-with-link rule we should apply to GOV/NHS
   cookie banners?

## www-w3-org-wai-standards-guidelines-wcag

Status: `candidate`

Current unresolved area:

```text
expected: list 6 items, level 2
actual:   list 6 items, level 2 3 of 5
```

Relevant HTML:

```html
<li>
  <strong>This page in:</strong>
  <ul>
    <li>English</li>
    <li><a>čeština</a></li>
    <li><a>español</a></li>
    <li><a>français</a></li>
    <li><a>日本語</a></li>
    <li><a>한국어</a></li>
  </ul>
</li>
```

Already resolved:

- The nested language list should announce parent position:
  `list 6 items, level 2 3 of 5`.
- Language names should preserve rendered DOM casing.

Remaining question:

1. Does trusted VoiceOver output include Japanese (`日本語`) as item 5 of 6, or
   omit it as the current expected context appears to do?

## www-wikipedia-org

Status: `candidate`

Current unresolved area:

```text
expected: heading level 1 Wikipedia The Free Encyclopedia, 2 items
actual:   heading level 1, Wikipedia The Free Encyclopedia

expected later: duplicate English top-language link
actual later:   Japanese follows English
```

Relevant HTML:

```html
<h1>
  <span>Wikipedia</span>
  <strong>The Free Encyclopedia</strong>
</h1>

<nav aria-label="Top languages">
  <a><strong>English</strong><small>7,189,000+ articles</small></a>
  <a><strong>日本語</strong><small>1,503,000+ 記事</small></a>
</nav>
```

Remaining questions:

1. What are the two items VoiceOver is counting in the h1?
2. Is duplicate English in expected output a capture artifact?
3. Should multilingual links follow rendered DOM order, starting English then
   Japanese?

## Cross-Fixture

Remaining questions:

1. Inline text containing links: should text nodes before/after a link be
   separate announcements around the link, or can VoiceOver merge surrounding
   text?
2. Nested list parent position: when should VoiceOver say parent position on a
   nested list, e.g. `list 2 items, level 2 2 of 4`?
3. Button `group` suffix: what conditions cause VoiceOver to append `group` to
   a button announcement?
4. Promotion rule: should a fixture become `refined` only when the rebuilt
   engine passes it, or once the expected output is trusted even if the engine
   still needs work?
