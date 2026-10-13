# Character Counter

A real-time text analyzer built as the lab project for the JavaScript Essentials course in the Frontend specialization. It adds the interactivity to the UI built in the UI Essentials lab.

## Features

- Live character, word and sentence counts
- Option to exclude spaces from the character count
- Optional character limit: a heads-up at 90%, a warning at the limit, and extra input is blocked
- Approximate reading time (200 words per minute)
- Letter density for the top five letters, with "See more" for the rest
- Light and dark themes that follow the system setting and remember your choice
- Responsive layout for mobile, tablet and desktop

## Built with

- Semantic HTML
- Modern CSS: custom properties, nesting, grid, subgrid and `clamp()`
- Vanilla JavaScript with no build step or dependencies

## How it works

- **Events:** one `input` listener on the analyzer handles typing, both checkboxes and the limit field
- **String methods:** `match`, `split`, `replace` and `length` count characters, words and sentences
- **DOM updates:** every change re-renders the counts, the limit message and the letter-density rows (cloned from a `<template>`)

## Getting started

Open `index.html` in a browser. Nothing needs to be installed.

## Project structure

```
├── index.html     Page structure
├── styles.css     Design tokens, themes, layout and components
├── script.js      Text analysis and interactivity
└── assets/        Logos, icons, card patterns, background textures and favicon
```

## Accessibility

- Works fully with a keyboard, with a visible focus indicator on every control
- Labelled form controls; the limit warning is announced to screen readers
- Text meets WCAG AA contrast in both themes
- Lighthouse Accessibility score: 100
