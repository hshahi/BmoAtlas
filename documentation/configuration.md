# Configuration Guide

> How every piece of configuration fits together to make the BmoAtlas application work — and what you need to do to add a new feature area.

BmoAtlas is a **single Angular application** (`shell`) that lazy-loads feature areas as route bundles and shares two libraries. It is a standard Angular 21 workspace — **no micro-frontends, no Native Federation**.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Workspace-Root Configuration](#workspace-root-configuration)
  - [angular.json](#angularjson)
  - [package.json Scripts](#packagejson-scripts)
  - [tsconfig.json (Root)](#tsconfigjson-root)
  - [vitest.config.ts](#vitestconfigts)
- [Shell Application](#shell-application)
  - [main.ts](#maints)
  - [app.config.ts](#appconfigts)
  - [app.routes.ts](#approutests)
  - [tsconfig.app.json](#tsconfigappjson)
  - [styles.css](#stylescss)
  - [index.html](#indexhtml)
- [Feature Areas](#feature-areas)
- [Shared Libraries (libs/)](#shared-libraries-libs)
- [Services & Singleton Sharing](#services--singleton-sharing)
- [Step-by-Step: Adding a New Feature Area](#step-by-step-adding-a-new-feature-area)
- [Troubleshooting](#troubleshooting)
- [Configuration File Quick Reference](#configuration-file-quick-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  shell  (application, port 4200)   projects/shell            │
│  toolbar · side menu · breadcrumb · <router-outlet/>         │
│                                                             │
│  lazy route bundles (loadChildren → import('@features/…')):  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ dashboard  │  │  settings  │  │   stocks   │  projects/   │
│  └────────────┘  └────────────┘  └────────────┘  features/   │
│                                                             │
│  shared code:  @core (libs/core) · @shared (libs/shared)     │
└─────────────────────────────────────────────────────────────┘
```

Key design decisions:

- **One application** — the shell is the only buildable/servable project. Feature areas are folders of routes + pages, pulled in via TypeScript path aliases and emitted as **lazy chunks**.
- **Zoneless** — `provideZonelessChangeDetection()`.
- **Standalone + signals** — standalone components, signal inputs, `OnPush`.
- **Shared design system** — the shell imports `@shared/styles/theme.css`; feature routes render in the same document and inherit the `:root` theme tokens.
- **AG Grid** — registered once at bootstrap with a token-driven theme (see [CssTheme.md](./CssTheme.md#ag-grid-integration)).

---

## Workspace-Root Configuration

### angular.json

[`angular.json`](../angular.json) defines a single project, `shell`, with the standard Angular builders:

| Architect target | Builder | Purpose |
|---|---|---|
| `build` | `@angular/build:application` | The esbuild-based Angular build |
| `serve` | `@angular/build:dev-server` | Dev server on port **4200** |
| `test` | `@angular/build:unit-test` | Vitest runner over the library specs |

```jsonc
"shell": {
  "projectType": "application",
  "root": "projects/shell",
  "sourceRoot": "projects/shell/src",
  "architect": {
    "build": {
      "builder": "@angular/build:application",
      "options": {
        "browser": "projects/shell/src/main.ts",
        "index": "projects/shell/src/index.html",
        "tsConfig": "projects/shell/tsconfig.app.json",
        "assets": [{ "glob": "**/*", "input": "projects/shell/public" }],
        "styles": ["projects/shell/src/styles.css"]
      }
    },
    "serve": { "builder": "@angular/build:dev-server", "options": { "port": 4200 } },
    "test":  { "builder": "@angular/build:unit-test", "options": {
      "buildTarget": "shell:build", "runnerConfig": "vitest.config.ts",
      "tsConfig": "tsconfig.spec.json", "include": ["libs/**/*.spec.ts"] } }
  }
}
```

There is no federation builder, no `polyfills` entry (zoneless — no Zone.js), and no per-feature project.

### package.json Scripts

[`package.json`](../package.json):

| Script | What it does |
|---|---|
| `start` / `dev` / `start:shell` | `ng serve shell` → http://localhost:4200 |
| `build` / `build:shell` | `ng build shell` (production) → `dist/shell/browser/` |
| `clean` | Removes `dist/` and `.angular/` cache |
| `test` | Unit tests in watch mode (Chromium) |
| `test:once` / `test:coverage` / `test:ci` | Single run / with coverage / headless |

There are no per-app dev servers, ports, or `concurrently`/`kill-port` orchestration — it's one server.

### tsconfig.json (Root)

[`tsconfig.json`](../tsconfig.json) holds the shared compiler options and the path aliases every project uses:

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@core/*":   ["./libs/core/src/*"],
      "@core":     ["./libs/core/src/index.ts"],
      "@shared/*": ["./libs/shared/src/*"],
      "@shared":   ["./libs/shared/src/index.ts"],
      "@features/dashboard": ["./projects/features/dashboard/routes.ts"],
      "@features/settings":  ["./projects/features/settings/routes.ts"],
      "@features/stocks":    ["./projects/features/stocks/routes.ts"]
    },
    "target": "ES2022",
    "module": "preserve",
    "strict": true,
    "isolatedModules": true,
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

- **`@core` / `@shared`** — the shared libraries.
- **`@features/*`** — each feature area's `routes.ts`. The shell lazy-loads these via `import('@features/<name>')`; the alias lets the file live outside the shell's `src/` while still being compiled into the shell build (the same mechanism that lets `@core`/`@shared` resolve).

### vitest.config.ts

[`vitest.config.ts`](../vitest.config.ts) configures Vitest + Playwright browser mode:

```ts
export default defineConfig({
  optimizeDeps: { include: ['expect-type'] },
  test: {
    globals: true,
    browser: { enabled: true, provider: playwright() },
    coverage: { provider: 'v8', reporter: ['text', 'html'], reportsDirectory: './coverage' },
  },
});
```

- **`optimizeDeps.include: ['expect-type']`** — pre-bundles a CJS transitive dep for browser ESM compatibility.
- The browser is chosen by the Angular CLI `--browsers=chromium` flag in the test scripts — do **not** add an `instances` array here (it would launch a second browser and double every test).

Tests are scoped to `libs/**/*.spec.ts` via the `test` target's `include`.

---

## Shell Application

Everything the shell needs lives in `projects/shell`.

### main.ts

[`projects/shell/src/main.ts`](../projects/shell/src/main.ts) — a plain standalone bootstrap (no federation init):

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { registerAtlasGrid } from '@shared';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerAtlasGrid();          // AG Grid modules + token-driven theme
bootstrapApplication(App, appConfig).catch(err => console.error(err));
```

### app.config.ts

[`projects/shell/src/app/app.config.ts`](../projects/shell/src/app/app.config.ts)

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

These root providers are shared by every lazy feature route (they load into the shell's injector), so features don't declare their own `app.config`.

### app.routes.ts

[`projects/shell/src/app/app.routes.ts`](../projects/shell/src/app/app.routes.ts) wires the feature areas as lazy children:

```ts
{
  path: 'front-office',
  loadComponent: () => import('./pages/area-shell/area-shell').then(m => m.AreaShell),
  data: { breadcrumb: 'Front Office' },
  children: [
    { path: 'dashboard', loadChildren: () => import('@features/dashboard').then(m => m.routes), data: { breadcrumb: 'Dashboard' } },
    { path: 'settings',  loadChildren: () => import('@features/settings').then(m => m.routes),  data: { breadcrumb: 'Settings' } },
    { path: 'stocks',    loadChildren: () => import('@features/stocks').then(m => m.routes),    data: { breadcrumb: 'Stocks' } },
  ],
}
```

- **`import('@features/<name>')`** resolves via the tsconfig path alias to that feature's `routes.ts` and becomes its own lazy chunk.
- **`AreaShell`** is a pass-through component (`<router-outlet/>`) that groups related feature routes under one area.
- **`data: { breadcrumb }`** feeds the breadcrumb component.

### tsconfig.app.json

[`projects/shell/tsconfig.app.json`](../projects/shell/tsconfig.app.json) extends the root and includes `src/**/*.ts`. Feature files (outside `src/`) are compiled because they are imported via the `@features/*` aliases — the same way `@core`/`@shared` are pulled in.

### styles.css

[`projects/shell/src/styles.css`](../projects/shell/src/styles.css) is a single import:

```css
@import '@shared/styles/theme.css';
```

### index.html

[`projects/shell/src/index.html`](../projects/shell/src/index.html) contains the inline **FOUC-prevention** script that applies the saved `data-theme` before first paint. Its allow-list must stay in sync with the `THEMES` array in `theme.service.ts` (see [CssTheme.md](./CssTheme.md#fouc-prevention--inline-script)).

---

## Feature Areas

A feature area under `projects/features/<name>/` is just:

```
projects/features/<name>/
├── routes.ts          ← exports `routes` (the lazy route tree)
└── pages/
    └── <page>/<page>.ts
```

`routes.ts` uses ordinary lazy component loading:

```ts
export const routes: Routes = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  { path: 'overview', loadComponent: () => import('./pages/overview/overview-container').then(m => m.OverviewContainer), data: { breadcrumb: 'Overview' } },
];
```

Feature areas have **no** `app.ts`, `app.config.ts`, `main.ts`, `index.html`, `federation.config.js`, or `angular.json` entry. They rely on the shell's providers and render inside the shell's outlet. The `stocks` area additionally contains `components/`, `models/`, and `service/` folders it owns.

---

## Shared Libraries (libs/)

| Library | Path Alias | Purpose |
|---|---|---|
| `@core` | `libs/core/src/` | Base classes (`ComponentBase`, `ServiceBase`, `Hub`, `Domain`), services (`MessageHub`, `StateHub`, `HttpData`, `HttpClientData`) |
| `@shared` | `libs/shared/src/` | UI components (`ErrorToast`, `LoadWrapper`, `LoadWrapperClientData`, `AtlasLoader`), services (`ErrorService`, `ThemeService`), interceptors, the AG Grid theme (`registerAtlasGrid`), and the **design-system CSS** (`styles/`) |

Both extend the root `tsconfig.json`, are resolved via the `paths` aliases (not published to npm), and compile into the shell build.

---

## Services & Singleton Sharing

Because there is a single application and a single injector tree, `@Injectable({ providedIn: 'root' })` services are natural singletons shared across the shell and every lazy feature — no special configuration.

| Service | Scope | Purpose |
|---|---|---|
| `MessageHub` | `root` | Signal-based pub/sub for cross-component events |
| `StateHub` | `root` | Reactive key-value state store |
| `ErrorService` | `root` | Centralised error collection + auto-dismiss |
| `ThemeService` | `root` | Theme preference management + persistence |

The [`Hub`](../libs/core/src/base/hub/hub.ts) base class (extended by `ServiceBase` and `ComponentBase`) lazily resolves `MessageHub`/`StateHub`, so anything extending it gets the same shared instances.

> Use `providedIn: 'root'` for shared singletons. Avoid `providedIn: 'platform'` — `MessageHub` uses `effect()`, which needs the application injector's `ChangeDetectionScheduler`.

---

## Step-by-Step: Adding a New Feature Area

Add a feature area called `<name>` (e.g. `reports`). No federation, ports, or `angular.json`/`package.json` changes are needed.

**1. Create the folder + routes:**

```
projects/features/<name>/
├── routes.ts
└── pages/<page>/<page>.ts
```

```ts
// projects/features/<name>/routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '<default>', pathMatch: 'full' },
  { path: '<default>', loadComponent: () => import('./pages/<page>/<page>').then(m => m.<PageComponent>), data: { breadcrumb: '<Page>' } },
];
```

Pages are standalone components importing `@core`/`@shared` as needed.

**2. Add the path alias** in [`tsconfig.json`](../tsconfig.json):

```jsonc
"@features/<name>": ["./projects/features/<name>/routes.ts"]
```

**3. Wire the route** in [`projects/shell/src/app/app.routes.ts`](../projects/shell/src/app/app.routes.ts):

```ts
{ path: '<path>', loadChildren: () => import('@features/<name>').then(m => m.routes), data: { breadcrumb: '<Name>' } }
```

Add it under an existing `AreaShell` (e.g. `front-office` children) or as a new top-level route.

**4. Add navigation** — a menu entry in the side menu (`projects/shell/src/app/layout/side-menu/side-menu.ts`).

**5. Verify:** `npm start`, navigate to the route, confirm it loads as its own lazy chunk in the build output.

---

## Troubleshooting

### "Cannot find module '@core', '@shared', or '@features/…'"

- Check the `paths` aliases in the root [`tsconfig.json`](../tsconfig.json).
- Ensure `projects/shell/tsconfig.app.json` extends `../../tsconfig.json`.
- A new feature area needs its `@features/<name>` alias added before the shell can `import()` it.

### Routes not rendering

- The feature's `routes.ts` must export a `routes` **named** const (matched by `.then(m => m.routes)`).
- Feature routes are relative — they don't include the parent area path; the shell composes it.

### Deep-link 404 on refresh (production)

- Configure the static server for SPA fallback (serve `index.html` for unknown routes).

### Test can't find specs

- `angular.json` → `shell:test` `include` is `libs/**/*.spec.ts`; the root `tsconfig.spec.json` includes `projects/**` and `libs/**` for type-checking.

---

## Configuration File Quick Reference

| File | Location | Purpose | Edit manually? |
|---|---|---|---|
| `angular.json` | Root | Single `shell` project, builders, port | ✅ Yes |
| `package.json` | Root | Scripts, dependencies | ✅ Yes |
| `tsconfig.json` | Root | Compiler options + `@core`/`@shared`/`@features` aliases | ✅ Yes |
| `tsconfig.spec.json` | Root | Test type-check includes (`libs/**`, `projects/**`) | ✅ Yes |
| `vitest.config.ts` | Root | Test runner configuration | ✅ Yes |
| `main.ts` | `projects/shell/src` | Bootstrap + `registerAtlasGrid()` | ✅ Yes |
| `app.config.ts` | `projects/shell/src/app` | Root Angular providers | ✅ Yes |
| `app.routes.ts` | `projects/shell/src/app` | Routes + lazy `@features/*` imports | ✅ Yes |
| `styles.css` | `projects/shell/src` | Imports the shared theme | ✅ Yes |
| `index.html` | `projects/shell/src` | HTML shell + theme FOUC script | ✅ Yes |
| `routes.ts` | `projects/features/<name>` | A feature area's lazy route tree | ✅ Yes |
