# How to Launch BmoAtlas

BmoAtlas is a **single Angular application** — a `shell` that lazy-loads its feature areas as route bundles, backed by two shared libraries. It is a standard Angular workspace (no micro-frontends / Native Federation).

| Project | Type | Location | Role |
|---------|------|----------|------|
| **shell** | application | `projects/shell` | Host app — toolbar, side menu, router outlet, and the only thing served |
| **dashboard** | feature routes | `projects/features/dashboard` | Lazy-loaded dashboard pages |
| **settings** | feature routes | `projects/features/settings` | Lazy-loaded settings pages |
| **stocks** | feature routes | `projects/features/stocks` | Lazy-loaded stock-market pages |
| **@core** | library | `libs/core` | Framework-agnostic base classes & data services |
| **@shared** | library | `libs/shared` | Shared UI components, styles/themes, services |

The feature areas are **not** separate apps or servers. They are lazy route modules (`loadChildren: () => import('@features/…')`) compiled into the shell build and shipped as on-demand chunks. There is one dev server, one build, one bundle.

---

## Development

```bash
npm start        # ng serve shell  → http://localhost:4200
# or
npm run dev      # alias for the same
```

That's it — a single server on port **4200**. Navigate via the side menu; feature chunks load on demand.

---

## VS Code Debugger

1. `npm start` to run the dev server on `http://localhost:4200`.
2. Launch Chrome with the VS Code JavaScript debugger attached to that URL (Run and Debug → a Chrome/Edge "launch" or "attach" configuration).

Set **breakpoints** in any `.ts` file — shell, feature pages, or the shared libraries — and they'll be hit, since everything compiles into the one application.

---

## Building for Production

```bash
npm run build    # ng build shell (production)
```

Output goes to `dist/shell/browser/`. This is a normal Angular SPA build: one `index.html`, hashed JS/CSS, and lazy chunks for each feature area and page.

---

## Production Deployment

The app is a static SPA — no federation manifest, no per-feature servers or ports.

1. **Build:**
   ```bash
   npm run build
   ```

2. **Serve** the contents of `dist/shell/browser/` from any static web server or CDN.

3. **Configure** the web server to:
   - Serve `index.html` for all routes (SPA fallback / history API rewrite).
   - Enable gzip/brotli compression for the JS bundles.
   - Send long-lived cache headers for hashed assets (`*.[hash].js`, `*.[hash].css`).

---

## Testing

```bash
npm test                  # Watch mode (interactive)
npm run test:once         # Single run
npm run test:coverage     # With code coverage report
npm run test:ci           # Headless mode for CI pipelines
```

All target the `shell` project and run the library specs (`libs/**/*.spec.ts`) with **Vitest** + the Playwright browser runner (Chromium).
