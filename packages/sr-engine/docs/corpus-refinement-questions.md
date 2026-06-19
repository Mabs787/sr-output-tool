# Corpus Refinement Questions

These are the open questions blocking candidate VoiceOver fixtures from becoming
exact engine gates. Please answer with what you believe VoiceOver should do in
Chrome for the live page state captured by the runner.

When answering, it is fine to say:

- `keep VO`: the captured VoiceOver output is correct.
- `refine expected`: the stored expected output is capture/OCR/caption noise.
- `fix engine`: the rebuilt engine output is wrong.
- `skip/partial`: the fixture is too ambiguous, or only part of it should gate.

## Runner Environment Evidence

Latest diagnostic run: `27818580760`, `https://www.gov.uk/`, commit
`401fb8495252001c4208fc89d0e0c572eceecf9e`.

Runner/network context from `runner-environment.json`:

```json
{
  "publicNetwork": {
    "city": "San Jose",
    "region": "California",
    "countryCode": "US",
    "countryName": "United States",
    "timezone": "America/Los_Angeles",
    "org": "Microsoft Corporation"
  },
  "host": {
    "platform": "darwin",
    "arch": "arm64",
    "locale": "en-US",
    "timeZone": "UTC"
  },
  "browser": {
    "language": "en-US",
    "languages": ["en-US", "en"],
    "locale": "en-US",
    "timeZone": "UTC",
    "viewport": {
      "width": 980,
      "height": 543,
      "devicePixelRatio": 1
    },
    "screen": {
      "width": 1024,
      "height": 768
    }
  }
}
```

Implications for refinement:

- Treat runner output as a US, `en-US`, UTC, 980px-wide Chrome page state unless
  a fixture has newer `runner-environment.json` evidence.
- UK-local manual checks can differ because of geo, locale, timezone, cookie
  state, responsive breakpoint, or personalization.
- If rendered HTML and VoiceOver output disagree, check whether the page was
  rendered at the runner breakpoint before assuming the scan is wrong.
- The latest GOV.UK diagnostic output begins with `Open System Settings, button`
  before page content. Treat this as startup/system noise, not page output.

## web-dev

Status: `candidate`

Current first mismatch:

```text
0 expected: link, Skip to main content
0 actual:   link, Skip to main content
1 expected: banner
1 actual:   banner
2 expected: Upper tabs, navigation
2 actual:   link, image, web.dev
3 expected: Dropdown menu for Extended Navigation, menu pop up collapsed, button
3 actual:   Upper tabs, navigation
```

Evidence:

- Rendered HTML contains a focusable logo link:
  `<a href="/"><img alt="web.dev"></a>`
- Chrome accessibility tree contains:
  `role=link`, `name=web.dev`, `focusable=true`, URL `https://web.dev/`.
- Captured VoiceOver output skipped this logo link and went straight from
  `banner` to `Upper tabs, navigation`.

HTML context:

```html
<a href="/" data-sr-dom-node-id="12">
  <picture data-sr-dom-node-id="13">
    <source data-sr-dom-node-id="14">
    <img alt="web.dev" data-sr-dom-node-id="15">
  </picture>
</a>

<nav aria-label="Upper tabs" data-sr-dom-node-id="19">
  <tab data-sr-dom-node-id="20">
    <button
      aria-haspopup="menu"
      aria-expanded="false"
      aria-label="Dropdown menu for Extended Navigation"
      aria-controls="tab-overflow-menu-1nts"
      data-sr-dom-node-id="21"
    >
      More
    </button>
  </tab>
</nav>
```

Resolved decisions:

- Expected output should include `link, image, web.dev` after `banner`.
- Use the phrase `link, image, web.dev`, not `link, web.dev`.
- The runner capture skipped a focusable item that was confirmed locally with
  VoiceOver, so treat the missing logo as capture loss rather than expected VO
  behavior.
- Promote `web-dev` once the refined expected output is applied.

Open questions:

- None for this fixture.

## www-apple-com-accessibility

Status: `candidate`

Current first mismatch:

