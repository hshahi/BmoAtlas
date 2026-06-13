import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageCatalogEntry } from './search.models';

@Component({
  selector: 'app-search-result-card',
  imports: [RouterLink],
  template: `
    <a class="card" [routerLink]="['/search/detail', entry().id]">
      <div class="card__image-wrapper">
        <img
          class="card__image"
          [src]="entry().imagePath"
          [alt]="entry().app + ' — ' + entry().page"
          loading="lazy"
        />
      </div>

      <div class="card__body">
        <span class="card__badge">{{ entry().app }}</span>
        <h3 class="card__title">{{ entry().page }}</h3>
        <p class="card__description">{{ entry().description }}</p>
      </div>

      <div class="card__footer">
        <span class="card__route">{{ entry().pageRoute }}</span>
      </div>
    </a>
  `,
  styles: [`
    /* ── Card container ─────────────────────── */
    .card {
      display: flex;
      flex-direction: column;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition: box-shadow var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
      cursor: pointer;
      text-decoration: none;
      color: inherit;
    }
    .card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }
    .card:focus-visible {
      outline: 2px solid var(--color-border-focus);
      outline-offset: 2px;
    }

    /* ── Image ───────────────────────────────── */
    .card__image-wrapper {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: var(--color-bg-muted);
      overflow: hidden;
      border-bottom: 1px solid var(--color-border);
    }
    .card__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* ── Body ────────────────────────────────── */
    .card__body {
      flex: 1;
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }
    .card__badge {
      display: inline-block;
      align-self: flex-start;
      padding: 2px var(--space-sm);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--color-primary);
      background: var(--color-primary-light);
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .card__title {
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      color: var(--color-text);
      margin: 0;
      line-height: var(--leading-tight);
    }
    .card__description {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      line-height: var(--leading-normal);
      margin: 0;
      /* Clamp to 3 lines */
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── Footer ──────────────────────────────── */
    .card__footer {
      padding: var(--space-sm) var(--space-md);
      border-top: 1px solid var(--color-border);
      background: var(--color-bg-muted);
    }
    .card__route {
      font-size: var(--text-xs);
      font-family: var(--font-mono);
      color: var(--color-text-muted);
    }

    /* ── Reduced motion ──────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .card {
        transition: none !important;
        transform: none !important;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultCard {
  readonly entry = input.required<PageCatalogEntry>();
}
