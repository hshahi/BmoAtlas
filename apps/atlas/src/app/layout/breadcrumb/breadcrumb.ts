import { Component, ChangeDetectionStrategy, inject, Signal } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

export interface BreadcrumbItem {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  template: `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol class="breadcrumb__list">
        @for (crumb of breadcrumbs(); track crumb.url; let last = $last) {
          <li class="breadcrumb__item">
            @if (!last) {
              <a class="breadcrumb__link" [routerLink]="crumb.url">{{ crumb.label }}</a>
              <span class="breadcrumb__separator" aria-hidden="true">/</span>
            } @else {
              <span class="breadcrumb__current" aria-current="page">{{ crumb.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [`
    /* ── Host ─────────────────────────────────── */
    :host {
      display: block;
      flex-shrink: 0;
    }

    /* ── Breadcrumb ──────────────────────────── */
    .breadcrumb {
      padding: var(--space-sm) var(--space-md);
      background: var(--toolbar-bg);
      border-bottom: 1px solid var(--toolbar-border);
      flex-shrink: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .breadcrumb::-webkit-scrollbar {
      display: none;
    }

    .breadcrumb__list {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: var(--text-sm);
      white-space: nowrap;
    }

    .breadcrumb__item {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .breadcrumb__link {
      color: var(--bmo-blue-light);
      transition: color var(--transition-fast);
    }
    .breadcrumb__link:hover {
      color: var(--bmo-white);
    }

    .breadcrumb__separator {
      color: var(--toolbar-text-muted);
    }

    .breadcrumb__current {
      color: var(--toolbar-text);
      font-weight: var(--weight-semibold);
    }

    /* ═══ Small mobile (≤ 480px) ══════════════ */
    @media (max-width: 480px) {
      .breadcrumb {
        padding: var(--space-xs) var(--space-sm);
      }
      .breadcrumb__list {
        font-size: var(--text-xs);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Breadcrumb {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly navigationEnd = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.buildBreadcrumbs(this.activatedRoute.root))
    ),
    { initialValue: [] as BreadcrumbItem[] }
  );

  readonly breadcrumbs: Signal<BreadcrumbItem[]> = this.navigationEnd;

  private buildBreadcrumbs(route: ActivatedRoute, url = '', breadcrumbs: BreadcrumbItem[] = []): BreadcrumbItem[] {
    const children = route.children;

    for (const child of children) {
      const routeURL = child.snapshot.url.map(segment => segment.path).join('/');
      const nextURL = routeURL ? `${url}/${routeURL}` : url;

      const label = child.snapshot.data['breadcrumb'];
      if (label) {
        breadcrumbs.push({ label, url: nextURL });
      }

      this.buildBreadcrumbs(child, nextURL, breadcrumbs);
    }

    return breadcrumbs;
  }
}