```text
4 expected: link, Store, 1 of 2
4 actual:   link, Store, 1 of 2
5 expected: Store menu, collapsed, button, 2 of 2
5 actual:   Store menu, collapsed, button, 2 of 2
6 expected: end of list
6 actual:   end of list
7 expected: list 2 items, level 2
7 actual:   list 2 items, level 2 2 of 4
```

Context:

- Apple global nav has a top-level list of global items.
- Each item appears to contain a nested list with the visible link and menu
  button, for example `Store` + `Store menu`.
- The first nested list expected output includes parent position:
  `list 2 items, level 2 2 of 4`.
- The next nested lists often omit the parent position:
  `list 2 items, level 2`.

HTML context:

```html
<nav aria-label="Global" data-sr-dom-node-id="5">
  <ul id="globalnav-list" data-sr-dom-node-id="12">
    <li data-sr-dom-node-id="13">
      <a href="/" aria-label="Apple" data-sr-dom-node-id="14">
        <span data-sr-dom-node-id="21">Apple</span>
      </a>
    </li>
    <li data-sr-dom-node-id="22">
      <ul data-sr-dom-node-id="26">
        <li data-sr-dom-node-id="27">
          <a href="/us/shop/goto/store" aria-label="Store" data-sr-dom-node-id="28">
            <span data-sr-dom-node-id="33">Store</span>
          </a>
        </li>
        <li data-sr-dom-node-id="37">
          <button
            aria-expanded="false"
            aria-controls="globalnav-submenu-link-store"
            aria-label="Store menu"
            data-sr-dom-node-id="38"
          ></button>
        </li>
      </ul>
    </li>
  </ul>
</nav>
```

Resolved decisions:

- Forward VoiceOver traversal announces the Store nested list as
  `list 2 items, level 2 2 of 4`.
- Backward traversal may omit the parent position and announce
  `list 2 items, level 2`.
- Leading `•` markers in this Apple fixture are caption artifacts.
- A standalone `.` announcement can be valid and should not be removed by a
  broad sanitizer.
- The engine should model the parent-position announcement for forward
  navigation.
- Promote the Apple fixture once the refined expected output is applied.

Open questions:

- None for this fixture.

## www-bbc-co-uk-news

Status: `candidate`

Current first mismatch:

```text
5 expected: Subscribe, button
5 actual:   Subscribe, button
6 expected: link, Sign In
6 actual:   link, Sign In
7 expected: end of, banner
7 actual:   end of, banner
8 expected: main
8 actual:   navigation
9 expected: article
9 actual:   end of, navigation
10 expected: • heading level 1, What's in the US-Iran agreement?
10 actual:   main
```

Context:

- The rebuilt engine finds an unnamed navigation landmark between the banner and
  main content.
- Captured VoiceOver output does not include that navigation landmark.
- Expected output also has a leading `•` before the article heading.

HTML context:

```html
<header data-sr-dom-node-id="16">
  <button role="button" aria-expanded="false" aria-label="Open menu">
  </button>
  <a href="/" data-sr-dom-node-id="37">
    <svg role="img" aria-label="British Broadcasting Corporation"></svg>
  </a>
  <button data-sr-dom-node-id="43">Subscribe</button>
  <a href="https://session.bbc.com/session?userOrigin=BBCS_BBC">
    <span>Sign In</span>
  </a>
</header>

<main data-sr-dom-node-id="229">
  <article data-sr-dom-node-id="238">
    <h1 data-sr-dom-node-id="243">What's in the US-Iran agreement?</h1>
  </article>
</main>
```

Resolved decisions:

- `• heading level 1...` is a caption artifact.
- Refined expected output should use
  `heading level 1, What's in the US-Iran agreement?`.
- If VoiceOver announces the unnamed navigation landmark, the engine should
  announce it too.
- If VoiceOver announces `article` after `main`, the engine should announce it
  too.

Open questions:

1. Does the trusted VoiceOver output include the unnamed navigation landmark
   after the BBC banner?
2. Does the trusted VoiceOver output include `article` after `main`?

## www-bbc-co-uk-weather

Status: `candidate`

Current first mismatch:

