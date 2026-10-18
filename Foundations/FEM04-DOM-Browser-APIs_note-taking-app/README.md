# Note-Taking App

A note-taking web app built from the Frontend Mentor design with HTML, CSS and vanilla JavaScript (ES6 modules). It covers note CRUD, archiving, tags, search, themes, drafts and geolocation. Zero dependencies.

**Live demo:** [note-taking-app-peach.vercel.app](https://note-taking-app-peach.vercel.app/)

## Getting Started
ES modules don't load from `file://`, so serve the folder with any static server:
```bash
npx http-server -c-1 .
```
On the first visit the app is seeded with sample notes from `assets/data.json`.

## Architecture
```
index.html
css/
├── tokens.css        # colors, fonts, spacing; light/dark and font themes
├── base.css          # reset, focus ring, utilities
├── components.css    # buttons, inputs, notes, modal, toasts
└── layout.css        # app grid and mobile / tablet / desktop breakpoints
js/
├── main.js           # app state, navigation, all event listeners
├── noteManager.js    # Note class, CRUD, search, tag filter (data only)
├── ui.js             # all DOM rendering
├── storage.js        # localStorage / sessionStorage wrappers
├── themes.js         # applyTheme / applyFont
└── location.js       # geolocation + reverse geocoding
```

`noteManager.js` never touches the DOM and `ui.js` never touches storage. `main.js` connects them.

**Data:** `{ id, title, content, tags, archived, timestamp, location }`, where `location` is `{ latitude, longitude, city }` or `null`.

**Storage keys** (namespaced because every lab on `localhost` shares storage):

| Key | Store | Contents |
|---|---|---|
| `note-app.notes` | localStorage | array of notes |
| `note-app.prefs` | localStorage | `{ theme: 'light' \| 'dark' \| 'system', font: 'sans' \| 'serif' \| 'mono' }` |
| `note-app.draft` | sessionStorage | the open editor's unsaved `{ id, title, tags, content }` |

## Event Handling
One listener each for `click`, `submit`, `input`, `change` and `keydown` on `document`. Buttons describe themselves with data attributes (`data-id`, `data-tag`, `data-view`, `data-setting`, `data-action`), so dynamically rendered notes, tags and toasts need no listeners of their own.

**Keyboard:** Tab reaches everything (plus a skip link), Enter submits, Escape cancels the editor or closes a settings panel, ↑/↓ move between notes, and the confirm modal is a native `<dialog>` that traps focus and returns it on close.

## Error Handling
- **Storage full:** a failed save undoes the change in memory and shows an error toast, so the screen always matches what's stored.
- **Corrupt or missing storage:** bad JSON is treated as empty and preferences fall back to defaults.
- **Geolocation:** unsupported browser, permission denied, unavailable position and timeout each show a message. If the city lookup fails, coordinates are shown instead.
- **Unsaved edits:** survive a reload (sessionStorage draft). Leaving a note with unsaved changes asks for confirmation first.

## Features
- Create, edit, archive / restore and delete notes, with confirmation for archive and delete
- Tags: comma-separated and case-insensitive, listed in the sidebar and filterable
- Live search across title, content and tags, with matches highlighted
- Validation: title required, Save disabled until valid, checked on blur and on submit, announced to screen readers
- Light, dark and System themes (follows `prefers-color-scheme` live); sans-serif, serif and monospace fonts
- Responsive layouts for mobile, tablet and desktop with 44px touch targets

## Bonus Challenges
Implemented: geolocation, search highlighting, arrow-key navigation and dark mode auto-detection.
