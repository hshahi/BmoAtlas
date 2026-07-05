# CLI Commands to Recreate BmoAtlas from Scratch

> These are the CLI commands needed to scaffold the current BmoAtlas project — a **single Angular application** (`shell`) that lazy-loads feature areas, plus two shared libraries. There are no micro-frontends / Native Federation.
> After running these commands you then manually create/edit the source files (components, services, styles, configs), which are hand-written, not generated.

---

## 1. Create the Angular Workspace

```bash
# projects/ is the newProjectRoot; create the workspace without an initial app
ng new bmo-atlas --prefix=app --style=css --ssr=false --skip-tests --create-application=false
cd bmo-atlas
```

## 2. Generate the Shell Application

```bash
ng generate application shell --prefix=app --style=css --ssr=false --skip-tests
# → projects/shell
```

## 3. Create the Feature Areas (folders, not Angular projects)

Feature areas are plain folders of routes + pages, lazy-loaded by the shell via TypeScript path aliases — **not** separate `ng` applications.

```bash
mkdir -p projects/features/dashboard/pages
mkdir -p projects/features/settings/pages
mkdir -p projects/features/stocks/{pages,components,models,service}
# each area gets a hand-written routes.ts exporting `routes`
```

## 4. Create the Shared Libraries (folders, path-aliased)

```bash
# libs are TypeScript path aliases (@core / @shared), not published npm packages
mkdir -p libs/shared/src/{components,handlers,interceptors,services,styles,ag-grid}
mkdir -p libs/shared/src/styles/themes
mkdir -p libs/core/src/{base,models,services}
```

## 5. Install Runtime Dependencies

```bash
# AG Grid (community) — data grids
npm install ag-grid-community ag-grid-angular

# phantom-ui — shimmer skeleton loader web component
npm install @aejkatappaja/phantom-ui
```

(`@angular/*`, `rxjs`, and `tslib` come with the workspace.)

## 6. Install Dev Dependencies

```bash
# Vitest + Playwright — unit testing
npm install --save-dev vitest @vitest/browser-playwright @vitest/coverage-v8 playwright jsdom

# Tooling
npm install --save-dev prettier rimraf

# Install Playwright browsers (for tests)
npx playwright install
```

## 7. Generate Shell Components

```bash
# Layout
ng generate component layout/toolbar --project shell --flat --skip-tests
ng generate component layout/breadcrumb --project shell --flat --skip-tests
ng generate component layout/side-menu --project shell --flat --skip-tests

# Pages
ng generate component pages/home --project shell --flat --skip-tests
ng generate component pages/area-shell/area-shell --project shell --flat --skip-tests
ng generate component pages/search/search-page --project shell --flat --skip-tests
```

## 8. Create Feature Pages (hand-written)

Feature areas aren't `ng` projects, so their pages are authored by hand as standalone components under `projects/features/<area>/pages/…`, each imported lazily from that area's `routes.ts`:

- **dashboard** — `pages/overview`, `pages/analytics`, `pages/reports`
- **settings** — `pages/general`, `pages/profile`
- **stocks** — `pages/summary`, `pages/breakdown` (+ `components/`, `models/`, `service/`)

---

## Summary of All `npm install` Commands

```bash
# Dependencies
npm install ag-grid-community ag-grid-angular @aejkatappaja/phantom-ui

# Dev dependencies
npm install --save-dev vitest @vitest/browser-playwright @vitest/coverage-v8 playwright jsdom prettier rimraf
```

## Summary of All `ng` Commands

```bash
# Workspace + shell
ng new bmo-atlas --prefix=app --style=css --ssr=false --skip-tests --create-application=false
ng generate application shell --prefix=app --style=css --ssr=false --skip-tests

# Shell components
ng generate component layout/toolbar --project shell --flat --skip-tests
ng generate component layout/breadcrumb --project shell --flat --skip-tests
ng generate component layout/side-menu --project shell --flat --skip-tests
ng generate component pages/home --project shell --flat --skip-tests
ng generate component pages/area-shell/area-shell --project shell --flat --skip-tests
ng generate component pages/search/search-page --project shell --flat --skip-tests
```

---

## Files That Are Hand-Written (Not CLI-Generated)

### Configuration
- `tsconfig.json` — `@core`, `@shared`, and `@features/*` path aliases
- `tsconfig.spec.json` — test includes (`libs/**`, `projects/**`)
- `angular.json` — the single `shell` project (build / serve / test targets)
- `package.json` — `scripts` (start, build, test:*)
- `vitest.config.ts` — test runner config
- `.prettierrc`, `.editorconfig`

### Shell (`projects/shell/`)
- `src/main.ts` — `bootstrapApplication()` + `registerAtlasGrid()`
- `src/app/app.config.ts` — `provideZonelessChangeDetection()`, router, http, error handler
- `src/app/app.routes.ts` — routes with lazy `import('@features/*')`
- `src/styles.css` — `@import '@shared/styles/theme.css'`
- `src/index.html` — FOUC prevention script (theme allow-list)

### Feature areas (`projects/features/<area>/`)
- `routes.ts` — the area's lazy route tree (exported `routes`)
- `pages/…` — standalone page components

### Shared Library (`libs/shared/`)
- `src/index.ts` — barrel exports
- `src/styles/theme.css` + `_*.css` partials + `themes/_*.css` (one file per theme)
- `src/ag-grid/atlas-grid.ts` — token-driven AG Grid theme + `registerAtlasGrid()`
- `src/services/theme/theme.service.ts`, `services/error/error.service.ts`
- `src/components/*` — `error-toast`, `atlas-loader`, `load-wrapper`, `load-wrapper-client-data`
- `src/handlers/global-error.handler.ts`, `src/interceptors/*.ts`

### Core Library (`libs/core/`)
- `src/index.ts` — barrel exports
- `src/base/*` — `component-base`, `domain-base`, `hub`, `service-base`
- `src/services/*` — `http-client-data`, `http-data`, `message-hub`, `state-hub`

### All Component Templates & Styles
- Every `.ts` component file (inline templates and styles)
