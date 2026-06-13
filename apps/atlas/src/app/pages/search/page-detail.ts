import { Component, ChangeDetectionStrategy, signal, inject, Injector, OnInit, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClientData } from '@core';
import { PageCatalogEntry } from './search.models';

@Component({
  selector: 'app-page-detail',
  imports: [RouterLink],
  template: `
    <div class="detail">
      @if (catalogData.isLoading()) {
        <p class="detail__status">Loading page details…</p>
      } @else if (catalogData.isError() || notFound()) {
        <div class="detail__error">
          <p>{{ notFound() ? 'Page "' + pageId() + '" not found in catalog.' : 'Failed to load page details.' }}</p>
          <a class="detail__back-link" routerLink="/search">← Back to search</a>
        </div>
      } @else if (entry()) {
        <!-- Back link -->
        <a class="detail__back-link" routerLink="/search">← Back to search</a>

        <!-- Page header -->
        <div class="detail__header">
          <span class="detail__badge">{{ entry()!.app }}</span>
          <h1 class="detail__title">{{ entry()!.page }}</h1>
          <p class="detail__description">{{ entry()!.description }}</p>
          <a
            class="detail__nav-link"
            [routerLink]="entry()!.pageRoute"
          >
            Open page →
          </a>
        </div>

        <!-- Screenshot -->
        <div class="detail__screenshot-wrapper">
          <h2 class="detail__section-title">Screenshot</h2>
          <div class="detail__screenshot-frame">
            <img
              class="detail__screenshot"
              [src]="entry()!.imagePath"
              [alt]="entry()!.app + ' — ' + entry()!.page + ' screenshot'"
              loading="lazy"
            />
          </div>
        </div>

        <!-- Documentation -->
        <div class="detail__doc">
          <h2 class="detail__section-title">Documentation</h2>
          @if (markdownData.isLoading()) {
            <p class="detail__status">Loading documentation…</p>
          } @else {
            <pre class="detail__markdown">{{ markdownData.value() ?? 'Documentation not available.' }}</pre>
          }
        </div>

        <!-- Keywords -->
        <div class="detail__keywords">
          <h2 class="detail__section-title">Keywords</h2>
          <div class="detail__keyword-list">
            @for (kw of entry()!.keywords; track kw) {
              <span class="detail__keyword">{{ kw }}</span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Layout ──────────────────────────────── */
    .detail {
      max-width: 900px;
      margin: 0 auto;
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    /* ── Status / Error ──────────────────────── */
    .detail__status {
      font-size: var(--text-base);
      color: var(--color-text-secondary);
    }
    .detail__error {
      color: var(--color-danger);
      font-size: var(--text-base);
    }

    /* ── Back link ────────────────────────────── */
    .detail__back-link {
      display: inline-block;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-primary);
      text-decoration: none;
      transition: color var(--transition-fast);
    }
    .detail__back-link:hover {
      color: var(--color-primary-hover);
      text-decoration: underline;
    }
    .detail__back-link:focus-visible {
      outline: 2px solid var(--color-border-focus);
      outline-offset: 2px;
    }

    /* ── Header ──────────────────────────────── */
    .detail__header {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }
    .detail__badge {
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
    .detail__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--color-text);
      margin: 0;
    }
    .detail__description {
      font-size: var(--text-base);
      color: var(--color-text-secondary);
      line-height: var(--leading-normal);
      margin: 0;
    }
    .detail__nav-link {
      display: inline-block;
      align-self: flex-start;
      margin-top: var(--space-xs);
      padding: var(--space-xs) var(--space-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text-inverse);
      background: var(--color-primary);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: background var(--transition-fast);
    }
    .detail__nav-link:hover {
      background: var(--color-primary-hover);
    }
    .detail__nav-link:focus-visible {
      outline: 2px solid var(--color-border-focus);
      outline-offset: 2px;
    }

    /* ── Section titles ──────────────────────── */
    .detail__section-title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--color-text);
      margin: 0 0 var(--space-sm);
    }

    /* ── Screenshot ──────────────────────────── */
    .detail__screenshot-frame {
      background: var(--color-bg-muted);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .detail__screenshot {
      display: block;
      width: 100%;
      height: auto;
    }

    /* ── Documentation ───────────────────────── */
    .detail__markdown {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-md);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--color-text);
      line-height: var(--leading-relaxed);
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-x: auto;
      margin: 0;
    }

    /* ── Keywords ─────────────────────────────── */
    .detail__keyword-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }
    .detail__keyword {
      padding: 2px var(--space-sm);
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      background: var(--color-bg-muted);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-full);
    }

    /* ── Responsive ──────────────────────────── */
    @media (max-width: 768px) {
      .detail {
        padding: var(--space-md);
      }
    }
    @media (max-width: 480px) {
      .detail {
        padding: var(--space-sm);
      }
      .detail__title {
        font-size: var(--text-xl);
      }
    }

    /* ── Reduced motion ──────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .detail__back-link,
      .detail__nav-link {
        transition: none !important;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);

  /** Page ID from route params */
  readonly pageId = signal('');

  /** Whether the page was not found in the catalog */
  readonly notFound = signal(false);

  /** The resolved catalog entry */
  readonly entry = signal<PageCatalogEntry | null>(null);

  /** Catalog data fetched via HttpClientData */
  readonly catalogData = HttpClientData.get<PageCatalogEntry[]>(this.injector, {
    url: 'page-catalog.json',
    defaultValue: [],
  });

  /** Markdown content fetched via HttpClientData */
  readonly markdownData = HttpClientData.get<string>(this.injector, {
    url: 'placeholder',
  });

  /** Track whether markdown has been triggered */
  private markdownLoaded = false;

  constructor() {
    // Use effect() to react when catalog resolves — triggers markdown fetch
    effect(() => {
      const isSuccess = this.catalogData.isSuccess();
      const id = this.pageId();

      if (isSuccess && id && !this.markdownLoaded) {
        const catalog = this.catalogData.value() ?? [];
        const found = catalog.find(e => e.id === id);

        if (!found) {
          this.notFound.set(true);
          return;
        }

        this.entry.set(found);
        this.markdownLoaded = true;

        // Create a new HttpClientData for the markdown file and load it
        const mdData = HttpClientData.get<string>(this.injector, {
          url: found.docPath,
          parse: (raw) => raw as string,
        });
        (this as { markdownData: HttpClientData<string> }).markdownData = mdData;
        mdData.load();
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('pageId') ?? '';
    this.pageId.set(id);

    if (!id) {
      this.notFound.set(true);
      return;
    }

    this.catalogData.load();
  }

  ngOnDestroy(): void {
    this.catalogData.destroy();
    this.markdownData.destroy();
  }
}
