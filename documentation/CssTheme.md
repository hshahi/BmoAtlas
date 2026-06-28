# CSS & Theming Architecture

> How BmoAtlas organises its stylesheets, why each layer exists, and the best practices behind every decision.

---

## Table of Contents

1. [Overview](#overview)
2. [File Map](#file-map)
3. [Entry Point — `theme.css`](#entry-point--themecss)
4. [CSS Layers — Cascade Control](#css-layers--cascade-control)
5. [Design Tokens — `_tokens.css`](#design-tokens--_tokenscss)
6. [Reset — `_reset.css`](#reset--_resetcss)
7. [Base — `_base.css`](#base--_basecss)
8. [Layout — `_layout.css`](#layout--_layoutcss)
9. [Components — `_components.css`](#components--_componentscss)
10. [Utilities — `_utilities.css`](#utilities--_utilitiescss)
11. [Dark Theme — `data-theme` Attribute](#dark-theme--data-theme-attribute)
12. [FOUC Prevention — Inline Script](#fouc-prevention--inline-script)
13. [ThemeService — Runtime Toggle](#themeservice--runtime-toggle)
14. [How MFEs Consume the Theme](#how-mfes-consume-the-theme)
15. [Best Practices Summary](#best-practices-summary)

---

## Overview

BmoAtlas uses a **token-driven, layered CSS architecture** shared across the shell and all micro-frontends. The system is designed around three principles:

| Principle | How |
|-----------|-----|
| **Single source of truth** | All colours, spacing, typography, and shadows are defined once in `_tokens.css` as CSS custom properties |
| **Predictable cascade** | `@layer` declarations guarantee specificity order regardless of import order |
| **Zero-JS dark mode** | Theme switching is pure CSS — the `data-theme="dark"` attribute on `<html>` swaps token values; no JavaScript re-render needed |

---

## File Map

```
libs/shared/src/styles/
├── theme.css            ← Entry point (import this in each app)
├── _tokens.css          ← Primitive tokens + default LIGHT theme on :root
├── _reset.css           ← Browser reset
├── _base.css            ← Body defaults consuming tokens
├── _layout.css          ← Page grid, containers
├── _components.css      ← Reusable component classes (.card, .btn, .form-*)
├── _utilities.css       ← Utility classes (.sr-only, .text-gain, .font-bold)
└── themes/              ← One file per alternate theme (:root[data-theme="…"])
    ├── _dark.css
    ├── _silver.css
    ├── _midnight.css
    ├── _platinum.css
    ├── _chrome.css
    ├── _titanium.css
    ├── _nord.css
    ├── _dracula.css
    ├── _tokyo-night.css
    ├── _high-contrast.css
    └── _catppuccin.css

libs/shared/src/services/theme/
└── theme.service.ts     ← Angular service for runtime theme toggle + persistence
```

Files prefixed with `_` are **partials** — they are never imported directly by apps. Only `theme.css` is imported.

### Adding a new theme

1. Create `themes/_<name>.css` containing a single `:root[data-theme="<name>"] { … }` block that overrides the semantic tokens (and, for a metallic look, the `--card-*` / `--btn-primary-*` / `--input-*` tokens).
2. Add one `@import './themes/_<name>.css';` line to `theme.css`.
3. Register `<name>` in `THEMES` (and the `Theme` union) in `theme.service.ts`, add a toolbar icon case, a Settings button, and the `index.html` FOUC allow-lists.

---

## Entry Point — `theme.css`

```css
/* Layer order declaration — must come first */
@layer reset, base, layout, components, utilities;

/* Design tokens (not in a layer — always available) */
@import './_tokens.css';

/* Layered styles */
@import './_reset.css';
@import './_base.css';
@import './_layout.css';
@import './_components.css';
@import './_utilities.css';
```

### Why This Is Best Practice

| Decision | Reason |
|----------|--------|
| **Single `@import` per app** | Each app's `styles.css` contains only `@import '@shared/styles/theme.css'` — one line, zero duplication |
| **Layer order declared first** | The `@layer` statement at the top guarantees cascade order even if imports are reordered or new layers are added later |
| **Tokens outside layers** | Custom properties defined in `:root` must be available to all layers, so `_tokens.css` is imported outside any `@layer` block |

### How Apps Consume It

```css
/* apps/atlas/src/styles.css */
@import '@shared/styles/theme.css';

/* apps/mfe-stocks/src/styles.css */
@import '@shared/styles/theme.css';
```

The `@shared` path alias is configured in `tsconfig.json` and resolved by the Angular build system.

---

## CSS Layers — Cascade Control

```
@layer reset, base, layout, components, utilities;
```

CSS `@layer` (CSS Cascade Layers, supported in all modern browsers) controls **specificity order** without needing `!important` or artificially inflated selectors.

### Layer Priority (lowest → highest)

| Layer | Purpose | Specificity |
|-------|---------|-------------|
| `reset` | Browser normalisation | Lowest — easily overridden |
| `base` | Body defaults (font, colour, background) | Low |
| `layout` | Page grid, containers, sections | Medium |
| `components` | Reusable UI classes (`.card`, `.btn`, `.form-*`) | Medium-high |
| `utilities` | Single-purpose helpers (`.sr-only`, `.text-gain`) | Highest — always wins |

### Why This Is Best Practice

- **No specificity wars**: A utility class in the `utilities` layer always beats a component class in the `components` layer, regardless of selector complexity
- **Predictable overrides**: Component styles can override layout styles without `!important`
- **Safe third-party integration**: External CSS can be placed in its own layer below `reset` to prevent it from breaking your styles
- **Follows ITCSS methodology**: The layer order mirrors the Inverted Triangle CSS architecture (Settings → Tools → Generic → Elements → Objects → Components → Utilities)

---

## Design Tokens — `_tokens.css`

Design tokens are the **single source of truth** for all visual values. They are defined as CSS custom properties on `:root`.

### Token Categories

#### Typography

```css
--font-sans: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, ...;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;

--text-xs:   clamp(0.6875rem, 0.65rem + 0.15vw, 0.75rem);
--text-sm:   clamp(0.75rem, 0.7rem + 0.2vw, 0.875rem);
--text-base: clamp(0.875rem, 0.8rem + 0.3vw, 1rem);
/* ... through --text-3xl */

--leading-tight: 1.2;
--leading-normal: 1.6;
--leading-relaxed: 1.8;

--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

**Why `clamp()` for font sizes**: Fluid typography scales smoothly between viewport sizes without media queries. The formula `clamp(min, preferred, max)` ensures text is never too small on mobile or too large on ultrawide monitors.

#### Spacing

```css
--space-xs:  0.25rem;   /*  4px */
--space-sm:  0.5rem;    /*  8px */
--space-md:  1rem;      /* 16px */
--space-lg:  1.5rem;    /* 24px */
--space-xl:  2rem;      /* 32px */
--space-2xl: 3rem;      /* 48px */
--space-3xl: 4rem;      /* 64px */
```

**Why `rem` units**: All spacing is relative to the root font size, ensuring consistent scaling when users change their browser's default font size (accessibility requirement).

#### Border Radii

```css
--radius-sm:   0.25rem;
--radius-md:   0.5rem;
--radius-lg:   0.75rem;
--radius-xl:   1rem;
--radius-full: 9999px;   /* pill shape */
```

#### Shadows

```css
--shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), ...;
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), ...;
--shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1), ...;
```

**Why multi-layer shadows**: Each shadow uses two `box-shadow` values — a larger diffuse shadow for depth and a smaller tight shadow for definition. This produces more realistic elevation than a single shadow.

**Why dark mode overrides shadows**: Dark backgrounds need stronger shadows (`0.3`–`0.4` opacity vs `0.05`–`0.1`) because subtle shadows are invisible on dark surfaces.

#### Transitions

```css
--transition-fast: 150ms ease;
--transition-base: 250ms ease;
--transition-slow: 350ms ease;
```

**Why tokenised transitions**: Consistent animation timing across the entire app. Changing `--transition-base` updates every hover, focus, and state transition simultaneously.

#### Z-Index Scale

```css
--z-dropdown: 100;
--z-sticky:   200;
--z-overlay:  300;
--z-modal:    400;
--z-toast:    500;
```

**Why a z-index scale**: Prevents the common "z-index: 99999" anti-pattern. Every stacking context has a defined slot, making it impossible for a dropdown to accidentally appear above a modal.

#### Brand Colours (Primitive Tokens)

```css
--bmo-navy:        #002f6c;
--bmo-navy-dark:   #001d44;
--bmo-navy-light:  #003d8f;
--bmo-blue:        #0075be;
--bmo-blue-light:  #4da3d4;
--bmo-blue-pale:   #e6f2fa;
--bmo-red:         #cc0000;
--bmo-white:       #ffffff;
--bmo-gray-100:    #f5f5f5;
/* ... through --bmo-gray-700 */
```

**Why primitive + semantic tokens**: Brand colours (`--bmo-navy`) are **primitive tokens** — raw values that never change. They are consumed by **semantic tokens** (`--color-primary`, `--toolbar-bg`) that describe *purpose*. This two-tier system means:

- Changing the brand colour updates every semantic reference automatically
- Dark mode only needs to override semantic tokens, not every usage of a colour
- Components never reference `--bmo-navy` directly — they use `--color-primary` or `--toolbar-bg`

#### Semantic Colour Tokens (Light Theme)

```css
--color-bg:          #f0f2f5;
--color-bg-surface:  #ffffff;
--color-bg-elevated: #ffffff;
--color-bg-muted:    #f5f5f5;

--color-text:          #1a1d23;
--color-text-secondary: #5f6368;
--color-text-muted:    #9aa0a6;
--color-text-inverse:  #ffffff;

--color-border:       #e1e4e8;
--color-border-focus: var(--bmo-blue);

--color-primary:       var(--bmo-blue);
--color-primary-hover: var(--bmo-navy-light);
--color-primary-light: var(--bmo-blue-pale);

--color-success:       #16a34a;
--color-danger:        var(--bmo-red);
--color-warning:       #d97706;
--color-info:          var(--bmo-blue);

--color-gain:  #16a34a;
--color-loss:  var(--bmo-red);
```

**Why semantic naming**: `--color-primary` communicates intent; `#0075be` does not. When a designer says "make the primary colour darker", you change one token. When they say "make the danger colour less aggressive", you change `--color-danger`. No grep-and-replace across hundreds of files.

#### Toolbar & Side Menu Tokens

```css
--toolbar-bg:          var(--bmo-navy);
--toolbar-text:        var(--bmo-white);
--toolbar-height:      40px;

--sidemenu-bg:         var(--bmo-navy);
--sidemenu-text:       rgba(255, 255, 255, 0.65);
--sidemenu-width:      220px;
```

**Why component-specific tokens**: The toolbar and side menu have their own token namespace because they are **always dark** in light mode (navy background) but switch to a different dark palette in dark mode. Giving them dedicated tokens avoids conditional logic in component CSS.

#### Responsive Breakpoints

```css
--bp-sm:  480px;
--bp-md:  768px;
--bp-lg:  1024px;
--bp-xl:  1280px;
```

> **Note**: CSS custom properties cannot be used in `@media` queries (they are not evaluated at parse time). These tokens exist as **documentation references** — the actual breakpoint values are used directly in `@media` rules and `@container` queries within components.

#### Accessibility Token

```css
--touch-target-min: 44px;
```

**Why 44px**: WCAG 2.2 Level AAA requires interactive elements to have a minimum target size of 44×44 CSS pixels. This token is referenced in button and link styles to ensure compliance.

---

## Reset — `_reset.css`

```css
@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; ... }
  body { min-height: 100dvh; line-height: 1.6; }
  img, picture, video, canvas, svg { display: block; max-width: 100%; height: auto; }
  input, button, textarea, select { font: inherit; color: inherit; }
  button { cursor: pointer; border: none; background: none; }
  a { color: inherit; text-decoration: none; }
  ul, ol { list-style: none; }
  h1–h6 { text-wrap: balance; overflow-wrap: break-word; }
  p { text-wrap: pretty; overflow-wrap: break-word; }
  table { border-collapse: collapse; border-spacing: 0; }
}
```

### Why Each Rule Is Best Practice

| Rule | Reason |
|------|--------|
| `box-sizing: border-box` | Padding and borders are included in element width — eliminates the most common CSS layout bug |
| `margin: 0; padding: 0` | Removes inconsistent browser defaults; all spacing is applied intentionally via tokens |
| `-webkit-font-smoothing: antialiased` | Prevents overly bold text rendering on macOS/iOS WebKit |
| `text-rendering: optimizeLegibility` | Enables kerning and ligatures for better typography |
| `min-height: 100dvh` | Uses dynamic viewport height (`dvh`) which accounts for mobile browser chrome (address bar) |
| `img { display: block; max-width: 100% }` | Prevents inline image gaps and overflow on small screens |
| `font: inherit` on form elements | Browsers apply their own font to inputs/buttons; this forces them to match the page |
| `button { cursor: pointer; border: none; background: none }` | Resets buttons to unstyled — all button styling is applied via `.btn` classes |
| `text-wrap: balance` on headings | Distributes text evenly across lines to avoid orphaned words (CSS Text Level 4) |
| `text-wrap: pretty` on paragraphs | Avoids orphaned words at the end of paragraphs (CSS Text Level 4) |
| `overflow-wrap: break-word` | Prevents long URLs or strings from overflowing containers |

---

## Base — `_base.css`

```css
@layer base {
  body {
    font-family: var(--font-sans);
    font-size: var(--text-base);
    line-height: var(--leading-normal);
    color: var(--color-text);
    background-color: var(--color-bg);
    transition: color var(--transition-base), background-color var(--transition-base);
  }
}
```

### Why This Is Best Practice

- **Token consumption**: Every value references a design token — no magic numbers
- **Smooth theme transitions**: The `transition` on `color` and `background-color` creates a smooth fade when toggling between light and dark mode
- **Minimal base layer**: Only the `body` element is styled here. Everything else is handled by components or utilities. This keeps the base layer thin and predictable

---

## Layout — `_layout.css`

```css
@layer layout {
  .page-grid {
    display: grid;
    grid-template-rows: auto 1fr auto;
    min-height: 100dvh;
  }

  .container {
    width: 100%;
    max-width: 1200px;
    margin-inline: auto;
    padding-inline: var(--space-md);
  }

  .section {
    padding-block: var(--space-2xl);
  }
}
```

### Why This Is Best Practice

| Pattern | Reason |
|---------|--------|
| `grid-template-rows: auto 1fr auto` | Classic "holy grail" layout — header and footer take their natural height, main content fills remaining space |
| `100dvh` | Dynamic viewport height handles mobile browser chrome correctly |
| `margin-inline: auto` | Centres the container using logical properties (works in both LTR and RTL) |
| `padding-inline` | Logical property — automatically flips for RTL languages |
| `padding-block` | Logical property for vertical padding — future-proof for writing-mode changes |

---

## Components — `_components.css`

### Card

```css
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  container-type: inline-size;
}
```

**Why `container-type: inline-size`**: Every card is a CSS container query context. Child components can use `@container` queries to adapt their layout based on the card's width, not the viewport width. This is critical for micro-frontends where the same component may appear in different-sized containers.

### Buttons

```css
.btn { /* base styles: flexbox, padding, radius, transition */ }
.btn--primary { background: var(--color-primary); color: var(--color-text-inverse); }
.btn--outline { background: transparent; border: 1px solid var(--color-primary); }
.btn--danger  { background: var(--color-danger); color: var(--color-text-inverse); }
```

**Why BEM naming** (`.btn--primary`): Block-Element-Modifier naming convention prevents class name collisions and makes the relationship between base and variant classes explicit.

**Why `color-mix()` for hover states**:

```css
.btn--danger:hover {
  background: color-mix(in srgb, var(--color-danger) 85%, black);
}
```

`color-mix()` darkens the danger colour by mixing it with black — no need to define a separate `--color-danger-hover` token. This is a modern CSS function (supported in all evergreen browsers) that reduces token proliferation.

### Form Controls

```css
.form-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-border-focus) 25%, transparent);
}

.form-input.ng-invalid.ng-touched {
  border-color: var(--color-danger);
}
```

**Why `outline: none` + `box-shadow`**: The default browser outline doesn't respect `border-radius`. A `box-shadow` ring follows the element's shape and can be colour-matched to the design system. The 3px spread with 25% opacity creates a subtle but visible focus indicator that meets WCAG 2.2 focus-visible requirements.

**Why `.ng-invalid.ng-touched`**: Angular adds these classes automatically to form controls. Styling them in the shared CSS means every form input across every MFE gets consistent validation styling without any component-level CSS.

---

## Utilities — `_utilities.css`

```css
@layer utilities {
  .sr-only { /* screen-reader only — visually hidden but accessible */ }
  .text-gain  { color: var(--color-gain); }
  .text-loss  { color: var(--color-loss); }
  .text-muted { color: var(--color-text-muted); }
  .font-mono  { font-family: var(--font-mono); }
  .font-bold  { font-weight: var(--weight-bold); }
  .text-center { text-align: center; }
  .text-right  { text-align: right; }
}
```

### Why This Is Best Practice

- **Highest layer priority**: Utilities are in the last `@layer`, so they always win over component styles without needing `!important`
- **Single-responsibility**: Each class does exactly one thing — composable and predictable
- **`.sr-only` for accessibility**: Hides content visually while keeping it available to screen readers. Uses the standard clip-rect technique recommended by WebAIM
- **Semantic colour utilities**: `.text-gain` and `.text-loss` use semantic tokens, so they automatically adapt to dark mode

---

## Themes — `data-theme` Attribute

BmoAtlas ships **fourteen themes**, all driven by the `data-theme` attribute on `<html>`:

| Theme | `data-theme` value | `color-scheme` | Character |
|-------|--------------------|----------------|-----------|
| Light | _(none / default)_ | light | Default BMO light palette |
| Dark | `dark` | dark | Near-black slate |
| Silver | `silver` | light | Matte brushed-metal greys with a steel-blue primary |
| Silver Shine | `silver-shine` | light | Brighter, glossier Silver — lighter surfaces + specular sheen |
| Midnight | `midnight` | dark | Deep midnight-blue surfaces with a bright blue primary |
| Platinum | `platinum` | light | Lighter, polished silver with a specular sheen |
| Chrome | `chrome` | light | Mirror-polished metal, high-contrast reflections |
| Titanium | `titanium` | dark | Cool dark brushed metal with a steel-blue accent |
| Nord | `nord` | dark | Arctic blue-grey palette |
| Dracula | `dracula` | dark | Dark with a purple primary |
| Tokyo Night | `tokyo-night` | dark | Deep blue-violet |
| High Contrast | `high-contrast` | dark | Pure-black, maximum-legibility accessibility theme |
| Catppuccin | `catppuccin` | dark | Soft dark pastel (Mocha) |
| Merged Blue | `merged-blue` | dark | Toolbar + side menu form one continuous dark-blue gradient panel |

> **Merged Blue** is a worked example of cross-component visual continuity: the toolbar and side menu are separate Angular components, but the toolbar's gradient *ends* at the colour the side-menu's gradient *starts* (`#1c2e56`), and `--toolbar-border` (shared by the toolbar's bottom edge and the menu's right edge) is `transparent`. Because the side menu sits directly beneath the toolbar's left portion, the two render as a single unbroken top→bottom gradient — no `background-attachment: fixed` needed.

The four metallic themes (Silver, Platinum, Chrome, Titanium) share a token-driven treatment: `--card-*`, `--btn-primary-*`, `--badge-shadow`, and `--input-*` tokens (defined in [_components.css](../libs/shared/src/styles/_components.css) with flat fallbacks) let each theme render raised, beveled buttons/cards/badges and recessed inputs without per-theme selectors. The "shiny" themes add a diagonal specular glare streak over a clean top→bottom gradient.

Each non-default theme is implemented by overriding semantic tokens on its own `:root[data-theme="…"]` block. For example, the dark theme:

```css
:root[data-theme="dark"] {
  color-scheme: dark;

  --color-bg:          #0f1117;
  --color-bg-surface:  #1a1d27;
  --color-text:        #e8eaed;
  --color-border:      #3c4049;
  --color-primary:     #60a5fa;
  --color-danger:      #f87171;
  --color-gain:        #4ade80;
  --color-loss:        #f87171;

  /* Stronger shadows for dark backgrounds */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);

  /* Toolbar adapts to dark palette */
  --toolbar-bg: #111827;
  --sidemenu-bg: #111827;
}
```

### Why This Is Best Practice

| Decision | Reason |
|----------|--------|
| **`data-theme` attribute on `<html>`** | Attribute selectors on `:root` have the same specificity as the light-theme `:root` block, so overrides work cleanly without `!important` |
| **`color-scheme: dark`** | Tells the browser to use dark-mode defaults for scrollbars, form controls, and system UI elements |
| **Only semantic tokens are overridden** | Primitive brand tokens (`--bmo-navy`, `--bmo-blue`) stay the same — only the semantic mappings change. This keeps the override block small and maintainable |
| **Stronger shadows in dark mode** | Shadows with `0.05` opacity are invisible on dark backgrounds. Dark mode increases opacity to `0.3`–`0.4` for visible depth |
| **No JavaScript re-render** | Changing the `data-theme` attribute triggers a CSS cascade update — Angular components don't need to re-render |

### How It Works at Runtime

```
User clicks toggle → ThemeService.toggle()
  → signal updates → effect fires
    → document.documentElement.setAttribute('data-theme', 'dark')
      → CSS cascade recalculates all token values
        → Every element using tokens updates instantly
```

---

## FOUC Prevention — Inline Script

Each `index.html` contains an inline `<script>` in the `<head>`:

```html
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
```

### Why This Is Best Practice

| Decision | Reason |
|----------|--------|
| **Inline in `<head>`** | Executes before the first paint — prevents the "flash of unstyled content" (FOUC) where the page briefly appears in light mode before switching to dark |
| **`localStorage` check first** | Respects the user's explicit preference from a previous visit |
| **`prefers-color-scheme` fallback** | If no saved preference exists, respects the OS-level dark mode setting |
| **`try/catch` wrapper** | `localStorage` can throw in private browsing or when storage is full — the script degrades gracefully to the CSS default (light) |
| **IIFE wrapper** | Prevents variable leakage into the global scope |
| **No external dependency** | This script runs before Angular bootstraps — it cannot depend on any framework code |

### Why Every MFE Has This Script

In a micro-frontend architecture, each MFE can be loaded independently (e.g., during development or in a standalone deployment). The inline script ensures the correct theme is applied even when the MFE runs outside the shell.

---

## ThemeService — Runtime Toggle

```typescript
// libs/shared/src/services/theme/theme.service.ts

export type Theme = 'light' | 'dark' | 'silver' | 'midnight';

const STORAGE_KEY = 'bmo-atlas-theme';
const THEMES: readonly Theme[] = [
  'light', 'dark', 'silver', 'midnight', 'platinum', 'chrome', 'titanium',
  'nord', 'dracula', 'tokyo-night', 'high-contrast', 'catppuccin',
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly resolved = signal<Theme>(this.loadPreference());

  constructor() {
    effect(() => {
      const theme = this.resolved();
      this.applyToDOM(theme);
    });
  }

  // Cycles through every theme in THEMES order, wrapping back to the first
  toggle(): void {
    const current = THEMES.indexOf(this.resolved());
    const next = THEMES[(current + 1) % THEMES.length];
    this.resolved.set(next);
    this.savePreference(next);
  }

  private applyToDOM(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private loadPreference(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored as Theme) ? (stored as Theme) : 'dark';
  }

  private savePreference(theme: Theme): void {
    localStorage.setItem(STORAGE_KEY, theme);
  }
}
```

### Why This Is Best Practice

| Decision | Reason |
|----------|--------|
| **Signal-based state** | `resolved` is an Angular signal — any component reading it reactively updates when the theme changes |
| **`effect()` for DOM sync** | The effect automatically applies the theme to the DOM whenever the signal changes — no manual subscription management |
| **`providedIn: 'root'`** | Singleton service shared across the shell and all MFEs via Angular's DI tree |
| **`isPlatformBrowser` guard** | Prevents `localStorage` and `document` access during SSR (server-side rendering) |
| **Matches inline script key** | The `STORAGE_KEY` constant (`'bmo-atlas-theme'`) matches the key used in the `index.html` inline script — they must stay in sync |

---

## How MFEs Consume the Theme

```
┌─────────────────────────────────────────────────┐
│  libs/shared/src/styles/theme.css               │
│  (tokens + reset + base + layout + components   │
│   + utilities)                                  │
└──────────┬──────────┬──────────┬────────────────┘
           │          │          │
    ┌──────▼──┐ ┌─────▼────┐ ┌──▼──────────┐
    │  atlas  │ │mfe-stocks│ │mfe-dashboard │ ...
    │styles.css│ │styles.css│ │ styles.css  │
    └─────────┘ └──────────┘ └─────────────┘
```

Each app's `styles.css` is a single line:

```css
@import '@shared/styles/theme.css';
```

This means:
- **All MFEs share identical tokens** — colours, spacing, and typography are consistent
- **No CSS duplication** — the build system deduplicates shared styles
- **Component-scoped styles** (Angular `styles` metadata) can reference any token via `var(--token-name)` because tokens are defined on `:root`

---

## Best Practices Summary

### Architecture

| Practice | Applied In | Why |
|----------|-----------|-----|
| **CSS Custom Properties for all values** | `_tokens.css` | Single source of truth; runtime-swappable for theming |
| **`@layer` cascade control** | `theme.css` | Eliminates specificity wars; predictable override order |
| **Primitive → Semantic token hierarchy** | `_tokens.css` | Brand colours are stable; semantic mappings change per theme |
| **Partial file convention (`_` prefix)** | All partials | Signals "don't import directly" — only `theme.css` is the public API |
| **Single entry point per app** | `styles.css` | One import, zero duplication, easy to audit |

### Typography & Spacing

| Practice | Applied In | Why |
|----------|-----------|-----|
| **`clamp()` fluid typography** | `_tokens.css` | Smooth scaling without media queries |
| **`rem` units for spacing** | `_tokens.css` | Respects user's browser font-size preference (accessibility) |
| **Logical properties (`margin-inline`, `padding-block`)** | `_layout.css` | RTL-ready; future-proof for writing-mode changes |

### Theming

| Practice | Applied In | Why |
|----------|-----------|-----|
| **`data-theme` attribute** | `_tokens.css`, `index.html` | Pure CSS theme switching; no JS re-render |
| **`color-scheme: dark`** | `_tokens.css` | Browser adapts scrollbars and form controls |
| **FOUC prevention inline script** | `index.html` | Theme applied before first paint |
| **`localStorage` persistence** | `theme.service.ts`, `index.html` | Preference survives page reloads |
| **`prefers-color-scheme` fallback** | `index.html` | Respects OS-level preference for first-time visitors |

### Components & Utilities

| Practice | Applied In | Why |
|----------|-----------|-----|
| **BEM naming (`.btn--primary`)** | `_components.css` | Prevents collisions; explicit variant relationships |
| **`color-mix()` for hover states** | `_components.css` | Reduces token count; computed from existing tokens |
| **`container-type: inline-size`** | `.card` in `_components.css` | Enables container queries for responsive components |
| **`.sr-only` utility** | `_utilities.css` | Accessibility: visually hidden but screen-reader accessible |
| **Angular validation classes** | `_components.css` | Consistent form validation styling across all MFEs |

### Accessibility

| Practice | Applied In | Why |
|----------|-----------|-----|
| **44px touch target minimum** | `_tokens.css` | WCAG 2.2 Level AAA compliance |
| **Focus ring via `box-shadow`** | `_components.css` | Respects `border-radius`; visible on all backgrounds |
| **`text-wrap: balance`** | `_reset.css` | Prevents orphaned words in headings |
| **`overflow-wrap: break-word`** | `_reset.css` | Prevents content overflow from long strings |

### Performance

| Practice | Applied In | Why |
|----------|-----------|-----|
| **No `@import` chains** | `theme.css` | Single flat import tree; no waterfall loading |
| **No `!important`** | Everywhere | `@layer` handles specificity; `!important` is never needed |
| **Minimal base layer** | `_base.css` | Only `body` is styled; everything else is opt-in via classes |