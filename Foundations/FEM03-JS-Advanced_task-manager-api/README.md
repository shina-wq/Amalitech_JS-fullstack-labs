# Task Manager API Client

A modern JavaScript (ES6+) client that fetches, processes and manages task data from the [JSONPlaceholder](https://jsonplaceholder.typicode.com) API, with an interactive command-line interface.

## Requirements
- Node.js 18+ (no external dependencies)

## Getting Started
```bash
npm start   # launch the interactive CLI
npm test    # run unit tests
```

## Project Structure
```
src/
├── api.js            # APIClient — fetching, errors, rate limiting
├── models.js         # Task, PriorityTask, User
├── taskProcessor.js  # filtering, statistics, grouping, search, sorting
├── cache.js          # closure-based cache
├── TaskManager.js    # controller orchestrating all operations
├── cli.js            # interactive menu and formatted output
└── main.js           # entry point
test/                 # node:test unit tests
```

## Features
_Coming soon._

## ES6+ Feature Map
_Coming soon._