```text
26 expected: link, BBC Weather
26 actual:   link, BBC Weather
27 expected: heading level 2, Search for a location
27 actual:   heading level 2, Search for a location
28 expected: search
28 actual:   search
29 expected: Enter a city, list box pop up collapsed, combo box
29 actual:   combo box, auto complete available
30 expected: • Search, button
30 actual:   Search, button
31 expected: My locations
31 actual:   end of, search
```

Context:

- Earlier hidden-list count behavior now looks good for the BBC top nav.
- The current issue is the location search combobox.
- Captured VoiceOver says:
  `Enter a city, list box pop up collapsed, combo box`.
- The rebuilt engine sees only:
  `combo box, auto complete available`.

HTML context:

```html
<h2 tabindex="-1" data-sr-dom-node-id="671">Search for a location</h2>

<input
  type="text"
  placeholder="Enter a city"
  aria-owns="location-list"
  aria-description="Enter a city"
  aria-expanded="false"
  aria-autocomplete="list"
  role="combobox"
  data-sr-dom-node-id="680"
>

<p data-sr-dom-node-id="696">My locations</p>
```

Resolved decisions:

- The combobox should announce
  `Enter a city, list box pop up collapsed, combo box`.
- For this wrapper-combobox pattern, the engine should inherit the name/state
  from the inner input when the wrapper owns `role="combobox"`.
- The leading `•` before `Search, button` is a caption artifact.
- Search-region boundaries should follow the DOM order that VoiceOver traverses.
- Promote BBC Weather once the search-region boundary is applied.

Local evidence:

```html
<div class="ls-ui-ctrl-primary-search"><form method="post" action="#" class="ls-o-form">
  <div class="ls-c-search">

  <div class="ls-c-search__container" aria-autocomplete="list" role="combobox">
    <input id="ls-c-search__input-label" type="text" class="ls-c-search__input gel-pica" placeholder="Enter a town, city or UK postcode" autocomplete="off" aria-owns="location-list" aria-description="Enter a town, city or UK postcode" aria-expanded="false" aria-autocomplete="list" role="combobox">
  </div>

  <button class="ls-c-search__submit ls-o-btn--right" title="Search for a location">
    <span class="ls-u-hidden">Search</span>
    <svg fill="currentColor" width="2em" height="2em" focusable="false" aria-hidden="true" viewBox="0 0 32 32"><path d="M19.2 23.2c-1.9 1.1-4 1.6-6.2 1.6C6.2 24.8.9 19.5.9 12.7.9 5.7 6.1.5 13 .5c7 0 12.2 5.2 12.2 12.1 0 2.6-.8 5.1-2.3 7.1l8.4 8.4-3.6 3.6-8.5-8.5zM13 4c-4.8 0-8.5 3.7-8.5 8.6s3.7 8.6 8.5 8.6 8.5-3.7 8.5-8.6S17.8 4 13 4z"></path></svg>
  </button>

    <button type="button" class="ls-c-search__clear-button">
      <span class="ls-u-hidden">Clear input.</span>
      <svg fill="currentColor" width="2em" height="2em" focusable="false" aria-hidden="true" viewBox="0 0 32 32"><path d="m30 4.6-2.8-2.8L2 27.4l2.8 2.8L30 4.6zM4.8 1.8 1.9 4.7l25.2 25.5 2.9-2.9L4.8 1.8z"></path></svg>
    </button>

</div>

</form>
</div>
```

Open questions:

1. In the rendered DOM/AX traversal, is `My locations` inside the same search
   region as the location form, or after `end of, search`?


## www-google-com-accessibility

Status: `candidate`

Current first mismatch:

```text
5 expected: heading level 1, Making accessible technology with and for people with disabilities
5 actual:   heading level 1, Making accessible technology with and for people with disabilities
6 expected: Despite progress in tech and society, people with disabilities still face barriers to accessible experiences - including hurdles to complete tasks, navigate the world,
6 actual:   Despite progress in tech and society, people with disabilities still face barriers to accessible experiences — including hurdles to complete tasks, navigate the world, or reach their dreams. As creative technologists, we all have an opportunity and a responsibility to ensure what we're building works for everyone.
7 expected: •wniga-thumbnail-2026-ep12-update-opt-02.webp 07:43, button, group
7 actual:   07:43, button
8 expected: GOOGLE ACCESSIBILITY YOUTUBE SERIES
8 actual:   heading level 2, What’s New in Google Accessibility
```

