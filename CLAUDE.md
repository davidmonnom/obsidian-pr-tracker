# GitHub Review Manager — Obsidian Plugin

An Obsidian plugin that tracks GitHub pull requests in a sidebar view, showing status, author, reviewers, CI status, and metadata.

## Project structure

```
src/
├── main.ts                        # Plugin entry point — loads persisted data, constructs GithubClient, registers view/ribbon/command/settings
├── github.ts                      # GithubClient: owns tracked PRs, cache, and persistence. Types: PullRequestInfo, ReviewerInfo, ParsedPRUrl, CIStatus, PersistedData
├── settings.ts                    # SettingTab (token UI only), loadToken()
├── types.ts                       # Shared React types: PREntry (loading/refreshing/loaded/error), PRItem, LoadedPRItem
├── context.tsx                    # AppContext + AppContextWrapper (owns all React state/logic) + AppContextType
│
├── components/                    # Pure React components (no Obsidian ItemView/Modal)
│   ├── ErrorBoundary.tsx          # Class component error boundary wrapping PrList
│   ├── Icon.tsx                   # Renders an Obsidian icon via setIcon() into a <span>
│   ├── ReviewPills.tsx            # Dominant review state badge (approved / changes-requested / pending)
│   ├── PrItem.tsx                 # Single PR row — handles loaded, refreshing, and error states
│   ├── PrSection.tsx              # Titled section (Open / Closed / Failed) wrapping a list of PrItem
│   └── PrList.tsx                 # Root React component — reads all state from context via useApp()
│
├── hooks/
│   └── useApp.ts                  # useApp() — returns AppContextType from AppContext
│
├── views/                         # Obsidian-specific shells (ItemView, Modal)
│   ├── PrListView.tsx             # ItemView that mounts AppContextWrapper + PrList; exports PR_LIST_VIEW_TYPE
│   └── AddPrModal.tsx             # Modal to validate and submit a new PR URL
│
└── utils/
    ├── concurrency.ts             # createLimiter(n) — semaphore for capping parallel fetches
    └── dateUtils.ts               # relativeDate(isoDate), minutesAgo(isoDate) — human-readable time strings
```

## Naming conventions

- **Files and exports**: PascalCase for components, views, and classes (`PrList`, `PrListView`, `AddPrModal`). camelCase for utilities (`dateUtils.ts`) and hooks (`useApp.ts`).
- **Folders**: lowercase (`components/`, `views/`, `utils/`, `hooks/`).
- **Constants**: SCREAMING_SNAKE_CASE (`PR_LIST_VIEW_TYPE`).
- **Interfaces/Types**: PascalCase (`PREntry`, `PRItem`, `AppContextType`).

## Technology

- **Obsidian API**: `ItemView`, `Modal`, `Plugin`, `PluginSettingTab`, `setIcon`, `requestUrl`, `secretStorage`
- **React 18** with automatic JSX transform (`"jsx": "react-jsx"`) — no `import React` needed in JSX files
- **TypeScript** with strict mode, `noUncheckedIndexedAccess`, `noImplicitReturns`
- **esbuild** for bundling (see `esbuild.config.mjs`) — `drop: ['console']` in production

## Key design decisions

- **`GithubClient` is the persistence source of truth** — it owns tracked PR URLs, the fetch cache, and all persistence. `GithubClient` public API: `getTrackedPRs()`, `addPR(url)`, `removePR(url)`, `getCached(url)`, `setToken(token)`, `fetchPullRequest(owner, repo, prNumber)`, `static parsePRUrl(url)`.
- `addPR`/`removePR`/`fetchPullRequest` all call an internal `notify()` which fires the `onDataChange` callback — `main.ts` passes `(data) => void this.saveData(data)` to persist the full state to `data.json` on every change.
- **`AppContextWrapper` is the React state source of truth** — defined in `context.tsx`, it owns all component state (`entries`) and all data-fetching logic (`fetchOne`, `fetchAll`, `addPr`, `removePr`, `refreshPr`). It exposes everything via `AppContext`.
- **`useApp()` hook** — any component can call `useApp()` to access the full `AppContextType`: `{ app, plugin, github, entries, addPr, removePr, refreshPr, fetchAll }`. No prop drilling anywhere.
- `PrListView` takes `(leaf, plugin: GithubReviewManager)`. It wraps the React tree in `<AppContextWrapper app plugin github>` and mounts `<PrList />` inside. `PrList` takes zero props.
- `plugin` is typed as `GithubReviewManager` (not the base `Plugin` class) in `AppContextType` to preserve type safety for `plugin.github` and other plugin-specific properties.
- The cache persists across Obsidian restarts (stored in `data.json` as `prCache`). On startup, `GithubClient` is initialised with the saved `PersistedData`. Closed PRs therefore load instantly from cache and are never re-fetched.
- GitHub token is stored in Obsidian's `secretStorage` (system keychain), never in `data.json`.
- PR entries use a discriminated union (`PREntry`) with four statuses: `loading`, `refreshing`, `loaded`, `error`. The `refreshing` status keeps old data visible during a background re-fetch to avoid flicker. `PRItem` is `loaded | refreshing | error`; `LoadedPRItem` is `loaded | refreshing`.
- Closed PRs are never re-fetched — `fetchAll` skips entries where `status === 'loaded' && data.state === 'closed'`, and the refresh button is hidden for closed PRs.
- CI status uses the GitHub Commit Statuses API (`GET /repos/{owner}/{repo}/commits/{sha}/status`), not Check Runs. This supports custom CI systems (e.g. Odoo runbot) that report via the older statuses API. A 403/404 or empty `total_count` gracefully becomes `'none'`.
- Concurrency is capped at 5 parallel fetches via `createLimiter(5)` in `utils/concurrency.ts`.
- `eslint-plugin-obsidianmd` requires `window.setTimeout/clearTimeout` (not bare or `activeWindow`).

## PR item layout

Each loaded PR renders as two rows:

```
Row 1: [state-dot] [title] [ReviewPill] [refresh-btn?] [remove-btn]
Row 2: [repo · #n · author · date · synced-time · (· CI badge if not 'none')]
```

- Refresh button is hidden for closed PRs.
- Review pill shows only the dominant state (changes-requested beats approved beats pending).
- CI badge colors: success → green, failure → red, pending → yellow.
- Synced time shows `minutesAgo(pr.lastRefreshedAt)` — set by `GithubClient.fetchPullRequest` on every successful fetch.

## Build

```bash
npm run dev    # watch mode
npm run build  # production build → main.js
npm run lint   # ESLint check
```
