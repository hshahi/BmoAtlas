import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * A pass-through shell component for area routes that have child MFE routes.
 * Simply renders a <router-outlet> so child routes can load.
 */
@Component({
  selector: 'app-area-shell',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaShell {}
