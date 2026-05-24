import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="stocks">
      <nav class="stocks__nav">
        <a class="stocks__tab" routerLink="summary" routerLinkActive="stocks__tab--active">Summary</a>
        <a class="stocks__tab" routerLink="breakdown" routerLinkActive="stocks__tab--active">Breakdown</a>
      </nav>
      <div class="stocks__content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .stocks__nav {
      display: flex;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-surface);
    }
    .stocks__tab {
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);
    }
    .stocks__tab:hover {
      background: var(--color-bg-muted);
      color: var(--color-text);
    }
    .stocks__tab--active {
      color: var(--color-primary);
      border-bottom: 2px solid var(--color-primary);
    }
    .stocks__content {
      padding: var(--space-lg);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
