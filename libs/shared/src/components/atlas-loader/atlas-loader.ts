import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * AtlasLoader — Enterprise loading indicator for BmoAtlas.
 *
 * Displays an animated loading spinner with optional message text.
 * Used as the default loader when MFEs are being fetched or during
 * route transitions.
 *
 * Usage:
 * ```html
 * <atlas-loader />
 * <atlas-loader message="Loading dashboard..." />
 * <atlas-loader [overlay]="true" />
 * ```
 */
@Component({
  selector: 'atlas-loader',
  templateUrl: './atlas-loader.html',
  styleUrl: './atlas-loader.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasLoader {
  /** Optional message displayed below the spinner. */
  message = input<string>('Loading...');

  /** Whether to display as a full-screen overlay. */
  overlay = input<boolean>(false);
}
