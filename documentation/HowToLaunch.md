# How to Launch BmoAtlas

BmoAtlas is a **micro-frontend (MFE) application** built with Angular and [Native Federation](https://www.npmjs.com/package/@angular-architects/native-federation). It consists of:

| App | Role | Dev Port |
|-----|------|----------|
| **Atlas Shell** | Host app — toolbar, side menu, router outlet | 4200 |
| **MFE Dashboard** | Remote — dashboard pages | 4201 |
| **MFE Settings** | Remote — settings pages | 4202 |
| **MFE Stocks** | Remote — stock market pages | 4203 |

The shell dynamically loads MFE bundles at runtime when you navigate via the side menu.

---

## Development

### Option 1: Terminal — `npm run dev`

Start all three servers with a single command:

```bash
npm run dev
```

This uses `concurrently` to run all servers in one terminal with color-coded, labelled output:

- **[dashboard]** (blue) → `http://localhost:4201`
- **[settings]** (magenta) → `http://localhost:4202`
- **[stocks]** (yellow) → `http://localhost:4203`
- **[shell]** (green) → `http://localhost:4200`

Open **http://localhost:4200** in your browser once all three have compiled.

Press `Ctrl+C` to stop all servers at once.

#### Starting individual servers

If you're only working on one MFE, you can start just what you need:

```bash
# Start only the dashboard MFE + shell (other MFEs won't load but everything else works)
npm run start:dashboard   # Terminal 1
npm run start:atlas       # Terminal 2

# Start only the settings MFE + shell
npm run start:settings    # Terminal 1
npm run start:atlas       # Terminal 2

# Start only the stocks MFE + shell
npm run start:stocks      # Terminal 1
npm run start:atlas       # Terminal 2

# Start just the shell (no MFEs — only the Home page works)
npm start
```

---

### Option 2: VS Code Debugger — F5

1. Open the **Run and Debug** panel (`Ctrl+Shift+D`)
2. Select **"Debug App"** from the dropdown
3. Press **F5**

This will:
1. Start all three dev servers via the `Dev: Start All Servers` task
2. Wait for compilation to complete
3. Launch Chrome with the VS Code debugger attached to `http://localhost:4200`

You can then:
- Set **breakpoints** in any `.ts` file and they'll be hit in VS Code
- Use the **Debug Console** for evaluating expressions
- Step through code in the shell, MFE components, or shared libraries

---

## Building for Production

### Build all apps

```bash
npm run build
```

This runs `ng build` for all four apps (atlas, mfe-dashboard, mfe-settings, mfe-stocks) with production optimizations. The output goes to `dist/` with each app in its own subfolder.

### Build individual apps

```bash
npm run build:atlas       # Shell only
npm run build:dashboard   # Dashboard MFE only
npm run build:settings    # Settings MFE only
npm run build:stocks      # Stocks MFE only
```

---

## Production Deployment

### Architecture

In production, the MFEs don't need separate servers or ports. Each app is built to **static files** that can be served from any web server or CDN.

```
Production Server (or CDN)
├── /                          ← Atlas Shell
├── /mfe-dashboard/            ← Dashboard MFE static assets
│   └── remoteEntry.json       ← Federation manifest for this MFE
├── /mfe-settings/             ← Settings MFE static assets
│   └── remoteEntry.json       ← Federation manifest for this MFE
└── /mfe-stocks/               ← Stocks MFE static assets
    └── remoteEntry.json       ← Federation manifest for this MFE
```

### Update the Federation Manifest

The key file is [`apps/atlas/public/federation.manifest.json`](../apps/atlas/public/federation.manifest.json). In development it points to `localhost` ports:

```json
{
  "mfe-dashboard": "http://localhost:4201/remoteEntry.json",
  "mfe-settings": "http://localhost:4202/remoteEntry.json"
}
```

For production, update it to point to your deployed URLs:

#### Same-origin deployment (all apps on one server)

```json
{
  "mfe-dashboard": "/mfe-dashboard/remoteEntry.json",
  "mfe-settings": "/mfe-settings/remoteEntry.json"
}
```

#### CDN deployment

```json
{
  "mfe-dashboard": "https://cdn.example.com/mfe-dashboard/remoteEntry.json",
  "mfe-settings": "https://cdn.example.com/mfe-settings/remoteEntry.json"
}
```

#### Independent servers (separate teams/deployments)

```json
{
  "mfe-dashboard": "https://dashboard.example.com/remoteEntry.json",
  "mfe-settings": "https://settings.example.com/remoteEntry.json"
}
```

### Environment-Specific Manifests

For managing different environments (dev, staging, production), consider:

1. **Build-time replacement** — Use Angular's `fileReplacements` in `angular.json` to swap the manifest per environment
2. **Runtime loading** — Fetch the manifest from an API endpoint at startup instead of bundling it
3. **Environment variables** — Use a CI/CD pipeline to inject the correct URLs at deploy time

### Deployment Steps

1. **Build** all apps:
   ```bash
   npm run build
   ```

2. **Copy** the built assets to your web server:
   ```
   dist/atlas/browser/        → serve at /
   dist/mfe-dashboard/browser/ → serve at /mfe-dashboard/
   dist/mfe-settings/browser/  → serve at /mfe-settings/
   ```

3. **Configure** your web server to:
   - Serve the shell's `index.html` for all routes (SPA fallback)
   - Set appropriate CORS headers if MFEs are on different origins
   - Enable gzip/brotli compression for JS bundles

---

## Testing

```bash
npm test                  # Watch mode (interactive)
npm run test:once         # Single run
npm run test:coverage     # With code coverage report
npm run test:ci           # Headless mode for CI pipelines
```

Tests use **Vitest** with Playwright browser runner (Chromium).
