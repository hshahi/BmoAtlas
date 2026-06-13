import { Component, ChangeDetectionStrategy, signal, computed, inject, Injector, OnInit, OnDestroy } from '@angular/core';
import { HttpData } from '@core';
import { PageCatalogEntry } from './search.models';
import { SearchResultCard } from './search-result-card';

@Component({
  selector: 'app-search-page',
  imports: [SearchResultCard],
  template: `
    <div class="search-page">
      <!-- Header -->
      <div class="search-page__header">
        <h1 class="search-page__title">🔍 Page Discovery</h1>
        <p class="search-page__subtitle">
          Search across all applications to discover pages and functionality.
        </p>
      </div>

      <!-- Search input -->
      <div class="search-page__input-wrapper">
        <input
          class="search-page__input"
          type="text"
          placeholder="Search by app, page name, description, or keyword…"
          [value]="searchTerm()"
          (input)="onSearchInput($event)"
          aria-label="Search pages"
          autofocus
        />
        @if (searchTerm()) {
          <button
            class="search-page__clear"
            (click)="clearSearch()"
            aria-label="Clear search"
          >✕</button>
        }
      </div>

      <!-- Results count -->
      <div class="search-page__meta">
        @if (catalogData.isLoading()) {
          <span class="search-page__status">Loading catalog…</span>
        } @else if (catalogData.isError()) {
          <span class="search-page__status search-page__status--error">Failed to load page catalog.</span>
        } @else {
          <span class="search-page__count">
            {{ filteredEntries().length }} of {{ catalog().length }} pages
            @if (searchTerm()) {
              matching "<strong>{{ searchTerm() }}</strong>"
            }
          </span>
        }
      </div>

      <!-- Results grid -->
      <div class="search-page__grid">
        @for (entry of filteredEntries(); track entry.id) {
          <app-search-result-card [entry]="entry" />
        } @empty {
          @if (!catalogData.isLoading() && !catalogData.isError()) {
            <div class="search-page__empty">
              <p class="search-page__empty-text">No pages match your search.</p>
              <p class="search-page__empty-hint">Try different keywords or clear the search to see all pages.</p>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    /* ── Page layout ─────────────────────────── */
    .search-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    /* ── Header ──────────────────────────────── */
    .search-page__header {
      margin-bottom: var(--space-sm);
    }
    .search-page__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--color-text);
      margin: 0 0 var(--space-xs);
    }
    .search-page__subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      margin: 0;
      line-height: var(--leading-normal);
    }

    /* ── Search input ────────────────────────── */
    .search-page__input-wrapper {
      position: relative;
    }
    .search-page__input {
      width: 100%;
      padding: var(--space-sm) var(--space-md);
      padding-right: var(--space-2xl);
      font-size: var(--text-base);
      font-family: var(--font-sans);
      color: var(--color-text);
      background: var(--color-bg-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-lg);
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      box-sizing: border-box;
    }
    .search-page__input::placeholder {
      color: var(--color-text-muted);
    }
    .search-page__input:focus {
      border-color: var(--color-border-focus);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }
    .search-page__clear {
      position: absolute;
      right: var(--space-sm);
      top: 50%;
      transform: translateY(-50%);
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: var(--color-bg-muted);
      color: var(--color-text-secondary);
      border-radius: var(--radius-full);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .search-page__clear:hover {
      background: var(--color-border);
      color: var(--color-text);
    }

    /* ── Meta / count ────────────────────────── */
    .search-page__meta {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    .search-page__status--error {
      color: var(--color-danger);
    }

    /* ── Results grid ────────────────────────── */
    .search-page__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-md);
    }

    /* ── Empty state ─────────────────────────── */
    .search-page__empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: var(--space-3xl) var(--space-lg);
    }
    .search-page__empty-text {
      font-size: var(--text-lg);
      color: var(--color-text);
      margin: 0 0 var(--space-xs);
    }
    .search-page__empty-hint {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    /* ── Responsive ──────────────────────────── */
    @media (max-width: 768px) {
      .search-page {
        padding: var(--space-md);
      }
      .search-page__grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .search-page {
        padding: var(--space-sm);
      }
      .search-page__title {
        font-size: var(--text-xl);
      }
    }

    /* ── Reduced motion ──────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .search-page__input,
      .search-page__clear {
        transition: none !important;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPage implements OnInit, OnDestroy {
  private readonly injector = inject(Injector);

  /** Catalog data fetched via HttpData (signal-based httpResource wrapper) */
  readonly catalogData = HttpData.get<PageCatalogEntry[]>(this.injector, {
    url: 'page-catalog.json',
    defaultValue: [],
  });

  /** Catalog entries (never undefined thanks to defaultValue) */
  readonly catalog = this.catalogData.value as ReturnType<typeof computed<PageCatalogEntry[]>>;

  /** Current search term (debounced via setTimeout) */
  readonly searchTerm = signal('');

  /** Filtered entries based on search term */
  readonly filteredEntries = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    const entries = this.catalog();
    if (!q) return entries;

    return entries.filter(entry =>
      entry.app.toLowerCase().includes(q) ||
      entry.page.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.keywords.some(k => k.toLowerCase().includes(q))
    );
  });

  /** Debounce timer handle */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.catalogData.load();
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.catalogData.destroy();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.searchTerm.set(value), 200);
  }

  clearSearch(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.searchTerm.set('');
  }
}
