import {
  AllCommunityModule,
  ModuleRegistry,
  provideGlobalGridOptions,
  themeQuartz,
  type Theme,
} from 'ag-grid-community';

/**
 * AG Grid theme for BmoAtlas.
 *
 * Built on the AG Grid Theming API (`themeQuartz`) with every colour and font
 * param mapped to a BmoAtlas design token via `var(--…)`. Because those tokens
 * are re-defined per `:root[data-theme="…"]` block (see libs/shared/styles),
 * this single theme automatically re-colours for EVERY app theme — light,
 * dark, the metallic set, Merged Blue, Nord, Dracula, etc. — with no
 * per-theme AG Grid configuration.
 *
 * To fine-tune the grid for a specific theme, override the corresponding
 * `--ag-*` custom property inside that theme's file, e.g.:
 *   :root[data-theme="chrome"] { --ag-header-background-color: #e6ebf0; }
 */
export const atlasGridTheme: Theme = themeQuartz.withParams({
  // Surfaces & text
  backgroundColor: 'var(--color-bg-surface)',
  foregroundColor: 'var(--color-text)',
  borderColor: 'var(--color-border)',
  wrapperBorder: false,
  rowBorder: true,

  // Header
  headerBackgroundColor: 'var(--color-bg-muted)',
  headerTextColor: 'var(--color-text-secondary)',
  headerFontWeight: 600,

  // Rows
  oddRowBackgroundColor: 'transparent',
  rowHoverColor: 'var(--color-bg-muted)',
  selectedRowBackgroundColor: 'color-mix(in srgb, var(--color-primary) 16%, transparent)',

  // Accent (focus, checkboxes, range selection, etc.)
  accentColor: 'var(--color-primary)',

  // Typography & density
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  headerFontSize: 12,
  cellHorizontalPadding: 12,
});

let registered = false;

/**
 * Register AG Grid community modules and install the Atlas theme as the global
 * default for every grid. Call once, before the app bootstraps.
 */
export function registerAtlasGrid(): void {
  if (registered) return;
  registered = true;

  ModuleRegistry.registerModules([AllCommunityModule]);
  provideGlobalGridOptions({ theme: atlasGridTheme });
}
