import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="settings">
      <nav class="settings__nav">
        <a class="settings__link" routerLink="general" routerLinkActive="settings__link--active">General</a>
        <a class="settings__link" routerLink="profile" routerLinkActive="settings__link--active">Profile</a>
      </nav>
      <div class="settings__content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .settings {
      display: flex;
      gap: var(--space-lg);
    }
    .settings__nav {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 180px;
      padding: var(--space-md) 0;
    }
    .settings__link {
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);
    }
    .settings__link:hover {
      background: var(--color-bg-muted);
      color: var(--color-text);
    }
    .settings__link--active {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }
    .settings__content {
      flex: 1;
      min-width: 0;
    }

    @media (max-width: 600px) {
      .settings {
        flex-direction: column;
      }
      .settings__nav {
        flex-direction: row;
        min-width: auto;
        overflow-x: auto;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
