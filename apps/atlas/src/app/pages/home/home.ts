import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <div class="home">
      <p class="home__welcome">🌐 Welcome to Atlas</p>
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
