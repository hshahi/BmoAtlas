# Configuration Guide

> How every piece of configuration fits together to make the BmoAtlas shell and its micro-frontends (MFEs) work as a single application — and what you need to do to add a new MFE.

---

## Table of Contents

- [Configuration Guide](#configuration-guide)
  - [Table of Contents](#table-of-contents)
  - [Architecture Overview](#architecture-overview)
  - [Workspace-Root Configuration](#workspace-root-configuration)
    - [angular.json](#angularjson)
    - [package.json Scripts](#packagejson-scripts)
    - [tsconfig.json (Root)](#tsconfigjson-root)
    - [vitest.config.ts](#vitestconfigts)
    - [.editorconfig \& .prettierrc](#editorconfig--prettierrc)
  - [Shell App (atlas) Configuration](#shell-app-atlas-configuration)
    - [federation.config.js (Shell)](#federationconfigjs-shell)
    - [federation.manifest.json](#federationmanifestjson)
    - [main.ts \& bootstrap.ts (Shell)](#maints--bootstrapts-shell)
    - [app.config.ts (Shell)](#appconfigts-shell)
    - [app.routes.ts (Shell)](#approutests-shell)
    - [tsconfig.app.json \& tsconfig.federation.json (Shell)](#tsconfigappjson--tsconfigfederationjson-shell)
    - [styles.css (Shell)](#stylescss-shell)
    - [index.html](#indexhtml)
  - [MFE App Configuration (Remotes)](#mfe-app-configuration-remotes)
    - [federation.config.js (Remote)](#federationconfigjs-remote)
    - [main.ts \& bootstrap.ts (Remote)](#maints--bootstrapts-remote)
    - [app.config.ts (Remote)](#appconfigts-remote)
    - [app.routes.ts (Remote)](#approutests-remote)
    - [tsconfig.app.json \& tsconfig.federation.json (Remote)](#tsconfigappjson--tsconfigfederationjson-remote)
    - [angular.json Entry (Remote)](#angularjson-entry-remote)
    - [styles.css (Remote)](#stylescss-remote)
    - [CORS Headers](#cors-headers)
  - [Cross-MFE Services \& Singleton Sharing](#cross-mfe-services--singleton-sharing)
    - [How `providedIn: 'root'` Works Across MFEs](#how-providedin-root-works-across-mfes)
    - [Key Services](#key-services)
    - [The `Hub` Base Class](#the-hub-base-class)
    - [Why Not `providedIn: 'platform'`?](#why-not-providedin-platform)
    - [Rule of Thumb](#rule-of-thumb)
  - [Shared Libraries (libs/)](#shared-libraries-libs)
  - [Port Allocation](#port-allocation)
  - [Step-by-Step: Adding a New MFE](#step-by-step-adding-a-new-mfe)
    - [1. Scaffold the App Directory](#1-scaffold-the-app-directory)
    - [2. Create federation.config.js](#2-create-federationconfigjs)
    - [3. Create main.ts](#3-create-maints)
    - [4. Create bootstrap.ts](#4-create-bootstrapts)
    - [5. Create app.config.ts](#5-create-appconfigts)
    - [6. Create app.routes.ts](#6-create-approutests)
    - [7. Create styles.css](#7-create-stylescss)
    - [8. Create index.html (for standalone dev)](#8-create-indexhtml-for-standalone-dev)
    - [9. Create tsconfig.app.json](#9-create-tsconfigappjson)
    - [10. Register in angular.json](#10-register-in-angularjson)
    - [11. Register in federation.manifest.json](#11-register-in-federationmanifestjson)
    - [12. Add Shell Route](#12-add-shell-route)
    - [13. Update package.json Scripts](#13-update-packagejson-scripts)
    - [14. Verify](#14-verify)
  - [Troubleshooting](#troubleshooting)
    - ["remoteEntry.json not found" or CORS errors](#remoteentryjson-not-found-or-cors-errors)
    - ["Shared module version mismatch"](#shared-module-version-mismatch)
    - ["Cannot find module '@core' or '@shared'"](#cannot-find-module-core-or-shared)
    - [tsconfig.federation.json conflicts](#tsconfigfederationjson-conflicts)
    - [Port already in use](#port-already-in-use)
    - [MFE routes not rendering](#mfe-routes-not-rendering)
  - [Configuration File Quick Reference](#configuration-file-quick-reference)

---

## Architecture Overview

BmoAtlas uses **Angular Native Federation** (`@angular-architects/native-federation`) to compose a **shell** application (`atlas`, port `4200`) with multiple **remote** micro-frontends. Each MFE is a standalone Angular application that exposes its route tree via federation. At runtime the shell lazy-loads remote route modules through `loadRemoteModule()`.

```
┌─────────────────────────────────────────────────┐
│  atlas (Shell) — port 4200                      │
│  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ mfe-dashboard │ mfe-settings │  mfe-???   │  │
│  │  port 4201    │  port 4202   │  port 420X │  │
│  └────────────┘  └────────────┘  └───────────┘  │
└─────────────────────────────────────────────────┘
```

Key design decisions:

- **Zoneless** — every app uses `provideZonelessChangeDetection()`.
- **Singleton sharing** — all Angular packages, RxJS, and tslib are shared as singletons via `shareAll()`.
- **Route-based federation** — each MFE exposes `'./routes'` pointing to its `app.routes.ts`.
- **Shared design system** — all apps import `@shared/styles/theme.css` for consistent theming.

---

## Workspace-Root Configuration

### angular.json

[`angular.json`](../angular.json) defines every project in the monorepo. Each project follows the same dual-builder pattern:

| Architect target | Builder | Purpose |
|---|---|---|
| `build` | `@angular-architects/native-federation:build` | Wraps the esbuild output with federation metadata |
| `esbuild` | `@angular/build:application` | The actual Angular build (esbuild-based) |
| `serve` | `@angular-architects/native-federation:build` | Wraps the dev-server with federation |
| `serve-original` | `@angular/build:dev-server` | The underlying Angular dev-server |

**Critical settings applied to every project:**

```jsonc
// build target — delegates to esbuild and points to the federation config
"build": {
  "builder": "@angular-architects/native-federation:build",
  "options": {
    "target": "<project>:esbuild",
    "federationConfig": "apps/<project>/federation.config.js"
  }
}

// esbuild target — the real Angular build
"esbuild": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "apps/<project>/src/main.ts",   // entry point
    "polyfills": ["es-module-shims"],           // required for import-maps
    "styles": ["apps/<project>/src/styles.css"]
  }
}

// serve target — federation-aware dev server
"serve": {
  "builder": "@angular-architects/native-federation:build",
  "options": {
    "target": "<project>:serve-original",
    "rebuildDelay": 0,
    "dev": true,
    "port": 0,                                  // federation picks its own port
    "federationConfig": "apps/<project>/federation.config.js"
  }
}
```

> **Note:** The shell (`atlas`) sets `sourceRoot: "."` (workspace root) so it can resolve `@core` and `@shared` path aliases. MFE projects set `sourceRoot` to their own `src/` directory.

### package.json Scripts

[`package.json`](../package.json) orchestrates multi-app development:

| Script | What it does |
|---|---|
| `dev` | Kills stale ports → cleans `dist/` and `.angular/` → starts **all** apps concurrently |
| `start:atlas` | Serves the shell on port **4200** |
| `start:dashboard` | Serves mfe-dashboard on port **4201** |
| `start:settings` | Serves mfe-settings on port **4202** |
| `start:stocks` | Serves mfe-stocks on port **4203** |
| `build` | Builds all four apps sequentially |
| `kill-ports` | Frees ports 4200–4203 before a fresh `dev` run |
| `clean` | Removes `dist/` and `.angular/` cache |
| `test` | Runs unit tests in watch mode (Chromium) |
| `test:once` | Single test run |
| `test:coverage` | Single run with v8 coverage → opens HTML report |
| `test:ci` | Headless mode for CI pipelines |

When adding a new MFE you must update:

1. The `dev` script — add a new `concurrently` slot.
2. Add `start:<name>` and `build:<name>` scripts.
3. Add the port to the `kill-ports` array.

### tsconfig.json (Root)

[`tsconfig.json`](../tsconfig.json) is the single source of truth for compiler options. Every app and lib extends it.

**Key settings:**

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@core/*": ["./libs/core/src/*"],
      "@core":   ["./libs/core/src/index.ts"],
      "@shared/*": ["./libs/shared/src/*"],
      "@shared":   ["./libs/shared/src/index.ts"]
    },
    "target": "ES2022",
    "module": "preserve",          // lets the bundler handle module resolution
    "strict": true,
    "isolatedModules": true,       // required for esbuild compatibility
    "experimentalDecorators": true,
    "types": ["vitest/globals"]
  },
  "angularCompilerOptions": {
    "strictTemplates": true,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true
  }
}
```

The `paths` aliases (`@core`, `@shared`) allow every app and lib to import shared code without relative path gymnastics. These aliases are resolved at build time by both TypeScript and the Angular/esbuild bundler.

### vitest.config.ts

[`vitest.config.ts`](../vitest.config.ts) configures unit testing with Vitest + Playwright browser mode:

```ts
export default defineConfig({
  optimizeDeps: {
    include: ['expect-type'],   // pre-bundle CJS dep for browser ESM compat
  },
  test: {
    globals: true,
    browser: {
      enabled: true,
      provider: playwright(),
      // Do NOT add `instances` here — the Angular CLI `--browsers=chromium`
      // flag (in angular.json / package.json scripts) controls which browser
      // is used. Adding `instances` causes duplicate browser launches.
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
```

**Key points:**

- **`optimizeDeps.include: ['expect-type']`** — the `expect-type` package (a transitive dependency of Vitest) only ships CJS. Without pre-bundling, the browser runner fails with `SyntaxError: does not provide an export named 'expectTypeOf'`.
- **No `instances` array** — the browser is specified by the Angular CLI's `--browsers=chromium` flag in the [`package.json`](../package.json) test scripts. Adding `instances` here would create a **second** browser, causing every test to run twice.

Tests are scoped to `libs/**/*.spec.ts` via the `test` architect target in [`angular.json`](../angular.json:100).

### .editorconfig & .prettierrc

- [`.editorconfig`](../.editorconfig) — 2-space indent, UTF-8, single quotes for `.ts`.
- [`.prettierrc`](../.prettierrc) — 100 char print width, single quotes, Angular HTML parser.

---

## Shell App (atlas) Configuration

### federation.config.js (Shell)

[`apps/atlas/federation.config.js`](../apps/atlas/federation.config.js)

```js
module.exports = withNativeFederation({
  name: 'atlas',
  // Shell does NOT have an `exposes` block — it only consumes remotes
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
  skip: ['rxjs/ajax', 'rxjs/fetch', 'rxjs/testing', 'rxjs/webSocket'],
});
```

- **`name: 'atlas'`** — identifies this as the host/shell.
- **No `exposes`** — the shell never exposes modules; it only loads them.
- **`shareAll()`** — shares every dependency as a singleton so the shell and all remotes use the same instance of Angular, RxJS, etc.
- **`skip`** — excludes rarely-used RxJS sub-packages from the shared scope to reduce bundle size.

### federation.manifest.json

[`apps/atlas/public/federation.manifest.json`](../apps/atlas/public/federation.manifest.json)

```json
{
  "mfe-dashboard": "http://localhost:4201/remoteEntry.json",
  "mfe-settings": "http://localhost:4202/remoteEntry.json"
}
```

This is the **runtime discovery file**. The shell reads it at startup to know where each remote lives. Each key must match the `name` in the remote's `federation.config.js`. Each value is the URL to the remote's `remoteEntry.json` (auto-generated by Native Federation).

**When adding a new MFE**, add its entry here with the correct port.

### main.ts & bootstrap.ts (Shell)

[`apps/atlas/src/main.ts`](../apps/atlas/src/main.ts) — initialises federation **before** Angular boots:

```ts
initFederation('federation.manifest.json')
  .then(() => import('./bootstrap'))
  .catch((err) => {
    console.error('Federation init failed, bootstrapping without federation:', err);
    return import('./bootstrap');  // graceful degradation
  });
```

[`apps/atlas/src/bootstrap.ts`](../apps/atlas/src/bootstrap.ts) — standard Angular standalone bootstrap:

```ts
bootstrapApplication(App, appConfig);
```

The two-file split (`main.ts` → `bootstrap.ts`) is **required** by Native Federation so that the import-map is established before any Angular code is loaded.

### app.config.ts (Shell)

[`apps/atlas/src/app/app.config.ts`](../apps/atlas/src/app/app.config.ts)

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
```

- **`provideZonelessChangeDetection()`** — no Zone.js; all change detection is signal/manual.
- **`withComponentInputBinding()`** — enables route params as component inputs.
- **`errorInterceptor`** and **`GlobalErrorHandler`** — imported from `@shared`.

### app.routes.ts (Shell)

[`apps/atlas/src/app/app.routes.ts`](../apps/atlas/src/app/app.routes.ts)

This is where MFE remotes are wired into the shell's route tree. The pattern for loading a remote:

```ts
{
  path: 'front-office',
  loadComponent: () => import('./pages/area-shell/area-shell').then(m => m.AreaShell),
  data: { breadcrumb: 'Front Office' },
  children: [
    {
      path: 'dashboard',
      loadChildren: () =>
        loadRemoteModule('mfe-dashboard', './routes').then(m => m.routes),
      data: { breadcrumb: 'Dashboard' },
    },
  ],
}
```

- **`loadRemoteModule('mfe-dashboard', './routes')`** — the first argument must match the key in `federation.manifest.json`; the second must match the key in the remote's `exposes` block.
- **`AreaShell`** — a pass-through component with just `<router-outlet />` that acts as the parent layout for an area containing multiple MFEs.
- **`data: { breadcrumb }`** — used by the breadcrumb component for navigation display.

### tsconfig.app.json & tsconfig.federation.json (Shell)

[`apps/atlas/tsconfig.app.json`](../apps/atlas/tsconfig.app.json) — extends root, includes `src/**/*.ts`.

[`apps/atlas/tsconfig.federation.json`](../apps/atlas/tsconfig.federation.json) — **auto-generated** by Native Federation. For the shell it additionally includes the shared library barrel files:

```jsonc
"include": [
  "src/**/*.ts",
  "..\\..\\libs\\core\\src\\index.ts",
  "..\\..\\libs\\shared\\src\\index.ts"
]
```

> ⚠️ Do **not** manually edit `tsconfig.federation.json` — it is regenerated on every build.

### styles.css (Shell)

[`apps/atlas/src/styles.css`](../apps/atlas/src/styles.css)

```css
@import '@shared/styles/theme.css';
```

All apps import the shared theme so the design system is consistent across shell and remotes.

### index.html

[`apps/atlas/src/index.html`](../apps/atlas/src/index.html) includes an inline script for **FOUC prevention** — it reads the saved theme from `localStorage` and applies `data-theme` before the first paint:

```html
<script>
  (function() {
    var theme = localStorage.getItem('bmo-atlas-theme');
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
</script>
```

---

## MFE App Configuration (Remotes)

Each MFE follows an identical pattern. Below uses `mfe-dashboard` as the reference example.

### federation.config.js (Remote)

[`apps/mfe-dashboard/federation.config.js`](../apps/mfe-dashboard/federation.config.js)

```js
module.exports = withNativeFederation({
  name: 'mfe-dashboard',
  exposes: {
    './routes': './apps/mfe-dashboard/src/app/app.routes.ts',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
  skip: ['rxjs/ajax', 'rxjs/fetch', 'rxjs/testing', 'rxjs/webSocket'],
});
```

**Key differences from the shell:**

| Property | Shell | Remote |
|---|---|---|
| `name` | `'atlas'` | `'mfe-<name>'` |
| `exposes` | _(none)_ | `{ './routes': './apps/mfe-<name>/src/app/app.routes.ts' }` |

- **`name`** must match the key used in `federation.manifest.json`.
- **`exposes`** declares what the remote makes available. The convention is to expose `'./routes'` pointing to the app's route file.
- **`shared`** and **`skip`** must be identical across shell and all remotes to avoid version mismatches.

### main.ts & bootstrap.ts (Remote)

[`apps/mfe-dashboard/src/main.ts`](../apps/mfe-dashboard/src/main.ts)

```ts
initFederation()          // no manifest — remotes don't consume other remotes
  .catch((err) => console.error(err))
  .then((_) => import('./bootstrap'))
  .catch((err) => console.error(err));
```

Note: `initFederation()` is called **without** a manifest argument. Remotes only need to initialise their own federation metadata; they don't load other remotes.

[`apps/mfe-dashboard/src/bootstrap.ts`](../apps/mfe-dashboard/src/bootstrap.ts) is identical to the shell's.

### app.config.ts (Remote)

[`apps/mfe-dashboard/src/app/app.config.ts`](../apps/mfe-dashboard/src/app/app.config.ts)

Identical to the shell — same providers, same zoneless setup, same error handling. This ensures the MFE can run standalone for development/testing.

### app.routes.ts (Remote)

[`apps/mfe-dashboard/src/app/app.routes.ts`](../apps/mfe-dashboard/src/app/app.routes.ts)

```ts
export const routes: Routes = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  {
    path: 'overview',
    loadComponent: () => import('./pages/overview/overview-container').then(m => m.OverviewContainer),
    data: { breadcrumb: 'Overview' },
  },
  // ... more child routes
];
```

- The `routes` array is the **named export** that the shell loads via `loadRemoteModule('mfe-dashboard', './routes').then(m => m.routes)`.
- Routes are **relative** — they don't know about the parent path (`/front-office/dashboard/`). The shell handles path composition.
- Each route should include `data: { breadcrumb }` for the shell's breadcrumb component.

### tsconfig.app.json & tsconfig.federation.json (Remote)

[`apps/mfe-dashboard/tsconfig.app.json`](../apps/mfe-dashboard/tsconfig.app.json) — extends root, includes `src/**/*.ts`.

[`apps/mfe-dashboard/tsconfig.federation.json`](../apps/mfe-dashboard/tsconfig.federation.json) — **auto-generated**. For remotes it includes all shared Angular/RxJS module paths so the federation build can analyse them. Do not edit manually.

### angular.json Entry (Remote)

Each MFE needs a full project entry in [`angular.json`](../angular.json). The structure mirrors the shell with these differences:

- **`sourceRoot`** — set to `apps/mfe-<name>/src` (not `"."` like the shell).
- **No `index` property** in the `esbuild` options (MFEs don't need an index.html when loaded as remotes, though they have one for standalone dev).
- **`serve-original` port** — each MFE gets a unique port.
- **CORS headers** — remotes must include `"Access-Control-Allow-Origin": "*"` in their `serve-original` options so the shell can fetch their `remoteEntry.json` cross-origin during development.

```jsonc
"serve-original": {
  "builder": "@angular/build:dev-server",
  "options": {
    "port": 4201,
    "headers": {
      "Access-Control-Allow-Origin": "*"   // ← required for remotes
    }
  }
}
```

### styles.css (Remote)

[`apps/mfe-dashboard/src/styles.css`](../apps/mfe-dashboard/src/styles.css)

```css
@import '@shared/styles/theme.css';
```

Same as the shell — ensures consistent theming when running standalone.

### CORS Headers

During local development the shell (port 4200) fetches `remoteEntry.json` from each remote (ports 4201, 4202, etc.). Browsers block this unless the remote's dev server sends `Access-Control-Allow-Origin: *`. This is configured in the `serve-original` target's `headers` option in `angular.json`.

> The shell does **not** need CORS headers — only remotes do.

---

## Cross-MFE Services & Singleton Sharing

### How `providedIn: 'root'` Works Across MFEs

A common concern with micro-frontends is whether `providedIn: 'root'` services create separate instances per MFE. In BmoAtlas, this is **not** a problem because of how the architecture is configured:

1. **Route-based loading** — MFE routes are loaded as **children** of the shell's router via `loadRemoteModule()`. They don't bootstrap separate Angular applications; they load route modules into the shell's existing application. This means they share the shell's root injector.

2. **`shareAll({ singleton: true })`** — the [`federation.config.js`](../apps/atlas/federation.config.js) in every app uses `shareAll({ singleton: true, strictVersion: true })`. This ensures Angular, RxJS, and all shared libraries are loaded **once** and reused. The `@Injectable({ providedIn: 'root' })` decorator in a shared singleton module resolves to the **same** root injector.

3. **Single `node_modules`** — all apps share the same root [`package.json`](../package.json) and `node_modules/`, so there are no version mismatches.

As a result, [`MessageHub`](../libs/core/src/services/message-hub/message-hub.ts:43) and [`StateHub`](../libs/core/src/services/state-hub/state-hub.ts:19) use `providedIn: 'root'` and are automatically shared across the shell and all MFEs.

### Key Services

| Service | Scope | File | Purpose |
|---|---|---|---|
| [`MessageHub`](../libs/core/src/services/message-hub/message-hub.ts:43) | `root` | `libs/core/src/services/message-hub/` | Signal-based pub/sub for cross-component/cross-MFE events |
| [`StateHub`](../libs/core/src/services/state-hub/state-hub.ts:19) | `root` | `libs/core/src/services/state-hub/` | Reactive key-value state store shared across all MFEs |
| [`ErrorService`](../libs/shared/src/services/error/error.service.ts:12) | `root` | `libs/shared/src/services/error/` | Centralised error collection and auto-dismiss |
| [`ThemeService`](../libs/shared/src/services/theme/theme.service.ts:8) | `root` | `libs/shared/src/services/theme/` | Theme preference management (light/dark) |

### The `Hub` Base Class

The [`Hub`](../libs/core/src/base/hub/hub.ts:16) abstract class (extended by [`ServiceBase`](../libs/core/src/base/service/service-base.ts:4) and [`ComponentBase`](../libs/core/src/base/component/component-base.ts)) lazily resolves `MessageHub` and `StateHub` via `Injector.get()`. Any component or service that extends `Hub` — regardless of which MFE it lives in — gets the **same** shared instances because the services are singletons in the shared module scope.

### Why Not `providedIn: 'platform'`?

You might consider `providedIn: 'platform'` for cross-MFE services. However, this causes issues:

- **`effect()` requires the application injector** — `MessageHub` creates Angular `effect()` instances internally. The platform injector doesn't have `ChangeDetectionScheduler`, so effects fail with `NG0201`.
- **Test isolation** — platform-scoped services persist across `TestBed` resets, causing state leakage between tests.
- **Not needed** — since MFE routes load into the shell's injector tree (not separate `bootstrapApplication()` calls), `providedIn: 'root'` already provides singleton behaviour across all MFEs.

### Rule of Thumb

| Need | Use |
|---|---|
| Shared singleton across shell + MFEs | `providedIn: 'root'` in a shared lib with `shareAll({ singleton: true })` |
| Not a singleton (created per component) | No `providedIn`; provide in component's `providers` array |

---

## Shared Libraries (libs/)

| Library | Path Alias | Purpose |
|---|---|---|
| `@core` | `libs/core/src/` | Base classes (`ComponentBase`, `ServiceBase`, `Hub`, `Domain`), services (`MessageHub`, `StateHub`, `HttpData`, `HttpClientData`) |
| `@shared` | `libs/shared/src/` | UI components (`ErrorToast`, `LoadWrapper`, `LoadWrapperClientData`, `AtlasLoader`), services (`ErrorService`, `ThemeService`), interceptors, handlers, and the **design-system CSS** |

Both libraries:

- Have their own [`tsconfig.json`](../libs/core/tsconfig.json) extending the root.
- Are referenced via the root `tsconfig.json` `paths` aliases.
- Are **not** published as npm packages — they are resolved at build time via TypeScript path mapping.

The shared styles live in `libs/shared/src/styles/` and are imported by every app's `styles.css`:

```
libs/shared/src/styles/
├── _base.css
├── _components.css
├── _layout.css
├── _reset.css
├── _tokens.css       ← CSS custom properties (design tokens)
├── _utilities.css
└── theme.css          ← barrel that imports all partials
```

---

## Port Allocation

| App | Port | Role |
|---|---|---|
| `atlas` | **4200** | Shell (host) |
| `mfe-dashboard` | **4201** | Remote |
| `mfe-settings` | **4202** | Remote |
| `mfe-stocks` | **4203** | Remote |
| _(next MFE)_ | **4204** | Remote |

Ports are configured in `angular.json` under each project's `serve-original.options.port`.

---

## Step-by-Step: Adding a New MFE

Follow these steps to create a new micro-frontend called `mfe-<name>` (e.g., `mfe-reports`).

### 1. Scaffold the App Directory

Create the folder structure under `apps/mfe-<name>/`:

```
apps/mfe-<name>/
├── federation.config.js
├── tsconfig.app.json
├── tsconfig.federation.json      ← will be auto-generated on first build
├── tsconfig.spec.json
├── public/
│   └── favicon.ico
└── src/
    ├── main.ts
    ├── bootstrap.ts
    ├── index.html
    ├── styles.css
    └── app/
        ├── app.ts
        ├── app.html
        ├── app.css
        ├── app.config.ts
        ├── app.routes.ts
        └── pages/
            └── <your-pages>/
```

> **Tip:** Copy an existing MFE (e.g., `mfe-dashboard`) and rename.

### 2. Create federation.config.js

```js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'mfe-<name>',

  exposes: {
    './routes': './apps/mfe-<name>/src/app/app.routes.ts',
  },

  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
    }),
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],
});
```

### 3. Create main.ts

```ts
import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch((err) => console.error(err))
  .then((_) => import('./bootstrap'))
  .catch((err) => console.error(err));
```

### 4. Create bootstrap.ts

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

### 5. Create app.config.ts

```ts
import { ApplicationConfig, ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor, GlobalErrorHandler } from '@shared';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
```

### 6. Create app.routes.ts

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '<default-page>', pathMatch: 'full' },
  {
    path: '<default-page>',
    loadComponent: () => import('./pages/<page>/<page>').then(m => m.<PageComponent>),
    data: { breadcrumb: '<Page Name>' },
  },
];
```

### 7. Create styles.css

```css
@import '@shared/styles/theme.css';

/* MFE-specific global styles */
```

### 8. Create index.html (for standalone dev)

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MFE <Name></title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <script>
    (function() {
      try {
        var theme = localStorage.getItem('bmo-atlas-theme');
        if (theme === 'dark' || theme === 'light') {
          document.documentElement.setAttribute('data-theme', theme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      } catch(e) {}
    })();
  </script>
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

### 9. Create tsconfig.app.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/app",
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts"]
}
```

### 10. Register in angular.json

Add a new project entry. Use the next available port (e.g., `4203`):

```jsonc
"mfe-<name>": {
  "projectType": "application",
  "schematics": {
    "@schematics/angular:component": { "skipTests": true }
  },
  "root": "apps/mfe-<name>",
  "sourceRoot": "apps/mfe-<name>/src",
  "prefix": "app",
  "architect": {
    "build": {
      "builder": "@angular-architects/native-federation:build",
      "options": {
        "target": "mfe-<name>:esbuild",
        "federationConfig": "apps/mfe-<name>/federation.config.js"
      },
      "configurations": {
        "production": { "target": "mfe-<name>:esbuild:production" },
        "development": { "target": "mfe-<name>:esbuild:development" }
      },
      "defaultConfiguration": "production"
    },
    "esbuild": {
      "builder": "@angular/build:application",
      "options": {
        "browser": "apps/mfe-<name>/src/main.ts",
        "tsConfig": "apps/mfe-<name>/tsconfig.app.json",
        "assets": [{ "glob": "**/*", "input": "apps/mfe-<name>/public" }],
        "styles": ["apps/mfe-<name>/src/styles.css"],
        "polyfills": ["es-module-shims"]
      },
      "configurations": {
        "production": {
          "budgets": [
            { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
            { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
          ],
          "outputHashing": "all"
        },
        "development": {
          "optimization": false,
          "extractLicenses": false,
          "sourceMap": true
        }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "builder": "@angular-architects/native-federation:build",
      "options": {
        "target": "mfe-<name>:serve-original",
        "rebuildDelay": 0,
        "dev": true,
        "port": 0,
        "federationConfig": "apps/mfe-<name>/federation.config.js"
      }
    },
    "serve-original": {
      "builder": "@angular/build:dev-server",
      "options": {
        "port": 420X,
        "headers": { "Access-Control-Allow-Origin": "*" }
      },
      "configurations": {
        "production": { "buildTarget": "mfe-<name>:esbuild:production" },
        "development": { "buildTarget": "mfe-<name>:esbuild:development" }
      },
      "defaultConfiguration": "development"
    }
  }
}
```

### 11. Register in federation.manifest.json

Add the new remote to [`apps/atlas/public/federation.manifest.json`](../apps/atlas/public/federation.manifest.json):

```json
{
  "mfe-dashboard": "http://localhost:4201/remoteEntry.json",
  "mfe-settings": "http://localhost:4202/remoteEntry.json",
  "mfe-<name>": "http://localhost:420X/remoteEntry.json"
}
```

### 12. Add Shell Route

In [`apps/atlas/src/app/app.routes.ts`](../apps/atlas/src/app/app.routes.ts), add a route that loads the new remote:

```ts
{
  path: '<area-path>',
  loadComponent: () => import('./pages/area-shell/area-shell').then(m => m.AreaShell),
  data: { breadcrumb: '<Area Name>' },
  children: [
    {
      path: '<mfe-path>',
      loadChildren: () =>
        loadRemoteModule('mfe-<name>', './routes').then(m => m.routes),
      data: { breadcrumb: '<MFE Display Name>' },
    },
  ],
}
```

If the MFE belongs to an **existing area** (e.g., `front-office`), just add a new child route to that area's `children` array instead of creating a new parent.

### 13. Update package.json Scripts

Add start/build scripts and update the `dev` and `kill-ports` commands:

```jsonc
{
  "scripts": {
    // Add these:
    "start:<name>": "ng serve mfe-<name>",
    "build:<name>": "ng build mfe-<name>",

    // Update dev — add a new concurrently slot:
    "dev": "npm run kill-ports && npm run clean && concurrently --kill-others -n dashboard,settings,<name>,shell -c blue,magenta,yellow,green \"npm run start:dashboard\" \"npm run start:settings\" \"npm run start:<name>\" \"npm run start:atlas\"",

    // Update kill-ports — add the new port:
    "kill-ports": "node -e \"const k=require('kill-port');[4200,4201,4202,420X].forEach(p=>k(p).catch(()=>{}))\""
  }
}
```

### 14. Verify

1. Run `npm run dev` — all apps should start without errors.
2. Navigate to `http://localhost:4200/<area-path>/<mfe-path>` — the MFE's routes should render inside the shell.
3. Run `npm run start:<name>` alone — the MFE should work standalone at `http://localhost:420X`.

---

## Troubleshooting

### "remoteEntry.json not found" or CORS errors

- Ensure the MFE dev server is running.
- Verify the port in [`federation.manifest.json`](../apps/atlas/public/federation.manifest.json) matches the port in [`angular.json`](../angular.json).
- Confirm `"Access-Control-Allow-Origin": "*"` is set in the remote's `serve-original.options.headers`.

### "Shared module version mismatch"

- All apps must use the same `shared` and `skip` configuration in their `federation.config.js`.
- Run `npm install` to ensure all apps resolve the same dependency versions from the single root `package.json`.

### "Cannot find module '@core' or '@shared'"

- Check that the root [`tsconfig.json`](../tsconfig.json) `paths` aliases are correct.
- Ensure the app's `tsconfig.app.json` extends `../../tsconfig.json`.

### tsconfig.federation.json conflicts

- This file is **auto-generated** by Native Federation on every build. Do not edit it manually.
- If it gets corrupted, delete it and rebuild — it will be regenerated.

### Port already in use

- Run `npm run kill-ports` before starting, or use `npm run dev` which does this automatically.

### MFE routes not rendering

- Verify the `name` in the remote's `federation.config.js` matches the key in `federation.manifest.json`.
- Verify the `exposes` key (`'./routes'`) matches what `loadRemoteModule()` requests in the shell's routes.
- Ensure the remote's `app.routes.ts` exports a `routes` constant (not default export).

---

## Configuration File Quick Reference

| File | Location | Purpose | Edit manually? |
|---|---|---|---|
| `angular.json` | Root | Project definitions, builders, ports | ✅ Yes |
| `package.json` | Root | Scripts, dependencies | ✅ Yes |
| `tsconfig.json` | Root | Shared compiler options, path aliases | ✅ Yes |
| `vitest.config.ts` | Root | Test runner configuration | ✅ Yes |
| `federation.config.js` | Each app | Federation name, exposes, shared deps | ✅ Yes |
| `federation.manifest.json` | `apps/atlas/public/` | Runtime remote discovery (URLs) | ✅ Yes |
| `tsconfig.federation.json` | Each app | Auto-generated shared module includes | ❌ No |
| `tsconfig.app.json` | Each app | App-specific TS config (extends root) | ✅ Yes |
| `main.ts` | Each app | Federation init → bootstrap | ✅ Yes |
| `bootstrap.ts` | Each app | Angular standalone bootstrap | ✅ Yes |
| `app.config.ts` | Each app | Angular providers | ✅ Yes |
| `app.routes.ts` | Each app | Route definitions (exposed by remotes) | ✅ Yes |
| `styles.css` | Each app | Global styles (imports shared theme) | ✅ Yes |
| `index.html` | Each app | HTML shell (theme FOUC script) | ✅ Yes |