Context:

- Expected text appears truncated at the end of the paragraph.
- Expected video button starts with what looks like an OCR/caption leak from an
  image filename: `•wniga-thumbnail...`.
- Expected has a separate all-caps line before the heading.

HTML context:

```html
<h1 data-sr-dom-node-id="216">
  Making accessible technology with and for people with disabilities
</h1>

<p data-sr-dom-node-id="217">
  Despite progress in tech and society, people with disabilities still face
  barriers to accessible experiences — including hurdles to complete tasks,
  navigate the world, or reach their dreams. As creative technologists, we all
  have an opportunity and a responsibility to ensure what we're building works
  for everyone.
</p>

<div tabindex="0" role="button" data-sr-dom-node-id="224">
  <img
    alt="wniga-thumbnail-2026-ep12-update-opt-02.webp"
    data-sr-dom-node-id="236"
  >
  <span data-sr-dom-node-id="246">07:43</span>
</div>

<div data-sr-dom-node-id="251">
  <span data-sr-dom-node-id="253">GOOGLE ACCESSIBILITY YOUTUBE SERIES</span>
  <h2 data-sr-dom-node-id="254">What’s New in Google Accessibility</h2>
</div>
```

Resolved decisions:

- Long paragraphs should use the full rendered DOM/AX text, not the shorter
  captured caption line.
- The video button should include the image filename and duration:
  `wniga-thumbnail-2026-ep12-update-opt-02.webp 07:43, button, group`.
- The leading `•` before the video filename should be removed.
- `GOOGLE ACCESSIBILITY YOUTUBE SERIES` should be a standalone announcement.
- `heading level 2, What’s New in Google Accessibility` should be announced
  after `GOOGLE ACCESSIBILITY YOUTUBE SERIES`.
- Punctuation should match captured VoiceOver output.

Open questions:

- None for this fixture.

## www-gov-uk-apply-blue-badge

Status: `candidate`

Current first mismatch:

```text
0 expected: group
0 actual:   Cookies on GOV.UK, region
1 expected: Cookies on GOV.UK, region
1 actual:   You have accepted additional cookies. You can at any time.
2 expected: your cookie settings at any time., group
2 actual:   link, change your cookie settings
3 expected: Hide cookie message, button
3 actual:   Hide cookie message, button
```

Context:

- Expected output starts with a stray `group`.
- Cookie banner text/link split differs from rendered DOM traversal.
- Rendered DOM contains a cookie settings link between the text fragments.
- Latest GOV.UK diagnostic evidence from run `27818580760` was captured from a
  US-hosted runner using `en-US`, UTC, and a `980x543` viewport.

HTML context:

```html
<div aria-label="Cookies on GOV.UK" role="region" data-sr-dom-node-id="2">
  <h2 hidden="" data-sr-dom-node-id="6">Cookies on GOV.UK</h2>
  <div tabindex="-1" data-sr-dom-node-id="7">
    <p data-sr-dom-node-id="12">
      You have accepted additional cookies.
      <span data-sr-dom-node-id="13">
        You can
        <a href="/help/cookies" data-sr-dom-node-id="14">
          change your cookie settings
        </a>
        at any time.
      </span>
    </p>
    <button data-sr-dom-node-id="23">Hide cookie message</button>
  </div>
</div>
```

Resolved decisions:

- Remove the initial stray `group`.
- Match the captured VoiceOver output for this fixture rather than preserving
  the raw first line.
- Refine GOV cookie banner behavior once and reuse it for both GOV fixtures.
- Match VoiceOver output for the cookie settings link behavior; if VoiceOver
  omits the link, do not insert it purely from rendered HTML.

Open questions:

- None for this fixture.

## www-gov-uk

Status: `candidate`

Current first mismatch:

```text
0 expected: Cookies on GOV.UK, region
0 actual:   Cookies on GOV.UK, region
1 expected: You have accepted additional cookies. You can
1 actual:   You have accepted additional cookies. You can at any time.
2 expected: Hide cookie message, button
2 actual:   link, change your cookie settings
3 expected: end of, Cookies on GOV.UK, region
3 actual:   Hide cookie message, button
```

