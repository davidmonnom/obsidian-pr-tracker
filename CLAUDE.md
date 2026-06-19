# GitHub Review Manager — Obsidian Plugin

An Obsidian plugin that tracks GitHub pull requests in a sidebar view, showing status, author, reviewers, CI status, and metadata.

## Project structure

```
src/
├── main.ts                        # Plugin entry point — registers view, ribbon, command, settings tab
├── github.ts                      # GithubClient: REST API calls + URL parsing. Types: PullRequestInfo, ReviewerInfo, ParsedPRUrl, CIStatus
├── settings.ts                    # Plugin settings interface, default values, SettingTab, loadToken()
├── types.ts                       # Shared React types: PREntry (loading/refreshing/loaded/error), LoadedEntry
│
├── components/                    # Pure React components (no Obsidian ItemView/Modal)
│   ├── ErrorBoundary.tsx          # Class component error boundary wrapping PrListComponent
│   ├── Icon.tsx                   # Renders an Obsidian icon via setIcon() into a <span>
│   ├── ReviewPills.tsx            # Dominant review state badge (approved / changes-requested / pending)
│   ├── LoadedItem.tsx             # Single PR row for a successfully loaded PR
│   ├── ErrorItem.tsx              # Single PR row for a failed fetch, with retry/remove actions
│   ├── PrSection.tsx              # Titled section (Open / Closed) wrapping a list of LoadedItem
│   └── PrListComponent.tsx        # Root React component — owns all state and data-fetching logic
│
├── views/                         # Obsidian-specific shells (ItemView, Modal)
│   ├── PrListView.tsx             # ItemView that mounts PrListComponent; exports PR_LIST_VIEW_TYPE
│   └── AddPrModal.tsx             # Modal to validate and submit a new PR URL
│
└── utils/
    ├── concurrency.ts             # createLimiter(n) — semaphore for capping parallel fetches
    └── dateUtils.ts               # relativeDate(isoDate) — human-readable relative time string
```

## Naming conventions

- **Files and exports**: PascalCase for components, views, and classes (`PrListComponent`, `PrListView`, `AddPrModal`). camelCase for utilities (`dateUtils.ts`).
- **Folders**: lowercase (`components/`, `views/`, `utils/`).
- **Constants**: SCREAMING_SNAKE_CASE (`PR_LIST_VIEW_TYPE`).
- **Interfaces/Types**: PascalCase (`PREntry`, `LoadedEntry`, `PrListProps`).

## Technology

- **Obsidian API**: `ItemView`, `Modal`, `Plugin`, `PluginSettingTab`, `setIcon`, `requestUrl`, `secretStorage`
- **React 19** with automatic JSX transform (`"jsx": "react-jsx"`) — no `import React` needed in JSX files
- **TypeScript** with strict mode, `noUncheckedIndexedAccess`, `noImplicitReturns`
- **esbuild** for bundling (see `esbuild.config.mjs`) — `drop: ['console']` in production

## Key design decisions

- GitHub token is stored in Obsidian's `secretStorage` (system keychain), never written to disk.
- PR entries use a discriminated union (`PREntry`) with four statuses: `loading`, `refreshing`, `loaded`, `error`. The `refreshing` status keeps old data visible during a background re-fetch to avoid flicker.
- `PrListComponent` owns all state. `PrListView` is a thin Obsidian shell that only mounts/unmounts the React tree.
- Closed PRs are never re-fetched — `fetchAll` skips them and their refresh button is hidden.
- CI status uses the GitHub Commit Statuses API (`GET /repos/{owner}/{repo}/commits/{sha}/status`), not Check Runs. This supports custom CI systems (e.g. Odoo runbot) that report via the older statuses API. A 403/404 or empty `total_count` gracefully becomes `'none'`.
- Concurrency is capped at 5 parallel fetches via `createLimiter(5)` in `utils/concurrency.ts`.
- `AbortController` on mount/unmount cancels in-flight requests when the view is closed. Obsidian's `requestUrl` doesn't accept a signal — aborted state is checked manually after each `await`.
- `eslint-plugin-obsidianmd` requires `window.setTimeout/clearTimeout` (not bare or `activeWindow`).

## PR item layout

Each loaded PR renders as two rows:

```
Row 1: [state-dot] [title] [ReviewPill] [refresh-btn?] [remove-btn]
Row 2: [repo · #n · author · date · (· CI badge if not 'none')]
```

- Refresh button is hidden for closed PRs.
- Review pill shows only the dominant state (changes-requested beats approved beats pending).
- CI badge colors: success → green, failure → red, pending → yellow.

## Build

```bash
npm run dev    # watch mode
npm run build  # production build → main.js
npm run lint   # ESLint check
```
