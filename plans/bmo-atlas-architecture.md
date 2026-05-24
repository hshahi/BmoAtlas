# BmoAtlas — Comprehensive Architectural Proposal

## Table of Contents

1. [Architectural Summary](#1-architectural-summary)
2. [Dependency / Version Summary](#2-dependency--version-summary)
3. [Migration / Reuse Strategy](#3-migration--reuse-strategy)
4. [Proposed Workspace Structure](#4-proposed-workspace-structure)
5. [Native Federation Strategy](#5-native-federation-strategy)
6. [Routing Strategy](#6-routing-strategy)
7. [Shared Library Strategy](#7-shared-library-strategy)
8. [Theme Architecture](#8-theme-architecture)
9. [Communication Strategy — Shell ↔ MFEs](#9-communication-strategy--shell--mfes)
10. [Testing Strategy](#10-testing-strategy)
11. [Responsive / Layout Strategy](#11-responsive--layout-strategy)
12. [Loader / Wait Cursor Design](#12-loader--wait-cursor-design)
13. [Angular Features & Patterns](#13-angular-features--patterns)
14. [Build / Deployment Strategy](#14-build--deployment-strategy)
15. [Risks & Recommendations](#15-risks--recommendations)
16. [Items You May Be Missing](#16-items-you-may-be-missing)
17. [Step-by-Step Implementation Plan](#17-step-by-step-implementation-plan)

---

## 1. Architectural Summary

BmoAtlas is an Angular 21 monorepo workspace designed as a **Native Federation micro-frontend platform**. It follows the proven patterns from AngularStockTicker while extending them for multi-application, independently-deployable architecture.

### Core Principles

- **Monorepo for development, independent deployment for production** — MFEs live in the workspace during development but are designed for future extraction to separate repos
- **Shared-nothing coupling** — MFEs communicate with the shell exclusively through well-defined contracts: `MessageHub`, `StateHub`, and route parameters
- **Container/Presenter pattern** — Smart containers manage state and inject services; dumb presenters receive data via `input()` and emit via `output()`
- **Signal-first reactivity** — Angular signals for state, `computed()` for derived data, `effect()` for side effects
- **CSS-first responsiveness** — Container queries, fluid typography, cascade layers — no JavaScript-based breakpoint logic

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph BmoAtlas Workspace
        subgraph Libraries
            CORE[libs/core]
            SHARED[libs/shared]
        end

        subgraph Applications
            SHELL[apps/atlas - Shell Host]
            MFE1[apps/mfe-dashboard - MFE 1]
            MFE2[apps/mfe-settings - MFE 2]
        end
    end

    SHELL -->|imports| CORE
    SHELL -->|imports| SHARED
    MFE1 -->|imports| CORE
    MFE1 -->|imports| SHARED
    MFE2 -->|imports| CORE
    MFE2 -->|imports| SHARED
    SHELL -->|Native Federation| MFE1
    SHELL -->|Native Federation| MFE2
```

---

## 2. Dependency / Version Summary

Matching AngularStockTicker exactly unless noted:

| Package | Version | Notes |
|---------|---------|-------|
| `@angular/core` | 21.2.0 | Same as reference |
| `@angular/common` | 21.2.0 | Same |
| `@angular/compiler` | 21.2.0 | Same |
| `@angular/forms` | 21.2.0 | Same |
| `@angular/platform-browser` | 21.2.0 | Same |
| `@angular/router` | 21.2.0 | Same |
| `rxjs` | 7.8.0 | Same |
| `tslib` | 2.3.0 | Same |
| `@angular/build` | 21.2.2 | Same |
| `@angular/cli` | 21.2.2 | Same |
| `@angular/compiler-cli` | 21.2.0 | Same |
| `typescript` | 5.9.2 | Same |
| `vitest` | 4.1.0 | Same |
| `@vitest/browser-playwright` | 4.1.0 | Same |
| `@vitest/coverage-v8` | 4.1.0 | Same |
| `jsdom` | 28.0.0 | Same |
| `playwright` | 1.58.2 | Same |
| `prettier` | 3.8.1 | Same |
| `@angular-architects/native-federation` | latest compatible | **NEW** — required for MFE architecture |
| `es-module-shims` | latest | **NEW** — Native Federation runtime dependency |

### Why Native Federation over Module Federation?

- Native Federation uses browser-native ES modules (import maps) — no webpack required
- Works with Angular's esbuild-based `@angular/build:application` builder
- Better tree-shaking, faster builds, smaller bundles
- Future-proof: aligns with web standards

---

## 3. Migration / Reuse Strategy

### From AngularStockTicker → BmoAtlas Core Library

| Source | Target | Action |
|--------|--------|--------|
| `core/base/component/component-base.ts` | `libs/core/base/component/` | Direct migration |
| `core/base/domain/domain-base.ts` | `libs/core/base/domain/` | Direct migration + tests |
| `core/base/hub/hub.ts` | `libs/core/base/hub/` | Direct migration |
| `core/base/service/service-base.ts` | `libs/core/base/service/` | Direct migration |
| `core/services/message-hub/` | `libs/core/services/message-hub/` | Direct migration + all tests |
| `core/services/state-hub/` | `libs/core/services/state-hub/` | Direct migration + all tests |
| `core/services/http-data/` | `libs/core/services/http-data/` | Direct migration + tests |
| `core/services/http-client-data/` | `libs/core/services/http-client-data/` | Direct migration + tests |

### From AngularStockTicker → BmoAtlas Shared Library

| Source | Target | Action |
|--------|--------|--------|
| `shared/handlers/global-error.handler.ts` | `libs/shared/handlers/` | Direct migration |
| `shared/interceptors/error.interceptor.ts` | `libs/shared/interceptors/` | Direct migration |
| `shared/interceptors/mock-api.interceptor.ts` | `libs/shared/interceptors/` | Adapt for BmoAtlas mock data |
| `shared/services/error/error.service.ts` | `libs/shared/services/error/` | Direct migration |
| `shared/services/theme/theme.service.ts` | `libs/shared/services/theme/` | Direct migration, update storage key |
| `shared/components/load-wrapper/` | `libs/shared/components/load-wrapper/` | Migrate, then create new enterprise loader alongside |
| `shared/components/error-toast/` | `libs/shared/components/error-toast/` | Direct migration |
| Global styles (`styles.css`) | `libs/shared/styles/` | Extract as importable theme tokens |

### What stays in Shell only (not shared)

- Toolbar component
- Breadcrumb component
- Side menu component
- Shell layout orchestration

These are shell-specific layout components. They live under `apps/atlas/src/app/components/` and are NOT in the shared library because:
1. Only the shell uses them
2. MFEs should not know about shell layout
3. Keeps shared library lean and focused

---

## 4. Proposed Workspace Structure

```
BmoAtlas/
├── angular.json
├── package.json
├── tsconfig.json
├── tsconfig.spec.json
├── vitest.config.ts
├── .prettierrc
├── .editorconfig
├── .gitignore
├── documentation/
│   ├── cli-list.md
│   ├── configuration.md
│   └── HowToLaunch.md
├── plans/
│   └── bmo-atlas-architecture.md
│
├── libs/
│   ├── core/
│   │   ├── src/
│   │   │   ├── index.ts                          # Public API barrel
│   │   │   ├── base/
│   │   │   │   ├── component/
│   │   │   │   │   ├── component-base.ts
│   │   │   │   │   └── component-base.spec.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── domain-base.ts
│   │   │   │   │   ├── domain-base.spec.ts
│   │   │   │   │   └── domain-base.md
│   │   │   │   ├── hub/
│   │   │   │   │   ├── hub.ts
│   │   │   │   │   └── hub.spec.ts
│   │   │   │   └── service/
│   │   │   │       ├── service-base.ts
│   │   │   │       ├── service-base.spec.ts
│   │   │   │       └── service_base.md
│   │   │   ├── services/
│   │   │   │   ├── message-hub/
│   │   │   │   │   ├── message-hub.ts
│   │   │   │   │   ├── message-hub.md
│   │   │   │   │   ├── message-hub-1.spec.ts
│   │   │   │   │   └── message-hub-2.spec.ts
│   │   │   │   ├── state-hub/
│   │   │   │   │   ├── state-hub.ts
│   │   │   │   │   ├── state-hub.md
│   │   │   │   │   └── state-hub.spec.ts
│   │   │   │   ├── http-data/
│   │   │   │   │   ├── http-data.ts
│   │   │   │   │   ├── http-data.md
│   │   │   │   │   └── http-data.spec.ts
│   │   │   │   └── http-client-data/
│   │   │   │       ├── http-client-data.ts
│   │   │   │       ├── http-client-data.md
│   │   │   │       └── http-client-data.spec.ts
│   │   │   └── models/
│   │   │       └── test-models.ts                # Stock, StockList test domain models
│   │   ├── tsconfig.json
│   │   ├── tsconfig.lib.json
│   │   └── tsconfig.spec.json
│   │
│   └── shared/
│       ├── src/
│       │   ├── index.ts                          # Public API barrel
│       │   ├── components/
│       │   │   ├── error-toast/
│       │   │   │   ├── error-toast.ts
│       │   │   │   ├── error-toast.html
│       │   │   │   └── error-toast.css
│       │   │   ├── load-wrapper/
│       │   │   │   ├── load-wrapper.ts
│       │   │   │   ├── load-wrapper.html
│       │   │   │   ├── load-wrapper.scss
│       │   │   │   ├── load-wrapper.spec.ts
│       │   │   │   └── load-wrapper.md
│       │   │   ├── load-wrapper-client-data/
│       │   │   │   ├── load-wrapper-client-data.ts
│       │   │   │   ├── load-wrapper-client-data.html
│       │   │   │   ├── load-wrapper-client-data.scss
│       │   │   │   ├── load-wrapper-client-data.spec.ts
│       │   │   │   └── load-wrapper-client-data.md
│       │   │   └── atlas-loader/
│       │   │       ├── atlas-loader.ts
│       │   │       ├── atlas-loader.html
│       │   │       └── atlas-loader.css
│       │   ├── handlers/
│       │   │   └── global-error.handler.ts
│       │   ├── interceptors/
│       │   │   ├── error.interceptor.ts
│       │   │   └── mock-api.interceptor.ts
│       │   ├── services/
│       │   │   ├── error/
│       │   │   │   └── error.service.ts
│       │   │   └── theme/
│       │   │       └── theme.service.ts
│       │   └── styles/
│       │       ├── _tokens.css                   # Design tokens
│       │       ├── _reset.css                    # CSS reset layer
│       │       ├── _base.css                     # Base layer
│       │       ├── _layout.css                   # Layout primitives
│       │       ├── _components.css               # Shared component styles
│       │       ├── _utilities.css                # Utility classes
│       │       └── theme.css                     # Combined entry point
│       ├── tsconfig.json
│       ├── tsconfig.lib.json
│       └── tsconfig.spec.json
│
├── apps/
│   ├── atlas/                                    # Shell / Host
│   │   ├── src/
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   ├── styles.css                        # Imports shared theme
│   │   │   ├── bootstrap.ts                      # Native Federation bootstrap
│   │   │   └── app/
│   │   │       ├── app.ts
│   │   │       ├── app.html
│   │   │       ├── app.css
│   │   │       ├── app.config.ts
│   │   │       ├── app.routes.ts
│   │   │       ├── layout/
│   │   │       │   ├── toolbar/
│   │   │       │   │   └── toolbar.ts
│   │   │       │   ├── breadcrumb/
│   │   │       │   │   └── breadcrumb.ts
│   │   │       │   └── side-menu/
│   │   │       │       └── side-menu.ts
│   │   │       └── pages/
│   │   │           ├── area-shell/
│   │   │           │   └── area-shell.ts
│   │   │           └── home/
│   │   │               └── home.ts
│   │   ├── federation.config.js                  # Native Federation host config
│   │   ├── tsconfig.app.json
│   │   └── tsconfig.spec.json
│   │
│   ├── mfe-dashboard/                            # MFE 1 — Dashboard
│   │   ├── src/
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   ├── styles.css
│   │   │   ├── bootstrap.ts
│   │   │   └── app/
│   │   │       ├── app.ts
│   │   │       ├── app.html
│   │   │       ├── app.css
│   │   │       ├── app.config.ts
│   │   │       ├── app.routes.ts
│   │   │       └── pages/
│   │   │           ├── overview/
│   │   │           │   └── overview-container.ts
│   │   │           ├── analytics/
│   │   │           │   └── analytics-container.ts
│   │   │           └── reports/
│   │   │               └── reports-container.ts
│   │   ├── federation.config.js
│   │   ├── tsconfig.app.json
│   │   └── tsconfig.spec.json
│   │
│   ├── mfe-settings/                             # MFE 2 — Settings
│   │   ├── src/
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   ├── styles.css
│   │   │   ├── bootstrap.ts
│   │   │   └── app/
│   │   │       ├── app.ts
│   │   │       ├── app.html
│   │   │       ├── app.css
│   │   │       ├── app.config.ts
│   │   │       ├── app.routes.ts
│   │   │       └── pages/
│   │   │           ├── general/
│   │   │           │   └── general.ts
│   │   │           └── profile/
│   │   │               └── profile.ts
│   │   ├── federation.config.js
│   │   ├── tsconfig.app.json
│   │   └── tsconfig.spec.json
│   │
│   └── mfe-stocks/                               # MFE 3 — Stocks
│       ├── src/
│       │   ├── index.html
│       │   ├── main.ts
│       │   ├── styles.css
│       │   ├── bootstrap.ts
│       │   └── app/
│       │       ├── app.ts
│       │       ├── app.html
│       │       ├── app.css
│       │       ├── app.config.ts
│       │       ├── app.routes.ts
│       │       ├── models/
│       │       │   └── stock.models.ts
│       │       ├── service/
│       │       │   ├── data-stream.service.ts
│       │       │   └── stock-data.worker.ts
│       │       └── pages/
│       │           ├── summary/
│       │           │   ├── summary-container.ts
│       │           │   └── summary-presenter.ts
│       │           └── breakdown/
│       │               ├── breakdown-container.ts
│       │               ├── breakdown-list-presenter.ts
│       │               └── breakdown-table-presenter.ts
│       ├── federation.config.js
│       ├── tsconfig.app.json
│       └── tsconfig.spec.json
│
└── public/
    └── favicon.ico
```

### Path Aliases (tsconfig.json)

```json
{
  "paths": {
    "@core/*": ["libs/core/src/*"],
    "@core": ["libs/core/src/index.ts"],
    "@shared/*": ["libs/shared/src/*"],
    "@shared": ["libs/shared/src/index.ts"]
  }
}
```

---

## 5. Native Federation Strategy

### Architecture

```mermaid
graph LR
    subgraph Host - Atlas Shell
        ROUTER[Shell Router]
        LAYOUT[Layout - Toolbar + Menu + Breadcrumb]
        OUTLET[Router Outlet]
    end

    subgraph Remote - mfe-dashboard
        R1_ROUTES[Dashboard Routes]
        R1_PAGES[Overview / Analytics / Reports]
    end

    subgraph Remote - mfe-settings
        R2_ROUTES[Settings Routes]
        R2_PAGES[Settings Pages]
    end

    ROUTER -->|/dashboard/**| R1_ROUTES
    ROUTER -->|/settings/**| R2_ROUTES
    R1_ROUTES --> R1_PAGES
    R2_ROUTES --> R2_PAGES
```

### Host Configuration (atlas)

```javascript
// federation.config.js
module.exports = {
  name: 'atlas',
  shared: {
    '@angular/core': { singleton: true, strictVersion: true },
    '@angular/common': { singleton: true, strictVersion: true },
    '@angular/router': { singleton: true, strictVersion: true },
    '@angular/forms': { singleton: true, strictVersion: true },
    'rxjs': { singleton: true, strictVersion: true },
  }
};
```

### Remote Configuration (each MFE)

```javascript
// federation.config.js
module.exports = {
  name: 'mfe-dashboard',
  exposes: {
    './routes': './src/app/app.routes.ts',
  },
  shared: {
    // Same shared config as host
  }
};
```

### Shell Responsibilities

- Owns the top-level router
- Manages layout (toolbar, menu, breadcrumb)
- Loads MFE routes dynamically via `loadRemoteModule()`
- Propagates theme via CSS variables on `:root`
- Manages navigation state via `StateHub`
- Provides `MessageHub` as the cross-MFE communication channel

### Remote Responsibilities

- Expose a routes array (not a component)
- Own internal routing and navigation
- Communicate with shell via `MessageHub` for navigation sync
- Consume shared theme via CSS variables (no direct ThemeService coupling)
- Be independently buildable and servable

### Dependency Sharing Strategy

| Dependency | Strategy | Reason |
|-----------|----------|--------|
| `@angular/*` | singleton, strictVersion | Must be single instance |
| `rxjs` | singleton, strictVersion | Shared observables |
| `@core` | NOT shared via federation | Bundled into each app — avoids version drift |
| `@shared` | NOT shared via federation | Bundled into each app — keeps MFEs self-contained |

**Why not share `@core` and `@shared` via federation?**

When MFEs eventually move to separate repos, they will have their own copies of these libraries (published as npm packages or git submodules). Sharing them via federation creates tight runtime coupling. Instead, each app bundles its own copy, and the `MessageHub`/`StateHub` singletons are shared via the Angular DI tree (which IS shared because `@angular/core` is a singleton).

---

## 6. Routing Strategy

### Shell Routes

```typescript
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.ts').then(m => m.HomeComponent),
    data: { breadcrumb: 'Home' }
  },
  {
    path: 'dashboard',
    loadChildren: () => loadRemoteModule('mfe-dashboard', './routes')
      .then(m => m.routes),
    data: { breadcrumb: 'Dashboard' }
  },
  {
    path: 'settings',
    loadChildren: () => loadRemoteModule('mfe-settings', './routes')
      .then(m => m.routes),
    data: { breadcrumb: 'Settings' }
  },
  { path: '**', redirectTo: 'home' }
];
```

### MFE Internal Routes (mfe-dashboard)

```typescript
export const routes: Routes = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  {
    path: 'overview',
    loadComponent: () => import('./pages/overview/overview-container').then(m => m.OverviewContainer),
    data: { breadcrumb: 'Overview' }
  },
  {
    path: 'analytics',
    loadComponent: () => import('./pages/analytics/analytics-container').then(m => m.AnalyticsContainer),
    data: { breadcrumb: 'Analytics' }
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports-container').then(m => m.ReportsContainer),
    data: { breadcrumb: 'Reports' }
  }
];
```

### Deep Linking & Refresh

- URL `/dashboard/analytics` → shell loads `mfe-dashboard` remote → internal router resolves `analytics`
- Browser refresh preserves the full URL → Native Federation re-bootstraps → same page loads
- `withComponentInputBinding()` enables route params as component inputs

### Breadcrumb Synchronization

- Route `data.breadcrumb` on each route definition
- Shell subscribes to `Router.events` and walks the `ActivatedRoute` tree
- Builds breadcrumb array: `Home > Dashboard > Analytics`
- MFE routes contribute their `data.breadcrumb` automatically since they're part of the same router tree

---

## 7. Shared Library Strategy

### Core Library (`@core`)

**Purpose:** Infrastructure, base classes, and app-wide services that have NO UI.

**Exports:**
- `ComponentBase` — base class for container components
- `ServiceBase` — base class for services
- `Hub` — shared base providing `MessageHub` + `StateHub` access
- `Domain<T>`, `DomainList<T>` — rich domain model base classes
- `MessageHub` — signal-based pub/sub
- `StateHub` — reactive state management
- `HttpData<T>` — httpResource wrapper
- `HttpClientData<T>` — HttpClient wrapper

**Barrel export (`index.ts`):**
```typescript
// Base classes
export { ComponentBase } from './base/component/component-base';
export { ServiceBase } from './base/service/service-base';
export { Hub } from './base/hub/hub';
export { Domain, DomainList } from './base/domain/domain-base';
export type { DomainConstructor, DomainListConstructor } from './base/domain/domain-base';

// Services
export { MessageHub } from './services/message-hub/message-hub';
export type { ReceiveCallback } from './services/message-hub/message-hub';
export { StateHub } from './services/state-hub/state-hub';
export { HttpData } from './services/http-data/http-data';
export type { DataOptions, MutationOptions } from './services/http-data/http-data';
export { HttpClientData } from './services/http-client-data/http-client-data';
```

### Shared Library (`@shared`)

**Purpose:** Reusable UI components, services with UI concerns, interceptors, handlers, and theme infrastructure.

**Exports:**
- `LoadWrapper<T>` — data loading state component (for `HttpData` sources)
- `LoadWrapperClientData<T>` — data loading state component (for `HttpClientData` sources)
- `AtlasLoader` — enterprise loader component
- `ErrorToast` — error notification component
- `ErrorService` — error state management
- `ThemeService` — theme management (light/dark)
- `errorInterceptor` — HTTP error interceptor
- `GlobalErrorHandler` — global error handler
- Theme CSS files (importable)

---

## 8. Theme Architecture

### Strategy: CSS Variables + Cascade Layers + Design Tokens

```mermaid
graph TD
    TOKENS[Design Tokens - _tokens.css] --> RESET[Reset Layer - _reset.css]
    TOKENS --> BASE[Base Layer - _base.css]
    TOKENS --> LAYOUT[Layout Layer - _layout.css]
    TOKENS --> COMPONENTS[Components Layer - _components.css]
    TOKENS --> UTILITIES[Utilities Layer - _utilities.css]
    
    RESET --> THEME[theme.css - Combined Entry]
    BASE --> THEME
    LAYOUT --> THEME
    COMPONENTS --> THEME
    UTILITIES --> THEME
    
    THEME --> SHELL[Shell styles.css]
    THEME --> MFE1[MFE1 styles.css]
    THEME --> MFE2[MFE2 styles.css]
```

### Token Strategy

Extracted from AngularStockTicker's `styles.css` into `libs/shared/src/styles/_tokens.css`:

- **Typography tokens:** `--font-sans`, `--font-mono`, `--text-xs` through `--text-3xl`
- **Spacing tokens:** `--space-xs` through `--space-3xl`
- **Color tokens:** `--color-bg`, `--color-text`, `--color-primary`, etc.
- **Shadow tokens:** `--shadow-sm` through `--shadow-xl`
- **Radius tokens:** `--radius-sm` through `--radius-full`
- **Transition tokens:** `--transition-fast`, `--transition-base`, `--transition-slow`
- **Z-index tokens:** `--z-dropdown` through `--z-toast`

### Theme Switching

- Same `data-theme` attribute approach as AngularStockTicker
- `ThemeService` manages preference (light/dark/system)
- FOUC prevention script in `index.html`
- CSS variables swap on `:root[data-theme="dark"]`

### Style Isolation for MFEs

- MFEs use Angular's `ViewEncapsulation.Emulated` (default) for component styles
- Global theme tokens are inherited via CSS variables — no style leakage
- Each MFE imports `@shared/styles/theme.css` in its own `styles.css`
- No `::ng-deep` or global style pollution

### CSS Sharing Strategy

Each app's `styles.css`:
```css
@import '@shared/styles/theme.css';
/* App-specific global styles if any */
```

---

## 9. Communication Strategy — Shell ↔ MFEs

### Recommendation: `MessageHub` + `StateHub` (from AngularStockTicker)

This is the **strongest approach** because:

1. **Already proven** — AngularStockTicker has comprehensive tests for both services
2. **Signal-based** — Aligns with Angular 21's direction
3. **Automatic cleanup** — `DestroyRef`-based subscription management
4. **Re-entrancy safe** — Guards against publish-during-delivery
5. **Singleton via DI** — Since `@angular/core` is shared as singleton, `MessageHub` and `StateHub` (both `providedIn: 'root'`) are automatically shared across shell and all MFEs

### Communication Patterns

```mermaid
sequenceDiagram
    participant Shell
    participant MessageHub
    participant StateHub
    participant MFE

    Note over Shell,MFE: Navigation Sync
    MFE->>MessageHub: publish - nav:changed - route info
    MessageHub->>Shell: subscriber callback
    Shell->>Shell: Update menu + breadcrumb

    Note over Shell,MFE: State Sharing
    Shell->>StateHub: setState - nav:menu-collapsed - true
    MFE->>StateHub: getState - nav:menu-collapsed
    Note over MFE: Signal reactively updates

    Note over Shell,MFE: Theme Propagation
    Shell->>StateHub: setState - theme:current - dark
    Note over MFE: CSS variables update via ThemeService
```

### Defined Message Channels

| Channel | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `nav:route-changed` | MFE → Shell | `{ path, breadcrumbs }` | Sync breadcrumbs and menu |
| `nav:menu-navigate` | Shell → MFE | `{ targetRoute }` | Menu click triggers MFE navigation |
| `shell:menu-collapsed` | Shell → All | `boolean` | Menu collapse state |
| `shell:theme-changed` | Shell → All | `'light' or 'dark'` | Theme change notification |

### State Keys

| Key | Type | Owner | Purpose |
|-----|------|-------|---------|
| `nav:active-route` | `string` | Shell | Current full route path |
| `nav:breadcrumbs` | `BreadcrumbItem[]` | Shell | Current breadcrumb chain |
| `nav:menu-state` | `MenuState` | Shell | Menu expanded/collapsed + active items |
| `theme:preference` | `Theme` | Shell | Current theme preference |

### Why NOT RxJS Event Bus?

- Requires manual subscription management (no `DestroyRef` integration)
- No re-entrancy protection
- No sequence ordering guarantees
- `MessageHub` already provides all this with better Angular integration

### Why NOT Router Events Alone?

- Router events work for breadcrumbs but not for arbitrary shell↔MFE communication
- Cannot send custom payloads
- Cannot handle non-navigation events (theme changes, toolbar actions)
- **Use router events for breadcrumbs, `MessageHub` for everything else**

---

## 10. Testing Strategy

### Framework: Vitest 4.1.0 (matching AngularStockTicker)

### Configuration

- `@angular/build:unit-test` builder with `vitest.config.ts`
- Playwright browser provider for component tests
- `vitest/globals` for `describe`, `it`, `expect`, `vi`

### Test Structure

| Layer | Test Type | Location | Runner |
|-------|-----------|----------|--------|
| Core library | Unit tests | `libs/core/src/**/*.spec.ts` | Vitest |
| Shared library | Unit + Component tests | `libs/shared/src/**/*.spec.ts` | Vitest + Playwright |
| Shell | Component + Integration tests | `apps/atlas/src/**/*.spec.ts` | Vitest + Playwright |
| MFEs | Component tests | `apps/mfe-*/src/**/*.spec.ts` | Vitest + Playwright |

### Test Patterns (preserved from AngularStockTicker)

1. **Service tests:** `TestBed.configureTestingModule({})` → `TestBed.inject(Service)` → `TestBed.tick()`
2. **Component tests:** `TestBed.createComponent()` → `fixture.detectChanges()` → DOM assertions
3. **Manual DestroyRef:** Helper function for testing subscription cleanup
4. **HttpTesting:** `provideHttpClientTesting()` → `HttpTestingController` → `match()` → `flush()`
5. **Mock patterns:** `vi.fn()`, `vi.spyOn()`, signal-based mocks

### Per-Project Test Commands

```json
{
  "test:core": "ng test core",
  "test:shared": "ng test shared",
  "test:atlas": "ng test atlas",
  "test:mfe-dashboard": "ng test mfe-dashboard",
  "test:mfe-settings": "ng test mfe-settings",
  "test:all": "ng test core && ng test shared && ng test atlas"
}
```

---

## 11. Responsive / Layout Strategy

### Shell Layout Architecture

```
┌──────────────────────────────────────────────────────────┐
│  TOOLBAR  [Logo] [Title]           [Actions] [☰ Menu]    │
├──────────────────────────────────────────────────────────┤
│  BREADCRUMB   Home > Dashboard > Analytics               │
├────────┬─────────────────────────────────────────────────┤
│        │                                                  │
│  SIDE  │         MAIN CONTENT                            │
│  MENU  │         router-outlet                           │
│        │                                                  │
│  ├ Home│         MFE loads here                          │
│  ├ Dash│                                                  │
│  │ ├ Ov│                                                  │
│  │ ├ An│                                                  │
│  │ └ Re│                                                  │
│  └ Sett│                                                  │
│        │                                                  │
└────────┴─────────────────────────────────────────────────┘
```

### CSS Grid Layout

```css
.shell-layout {
  display: grid;
  grid-template-rows: auto auto 1fr;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "toolbar  toolbar"
    "crumbs   crumbs"
    "menu     content";
  min-height: 100dvh;
}

.shell-toolbar  { grid-area: toolbar; }
.shell-crumbs   { grid-area: crumbs; }
.shell-menu     { grid-area: menu; }
.shell-content  { grid-area: content; }
```

### Responsive Behavior

| Viewport | Menu | Toolbar | Breadcrumb |
|----------|------|---------|------------|
| Desktop wider than 1200px | Expanded sidebar 260px | Full with all actions | Full path |
| Laptop 900-1200px | Collapsed icons-only 60px | Full | Truncated |
| Tablet 600-900px | Hidden, overlay on toggle | Compact | Last 2 levels |
| Mobile under 600px | Hidden, full overlay | Minimal | Current only |

### Container Queries — not media queries

```css
.shell-content {
  container-type: inline-size;
  container-name: main-content;
}

/* MFE content adapts to its container, not the viewport */
@container main-content (width < 600px) {
  .card-grid { grid-template-columns: 1fr; }
}

@container main-content (width >= 600px) and (width < 900px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
}

@container main-content (width >= 900px) {
  .card-grid { grid-template-columns: repeat(3, 1fr); }
}
```

### Why Container Queries over Media Queries?

- MFEs do not know the viewport size — they only know their container
- When the side menu collapses, the content area grows — container queries react, media queries do not
- Future-proof: MFEs can be embedded in different layouts without CSS changes
- Better encapsulation: each component responds to its own available space

### Side Menu Behavior

- **Collapse trigger:** Button in toolbar top-right
- **Auto-collapse:** When container width under 900px, menu auto-collapses to icon-only mode
- **Overlay mode:** When container width under 600px, menu becomes an overlay panel
- **Thin scrollbar:** `scrollbar-width: thin; scrollbar-color: var(--color-border) transparent;`
- **Hierarchical items:** Expandable sections with CSS transitions
- **Active state sync:** Menu highlights current route via `StateHub` navigation state

---

## 12. Loader / Wait Cursor Design

### Recommendation: Pure CSS + SVG Hybrid

**Why this approach:**
- Pure CSS for animations — GPU-accelerated, no JS overhead
- SVG for the broken circle segments — precise, scalable, theme-aware
- `prefers-reduced-motion` support via CSS media query
- No Angular animation dependency — works in any context

### Implementation Plan

```html
<div class="atlas-loader" role="status" aria-label="Loading">
  <svg class="atlas-loader__rings" viewBox="0 0 100 100">
    <!-- Outer ring: clockwise -->
    <circle class="atlas-loader__outer" cx="50" cy="50" r="45"
            stroke-dasharray="70 30 50 30" />
    <!-- Inner ring: anti-clockwise -->
    <circle class="atlas-loader__inner" cx="50" cy="50" r="30"
            stroke-dasharray="40 20 30 20" />
  </svg>
  <span class="sr-only">Loading...</span>
</div>
```

```css
.atlas-loader__outer {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 3;
  animation: spin-cw 1.4s linear infinite;
}

.atlas-loader__inner {
  fill: none;
  stroke: var(--color-primary-light);
  stroke-width: 2.5;
  animation: spin-ccw 1s linear infinite;
}

@keyframes spin-cw  { to { transform: rotate(360deg); } }
@keyframes spin-ccw { to { transform: rotate(-360deg); } }

@media (prefers-reduced-motion: reduce) {
  .atlas-loader__outer,
  .atlas-loader__inner {
    animation: pulse 2s ease-in-out infinite;
  }
}
```

### Features

- **Dual rotating circles** with broken segments via `stroke-dasharray`
- **Theme-aware:** Uses CSS variables for colors
- **Accessible:** `role="status"`, `aria-label`, `.sr-only` text
- **Motion-safe:** Reduced motion fallback to gentle pulse
- **Reusable:** Standalone component in shared library
- **Sizes:** Support `sm`, `md`, `lg` via CSS custom property `--loader-size`

---

## 13. Angular Features and Patterns

### Recommended Patterns

| Pattern | Use | Rationale |
|---------|-----|-----------|
| **Standalone components** | All components | No NgModules — matches AngularStockTicker, Angular 21 default |
| **Signals** | All reactive state | Primary reactivity model in Angular 21 |
| **computed** | Derived state | Lazy, memoized, glitch-free |
| **effect** | Side effects | DOM updates, logging, external system sync |
| **input / output** | Component API | Signal-based inputs, type-safe outputs |
| **inject** | Dependency injection | Functional DI, no constructor injection |
| **Container/Presenter** | All pages | Containers manage state, presenters are pure UI |
| **ChangeDetectionStrategy.OnPush** | All components | Performance — matches AngularStockTicker |
| **Lazy loading** | All routes | loadComponent / loadChildren |
| **Feature-based folders** | MFE internal structure | Each feature is self-contained |

### Zoneless

BmoAtlas uses **zoneless change detection** (`provideZonelessChangeDetection()`) in all apps. This was validated to work correctly with Native Federation in Angular 21. All apps use signal-based reactivity with no Zone.js dependency.

### Tradeoffs

| Decision | Pro | Con |
|----------|-----|-----|
| Signals over RxJS | Simpler, synchronous reads, auto-tracking | Less powerful for complex async streams |
| Container/Presenter | Testable, reusable presenters | More files per feature |
| Standalone components | No module boilerplate, tree-shakable | Must manage imports per component |
| OnPush everywhere | Performance | Must use signals/immutable data correctly |

---

## 14. Build / Deployment Strategy

### Development

```bash
# Serve shell + all MFEs concurrently
npm run start:all

# Serve individually
ng serve atlas --port 4200
ng serve mfe-dashboard --port 4201
ng serve mfe-settings --port 4202
```

### Production Build

```bash
# Build all
ng build atlas --configuration production
ng build mfe-dashboard --configuration production
ng build mfe-settings --configuration production
```

### Deployment Topology

```mermaid
graph LR
    CDN[CDN / Static Host]
    
    subgraph Independent Deployments
        SHELL_DEPLOY[atlas/ - Shell]
        MFE1_DEPLOY[mfe-dashboard/ - MFE 1]
        MFE2_DEPLOY[mfe-settings/ - MFE 2]
    end
    
    CDN --> SHELL_DEPLOY
    CDN --> MFE1_DEPLOY
    CDN --> MFE2_DEPLOY
    
    SHELL_DEPLOY -->|import map| MFE1_DEPLOY
    SHELL_DEPLOY -->|import map| MFE2_DEPLOY
```

- Each app deploys to its own path on the CDN
- Shell federation.manifest.json points to remote URLs
- MFEs can be updated independently without redeploying the shell
- Version management via the manifest file

### Budget Configuration — matching AngularStockTicker

```json
{
  "budgets": [
    { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
    { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
  ]
}
```

---

## 15. Risks and Recommendations

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Native Federation + Angular 21 compatibility | Medium | Verify @angular-architects/native-federation supports Angular 21.2.0 before starting. If not, use the latest compatible version or fall back to module-federation-tools |
| Shared singleton services across MFEs | Medium | Ensure @angular/core is shared as singleton in federation config. Test that MessageHub and StateHub are truly shared |
| MFE style leakage | Low | Use ViewEncapsulation.Emulated default, CSS variables for theming, no global style mutations in MFEs |
| Deep linking after MFE extraction | Medium | Design routes with full URL paths from day one. Test deep linking with browser refresh |
| Library version drift when MFEs move to separate repos | High | Publish @core and @shared as npm packages private registry when MFEs are extracted. Use semantic versioning |
| Vitest + Native Federation interaction | Low | Test runner operates on source code, not federated bundles. No expected issues |
| Menu/breadcrumb sync complexity | Medium | Use StateHub for state, Router.events for breadcrumbs. Keep the contract simple |

### Recommendations

1. **Start with federation config validation** — Install Native Federation and verify it works with Angular 21 before writing any application code
2. **Build libraries first** — Core then Shared then Shell then MFEs in dependency order
3. **Test communication early** — Verify MessageHub singleton sharing across shell and MFE before building UI
4. **Keep MFE contracts minimal** — Only expose routes. No shared components between MFEs
5. **Document message channels** — Create a contract file listing all MessageHub channels and StateHub keys
6. **Use federation.manifest.json** — Dynamic remote URLs, not hardcoded in federation config

---

## 16. Items You May Be Missing

Based on my analysis, consider adding:

1. **Environment configuration** — How to manage API URLs, feature flags across shell and MFEs
2. **Authentication/Authorization** — How auth tokens propagate to MFEs via interceptor in shared library
3. **Error boundary per MFE** — If an MFE crashes, the shell should remain functional
4. **Loading states for MFE bootstrap** — Show the new AtlasLoader while a remote MFE is being fetched
5. **MFE health checks** — What happens if a remote MFE is unavailable? Fallback UI?
6. **Accessibility a11y strategy** — Focus management when navigating between MFEs, ARIA landmarks
7. **Internationalization i18n** — If needed in the future, plan the architecture now
8. **Performance monitoring** — How to track Core Web Vitals across MFE boundaries
9. **CI/CD pipeline design** — How to build/test/deploy independently
10. **Documentation standards** — JSDoc, README per library, architecture decision records

---

## 17. Step-by-Step Implementation Plan

### Phase 1: Workspace Foundation

1. Create Angular workspace: `ng new BmoAtlas --create-application=false`
2. Configure root tsconfig.json, .prettierrc, .editorconfig
3. Install and configure Vitest matching AngularStockTicker

### Phase 2: Core Library

4. Generate core library: `ng generate library core`
5. Migrate base classes: ComponentBase, ServiceBase, Hub, Domain, DomainList
6. Migrate core services: MessageHub, StateHub, HttpData, HttpClientData
7. Migrate all core tests
8. Configure path aliases @core and @core/*
9. Verify all tests pass

### Phase 3: Shared Library

10. Generate shared library: `ng generate library shared`
11. Extract theme CSS into libs/shared/src/styles/
12. Migrate shared services: ErrorService, ThemeService
13. Migrate shared components: LoadWrapper, ErrorToast
14. Migrate interceptors and handlers
15. Create new AtlasLoader component
16. Configure path aliases @shared and @shared/*
17. Verify all tests pass

### Phase 4: Native Federation Setup

18. Install @angular-architects/native-federation
19. Verify compatibility with Angular 21.2.0
20. Configure federation for the workspace

### Phase 5: Shell Application

21. Generate shell app: `ng generate application atlas`
22. Configure Native Federation host via federation.config.js
23. Create shell layout with CSS Grid
24. Create Toolbar component
25. Create Breadcrumb component
26. Create Side Menu component
27. Configure shell routing with loadRemoteModule placeholders
28. Implement navigation state management via StateHub
29. Implement breadcrumb sync via Router.events
30. Implement menu to route synchronization
31. Apply theme system
32. Add responsive behavior

### Phase 6: Example MFEs

33. Generate MFE 1: `ng generate application mfe-dashboard`
34. Configure Native Federation remote
35. Create 3 pages: Overview, Analytics, Reports
36. Add internal navigation with 3 top buttons
37. Implement navigation sync with shell via MessageHub
38. Verify deep linking and browser refresh
39. Generate MFE 2: `ng generate application mfe-settings`
40. Configure as simple MFE without complex internal routing

### Phase 7: Integration and Testing

41. Verify shell loads MFEs dynamically
42. Verify navigation sync between menu, MFE, and breadcrumb
43. Verify theme propagation
44. Verify deep linking across all routes
45. Run all tests across all projects
46. Document all CLI commands executed

---

**Awaiting your approval before implementation.**