Context:

- Same cookie banner pattern as Blue Badge, but without initial stray `group`.
- Captured output omitted `link, change your cookie settings`.
- Rendered DOM includes the link.
- Latest diagnostic run `27818580760` captured GOV.UK successfully from the
  US-hosted runner. The first announcement was `Open System Settings, button`,
  which should be treated as startup/system noise.
- The diagnostic run then captured:

```text
Cookies on GOV.UK, region
You have accepted additional cookies. You can
Hide cookie message, button
end of, Cookies on GOV.UK, region
link, Skip to main content
```

- In that run, VoiceOver still omitted `link, change your cookie settings` even
  though rendered HTML contains the link. This means GOV cookie-banner
  link/text behavior needs a specific decision instead of assuming DOM order.

HTML context:

```html
<div aria-label="Cookies on GOV.UK" role="region" data-sr-dom-node-id="2">
  <h2 hidden="" data-sr-dom-node-id="6">Cookies on GOV.UK</h2>
  <div tabindex="-1" data-sr-dom-node-id="7">
    <p data-sr-dom-node-id="12">
      You have accepted additional cookies.
      <span data-sr-dom-node-id="13">
        You can
        <a href="/help/cookies" data-sr-dom-node-id="14">
          change your cookie settings
        </a>
        at any time.
      </span>
    </p>
    <button data-sr-dom-node-id="23">Hide cookie message</button>
  </div>
</div>
```

Resolved decisions:

- Preserve the latest runner VoiceOver capture for GOV.UK cookie-banner output.
- Do not insert `link, change your cookie settings` purely from rendered HTML/AX
  when VoiceOver omits it.
- Reuse the GOV cookie-banner refinement across GOV fixtures where the same
  pattern appears.

Open questions:

1. Is the omitted cookie-settings link caused by a general inline-link
   VoiceOver behavior, or by GOV-specific cookie-banner focus/caption behavior?

## www-microsoft-com-en-us-accessibility

Status: `candidate`

Already refined:

- Removed 11 leading bullet caption markers from refined announcements where
  rendered HTML and Chrome AX showed normal links/buttons/headings/slideshow
  text.
- Normalized `Products ,` to `Products,` based on AX name `Products`.

Current first mismatch:

```text
9 expected: All Microsoft menu, navigation
9 actual:   All Microsoft menu, navigation
10 expected: All Microsoft, menu pop up collapsed, button
10 actual:   All Microsoft, menu pop up collapsed, button
11 expected: end of, All Microsoft menu, navigation
11 actual:   end of, All Microsoft menu, navigation
12 expected: Search Microsoft.com, button, group
12 actual:   Search Microsoft.com, button
13 expected: link, Cart
13 actual:   link, Cart
```

HTML context:

```html
<nav aria-label="All Microsoft menu" data-sr-dom-node-id="68">
  <button
    role="button"
    aria-haspopup="true"
    aria-expanded="false"
    data-sr-dom-node-id="71"
  >
    All Microsoft
  </button>
</nav>

<uhf-search placeholder="Search Microsoft.com" data-sr-dom-node-id="194">
  <button
    aria-label="Search Microsoft.com"
    title="Search Microsoft.com"
    data-sr-dom-node-id="203"
  >
    <span data-sr-computed-hidden="display:none">Search</span>
  </button>
</uhf-search>

<section
  aria-label="Featured stories and announcements slideshow: navigate using the slide tabs"
  aria-roledescription="slideshow"
  data-sr-dom-node-id="230"
>
  <span aria-live="polite">Slide 1 of 2. Accessibility at Microsoft</span>
</section>
```

Resolved decisions:

- `Search Microsoft.com, button` should include `group`, so refined expected
  output should keep `Search Microsoft.com, button, group`.
- The slideshow should be announced as
  `Featured stories and announcements slideshow: navigate using the slide tabs, slideshow`.

Open questions:

1. What DOM/AX condition causes a standalone button to receive `group`?
2. Is this Microsoft-specific header behavior, or a general VoiceOver rule for
   icon/search buttons?

