import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * AtlasLoader — composable loading indicator for BmoAtlas.
 *
 * Wraps a section and overlays an animated spinner (with optional message)
 * while `loading` is true — the same "wrap a part of the page" pattern used for
 * the phantom-ui shimmer, so developers can drop one or more loaders around
 * different sections:
 *
 * ```html
 * <!-- overlay a section while it refreshes -->
 * <atlas-loader [loading]="data.isReloading()">
 *   <ag-grid-angular … />
 * </atlas-loader>
 *
 * <!-- standalone (first load / empty area) — give it height -->
 * <atlas-loader style="min-height: 12rem" />
 *
 * <!-- full-screen page overlay -->
 * <atlas-loader [overlay]="true" message="Loading…" />
 * ```
 *
 * When wrapping content, the spinner is absolutely positioned over it (the
 * content dims behind a translucent backdrop). When there is no wrapped
 * content, set a `min-height` so the spinner has room.
 */
@Component({
  selector: 'atlas-loader',
  templateUrl: './atlas-loader.html',
  styleUrl: './atlas-loader.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasLoader {
  /** Whether the loading overlay is shown. Defaults to `true` so a bare `<atlas-loader />` shows the spinner. */
  loading = input<boolean>(true);

  /** Optional message displayed below the spinner. Pass `''` to hide it. */
  message = input<string>('Loading...');

  /** Full-screen fixed overlay (page-level) instead of covering just the wrapped section. */
  overlay = input<boolean>(false);
}
