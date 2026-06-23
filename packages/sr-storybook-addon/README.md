# @sr-output/storybook-addon

A Storybook addon that uses the SR Output engine to display VoiceOver-style screen reader announcements for each story — the same output you'd see in the browser extension, live as you develop.

## Installation

```sh
npm install --save-dev @sr-output/storybook-addon
```

Register the addon in `.storybook/main.js` (or `main.ts`):

```js
export default {
  addons: ["@sr-output/storybook-addon"],
};
```

## Usage

Once registered, a **SR Output** panel appears in the Storybook addons panel at the bottom. Every time a story renders, the addon scans the story's DOM using the SR Output engine and lists the announcements VoiceOver would produce — numbered and with role badges, just like the browser extension.

The **Copy** button copies all announcements as plain text.

## How it works

- `preview.tsx` registers a React decorator that wraps every story. After the story renders, it calls `createDomScanner` from `@sr-output/engine` on the story root element and emits the log via Storybook's channel.
- `manager.tsx` registers the panel tab and listens for the channel event to display results.

## Requirements

- Storybook ≥ 7
- React renderer (the decorator is a React component)