## www-nhs-uk

Status: `candidate`

Current first mismatch:

```text
0 expected: Change your cookie settings at any time using our
0 actual:   Change your cookie settings at any time using our .
1 expected: link, cookie settings page
1 actual:   link, cookie settings page
2 expected: link, Skip to main content
2 actual:   link, Skip to main content
3 expected: banner
3 actual:   banner
```

Context:

- Difference is punctuation around text before the cookie settings link.
- The rebuilt engine leaves a stray period because it removes/isolates the link
  from surrounding text.

HTML context:

```html
<p data-sr-dom-node-id="18">
  Change your cookie settings at any time using our
  <a
    href="/our-policies/choose-your-cookie-settings/"
    data-sr-dom-node-id="19"
  >
    cookie settings page
  </a>.
</p>

<form role="search" data-sr-dom-node-id="32">
  <label for="search-field" data-sr-dom-node-id="33">
    Search the NHS website
  </label>
  <input
    aria-expanded="false"
    aria-owns="search-field__listbox"
    aria-autocomplete="list"
    aria-describedby="search-field__assistiveHint"
    id="search-field"
    name="q"
    placeholder="Search"
    type="text"
    role="combobox"
    data-sr-dom-node-id="39"
  >
</form>
```

Resolved decisions:

- Match captured VoiceOver output for the cookie sentence punctuation.
- Match captured VoiceOver output for the NHS search form, including duplicate
  `search` announcements if the run captured them.

Open questions:

1. Should text before a link strip punctuation if the punctuation belongs after
   the link?
2. Is this a general inline-text-with-link rule we should apply to GOV/NHS cookie
   banners?

## www-w3-org-wai-standards-guidelines-wcag

Status: `candidate`

Current first mismatch:

```text
2 expected: link, Skip to Content, 1 of 5
2 actual:   link, Skip to Content, 1 of 5
3 expected: link, Change Text Size or Colors, 2 of 5
3 actual:   link, Change Text Size or Colors, 2 of 5
4 expected: This page in:, 3 of 5
4 actual:   This page in:, 3 of 5
5 expected: list 6 items, level 2
5 actual:   list 6 items, level 2 3 of 5
6 expected: English, 1 of 6
6 actual:   English, 1 of 6
7 expected: link, Ceština, 2 of 6
7 actual:   link, čeština, 2 of 6
```

Context:

- The nested language list is inside parent item 3 of 5.
- The rebuilt engine includes parent position for the nested list.
- Expected omits it.
- Rendered text uses lowercase language names for some entries (`čeština`,
  `español`, `français`) and includes Japanese as item 5; expected has capitalized
  names and skips Japanese in the shown context.

HTML context:

```html
<li data-sr-dom-node-id="7">
  <strong data-sr-dom-node-id="8">This page in:</strong>
  <ul data-sr-dom-node-id="9">
    <li data-sr-dom-node-id="10">English</li>
    <li data-sr-dom-node-id="12">
      <a href="/WAI/standards-guidelines/wcag/cs" data-sr-dom-node-id="13">
        čeština
      </a>
    </li>
    <li data-sr-dom-node-id="14">
      <a href="/WAI/standards-guidelines/wcag/es" data-sr-dom-node-id="15">
        español
      </a>
    </li>
    <li data-sr-dom-node-id="16">
      <a href="/WAI/standards-guidelines/wcag/fr" data-sr-dom-node-id="17">
        français
      </a>
    </li>
    <li data-sr-dom-node-id="18">
      <a href="/WAI/standards-guidelines/wcag/ja" data-sr-dom-node-id="19">
        日本語
      </a>
    </li>
    <li data-sr-dom-node-id="20">
      <a href="/WAI/standards-guidelines/wcag/ko" data-sr-dom-node-id="21">
        한국어
      </a>
    </li>
  </ul>
</li>
```

Resolved decisions:

- The nested language list should announce parent position:
  `list 6 items, level 2 3 of 5`.
- Language names should preserve rendered DOM casing, e.g. `čeština`,
  `español`, and `français`.
