import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dashboard">
      <nav class="dashboard__nav">
        <a class="dashboard__tab" routerLink="overview" routerLinkActive="dashboard__tab--active">Overview</a>
        <a class="dashboard__tab" routerLink="analytics" routerLinkActive="dashboard__tab--active">Analytics</a>
        <a class="dashboard__tab" routerLink="reports" routerLinkActive="dashboard__tab--active">Reports</a>
      </nav>
      <div class="dashboard__content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .dashboard__nav {
      display: flex;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-surface);
    }
    .dashboard__tab {
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);
    }
    .dashboard__tab:hover {
      background: var(--color-bg-muted);
      color: var(--color-text);
    }
    .dashboard__tab--active {
      color: var(--color-primary);
      border-bottom: 2px solid var(--color-primary);
    }
    .dashboard__content {
      padding: var(--space-lg);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
