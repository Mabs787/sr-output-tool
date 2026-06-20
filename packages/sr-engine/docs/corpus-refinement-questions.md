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

Status: `partial`

Already resolved:

- Expected output should include `link, image, web.dev` after `banner`.
- The skipped logo was capture loss, not expected VoiceOver behavior.
- Rerun `27849923217` confirms VoiceOver announces:
  `Appearance: Light theme, menu pop up, button`,
  `Select your language preference., group`, and
  `Language, menu pop up, button`.
- The same rerun confirms final `rendered-html.html` still does not expose the
  Appearance/Language controls, but step snapshots include live DOM/AX evidence
  for them.
- Header through the search combobox is now an exact partial gate.

Remaining action:

1. Promote the Appearance/Language controls only after using step-snapshot DOM/AX
   evidence, because final rendered HTML still omits those controls.

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

- Header through `main`, `article`, the article h1, timestamp, and article
  action controls is an exact partial gate.
- Rerun `27849923217` confirms the timestamp is present in live DOM/AX and
  VoiceOver announces it before article actions.
- Rerun `27849923217` confirms article actions are:
  `Share, button, group` and `Save, button, group`.

Remaining action:

1. Review the later video/article body output with step snapshots before
   promoting any deeper BBC News gate.

## www-bbc-co-uk-weather

Status: `candidate`

Current fixture-source issue:

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
- Diagnostic run `27836096018` confirms `My locations` is inside the live search
  traversal. VoiceOver announces `end of, search` only after the location panel
  content and `Close location search, button`.
- Rerun `27864902217` repeats the same opened search-panel VoiceOver sequence.
- Final `rendered-html.html` is stale for this fixture: the location panel is
  marked hidden there, while the step snapshot after focusing the combobox shows
  the live AX tree with recent-location/search-panel nodes.
- Header through the location search button is now an exact partial gate.

Remaining action:

1. Promote the opened location-panel content only after using the relevant step
   snapshot or an open-state fixture. Do not change the engine to read hidden
   final HTML just to make this pass.

## www-gov-uk

Status: `partial`

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
- Runs `27794063976` and `27864902217` omitted
  `link, change your cookie settings` despite the link being present in rendered
  HTML.
- Cookie banner through the homepage h1 is now an exact partial gate.

Remaining action:

1. Decide whether the omitted cookie-settings link is a general inline-link
   VoiceOver behavior or GOV-specific cookie-banner focus/caption behavior
   before promoting deeper GOV.UK output.
2. Reconcile the post-main search shape before promoting the GOV.UK main search
   slice; VoiceOver announces separate label/group/helper-text steps while the
   DOM engine currently emits one collapsed combobox announcement.
3. Reconcile GOV.UK list-card traversal before full-page promotion; the engine
   currently skips the linked h3 announcements and positions the paragraph text.

## www-microsoft-com-en-us-accessibility

Status: `partial`

Confirmed by rerun `27849923217`:

```text
Search Microsoft.com, button, group
Featured stories and announcements slideshow: navigate using the slide tabs, slideshow
Pause, selected, toggle button
Previous B, button, group
Next B, button, group
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
- The `B` in `Previous B` / `Next B` is confirmed in the live VoiceOver caption.
- Header search and slideshow controls carry the `group` suffix in this fixture.
- Header through the slideshow pause control is now an exact partial gate.

Remaining action:

1. Decide whether AX-only glyph text such as `Previous B` / `Next B` should be
   modeled by the engine, or kept outside DOM-only gates.

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

Confirmed by rerun `27849923217`:

```text
heading level 1 Wikipedia The Free Encyclopedia, 2 items
link, English 7,189,000+ articles
English - Wikipedia - The Free Encyclopedia, You are currently on a link. To click this link, press Control- Option-Space.
link, Deutsch 3.125.000+ Artikel
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

Already resolved:

- The extra English line is a VoiceOver help/title announcement after the
  English link, not a duplicate English link.
- Top-language traversal does not simply follow DOM order: Japanese is skipped
  in this run even though DOM/AX includes it.
- Chinese is present in the VoiceOver sequence but caption text is corrupted;
  refine from DOM/AX as `中文 1,537,000+ 条目 / 條目`.
- VoiceOver announces `end of, Top languages, navigation` before `search`.

Remaining action:

1. Implement the h1 item-count rule only if it can be generalized beyond the
   Wikipedia logo heading. Otherwise keep it as refined fixture evidence.

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