- For Japanese inclusion/order, match captured VoiceOver output.
- This fixture is reliable enough to continue refining after the language/list
  decisions are applied.

Open questions:

1. When applying "match captured VoiceOver output" for the language sequence,
   does the trusted output include Japanese (`日本語`) as item 5 of 6, or omit it
   as the current expected context appears to do?

## www-wikipedia-org

Status: `candidate`

Current first mismatch:

```text
0 expected: main
0 actual:   main
1 expected: heading level 1 Wikipedia The Free Encyclopedia, 2 items
1 actual:   heading level 1, Wikipedia The Free Encyclopedia
2 expected: Top languages, navigation
2 actual:   Top languages, navigation
3 expected: link, English 7,189,000+ articles
3 actual:   link, English 7,189,000+ articles
4 expected: link, English 7,189,000+ articles
4 actual:   link, 日本語 1,503,000+ 記事
```

Context:

- Expected heading has no comma after level and includes `2 items`.
- Engine emits normal heading format without `2 items`.
- Expected has duplicate English link; rendered/engine order moves to Japanese
  next.

HTML context:

```html
<h1 data-sr-dom-node-id="4">
  <span data-sr-dom-node-id="5">Wikipedia</span>
  <strong data-sr-dom-node-id="6">The Free Encyclopedia</strong>
</h1>

<nav aria-label="Top languages" data-sr-dom-node-id="7">
  <a href="//en.wikipedia.org/" title="English — Wikipedia — The Free Encyclopedia">
    <strong>English</strong>
    <small>7,189,000+ <span>articles</span></small>
  </a>
  <a href="//ja.wikipedia.org/" title="Nihongo — ウィキペディア — フリー百科事典">
    <strong>日本語</strong>
    <small>1,503,000+ <span>記事</span></small>
  </a>
</nav>
```

Resolved decisions:

- Match captured VoiceOver output for the h1. Current captured output is
  `heading level 1 Wikipedia The Free Encyclopedia, 2 items`.
- Match captured VoiceOver punctuation for the h1, so do not add the comma after
  `heading level 1` unless a newer VO run includes it.

Open questions:

1. What are the two items VoiceOver is counting in the h1?
2. Is duplicate English in expected output a capture artifact?
3. Should multilingual links follow rendered DOM order, starting English then
   Japanese?

## Cross-Fixture Questions

Resolved decisions:

- Leading `•` before normal role-prefixed announcements is a caption artifact in
  the answered fixtures and should be removed during refinement.
- Do not remove every punctuation-only announcement globally: a standalone `.`
  can be valid.
- Google-style long text should use the full rendered DOM/AX text rather than a
  caption-truncated line.
- Wrapper comboboxes can inherit name/state from an inner input when the wrapper
  owns `role="combobox"`.
- Microsoft `Search Microsoft.com, button` should include the `group` suffix.
- Microsoft slideshow should use its accessible label plus the `slideshow`
  roledescription.
- W3C language names should preserve DOM casing.
- Wikipedia h1 should match captured VoiceOver output, including `2 items` and
  no comma after `heading level 1`.
- NHS cookie punctuation and duplicate search-region announcements should match
  captured VoiceOver output.

Open questions:

1. Inline text containing links:
   Should text nodes before/after a link be separate announcements around the
   link, or can VoiceOver merge the surrounding text?

2. Container names:
   Should unnamed containers (`banner`, `main`, `navigation`, `list`) avoid
   borrowing all descendant text as their accessible name? The rebuilt engine
   currently avoids that.

3. Nested list parent position:
   When should VoiceOver say parent position on a nested list, e.g.
   `list 2 items, level 2 2 of 4`? Apple evidence says this can depend on
   forward vs backward traversal. W3C evidence says parent position can be
   included for nested language lists.

4. Button `group` suffix:
   What conditions cause VoiceOver to append `group` to a button announcement?
   Examples needing confirmation:
   - `Search Microsoft.com, button, group`
   - BBC search button with leading marker
   - standalone expanded/menu buttons

5. Promotion rule:
   Should a fixture be promoted to `refined` only when it exactly passes the
   rebuilt engine, or can it be promoted once expected output is trusted even if
   the engine still fails against it?
