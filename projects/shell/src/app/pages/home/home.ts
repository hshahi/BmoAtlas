import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="home">
      <p class="home__welcome">🌐 Welcome to Atlas</p>
      <a class="home__link" routerLink="/material">Angular Material showcase →</a>
    </div>
  `,
  styles: [`
    .home {
      padding: var(--space-lg);
    }
    .home__welcome {
      font-size: var(--text-lg);
      color: var(--color-text);
    }
    .home__link {
      display: inline-block;
      margin-top: var(--space-md);
      color: var(--color-primary);
      font-weight: var(--weight-medium);
      text-decoration: none;
    }
    .home__link:hover { text-decoration: underline; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
