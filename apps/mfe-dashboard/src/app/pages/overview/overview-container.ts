import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-overview',
  template: `
    <div class="overview">
      <h2 class="overview__title">Overview</h2>
      <div class="overview__grid">
        <div class="card overview__stat">
          <span class="overview__stat-label">Total Users</span>
          <span class="overview__stat-value">12,450</span>
          <span class="overview__stat-change text-gain">+5.2%</span>
        </div>
        <div class="card overview__stat">
          <span class="overview__stat-label">Active Users</span>
          <span class="overview__stat-value">8,320</span>
          <span class="overview__stat-change text-gain">+3.1%</span>
        </div>
        <div class="card overview__stat">
          <span class="overview__stat-label">Revenue</span>
          <span class="overview__stat-value">$1.25M</span>
          <span class="overview__stat-change text-gain">+12.5%</span>
        </div>
        <div class="card overview__stat">
          <span class="overview__stat-label">Conversion</span>
          <span class="overview__stat-value">3.8%</span>
          <span class="overview__stat-change text-loss">-0.4%</span>
        </div>
      </div>

      <div class="overview__nav-cards">
        <button class="card overview__nav-card" (click)="goTo('analytics')">
          <span class="overview__nav-icon">📈</span>
          <div class="overview__nav-text">
            <h3>Analytics</h3>
            <p>View traffic sources, user activity, and trends</p>
          </div>
          <span class="overview__nav-arrow">›</span>
        </button>
        <button class="card overview__nav-card" (click)="goTo('reports')">
          <span class="overview__nav-icon">📋</span>
          <div class="overview__nav-text">
            <h3>Reports</h3>
            <p>Generate and view financial and operational reports</p>
          </div>
          <span class="overview__nav-arrow">›</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ── Host: container query context ────────── */
    :host {
      display: block;
      container-type: inline-size;
      container-name: overview;
    }

    .overview__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      margin-bottom: var(--space-lg);
    }

    /* ── Stats grid — auto-fit with container-aware min ── */
    .overview__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-md);
      margin-bottom: var(--space-xl);
    }

    .overview__stat {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .overview__stat-label {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }

    .overview__stat-value {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      font-family: var(--font-mono);
    }

    .overview__stat-change {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    /* ── Navigation cards ──────────────────── */
    .overview__nav-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--space-md);
    }

    .overview__nav-card {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      cursor: pointer;
      text-align: left;
      min-height: var(--touch-target-min);
      transition: box-shadow var(--transition-fast), transform var(--transition-fast);
    }
    .overview__nav-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }
    .overview__nav-card:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .overview__nav-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .overview__nav-text {
      flex: 1;
      min-width: 0;
    }

    .overview__nav-card h3 {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      margin-bottom: var(--space-xs);
    }

    .overview__nav-card p {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }

    .overview__nav-arrow {
      margin-left: auto;
      font-size: var(--text-2xl);
      color: var(--color-text-muted);
      transition: transform var(--transition-fast);
      flex-shrink: 0;
    }
    .overview__nav-card:hover .overview__nav-arrow {
      transform: translateX(4px);
      color: var(--color-primary);
    }

    /* ═══════════════════════════════════════════
       CONTAINER QUERIES — respond to parent width
       These fire based on the content area width,
       NOT the viewport. Critical for MFEs that may
       be embedded in different shell layouts.
       ═══════════════════════════════════════════ */

    /* Narrow content (< 600px) — stack stats 2-col */
    @container overview (max-width: 600px) {
      .overview__grid {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-sm);
      }
      .overview__nav-cards {
        grid-template-columns: 1fr;
      }
      .overview__title {
        font-size: var(--text-xl);
      }
    }

    /* Very narrow (< 400px) — single column everything */
    @container overview (max-width: 400px) {
      .overview__grid {
        grid-template-columns: 1fr;
      }
      .overview__nav-card {
        padding: var(--space-sm) var(--space-md);
      }
      .overview__nav-card p {
        display: none;             /* hide description on very narrow */
      }
      .overview__stat-value {
        font-size: var(--text-xl);
      }
    }

    /* Wide content (> 900px) — nav cards side by side */
    @container overview (min-width: 900px) {
      .overview__nav-cards {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    /* ═══════════════════════════════════════════
       REDUCED MOTION
       ═══════════════════════════════════════════ */
    @media (prefers-reduced-motion: reduce) {
      .overview__nav-card {
        transition: none !important;
      }
      .overview__nav-card:hover {
        transform: none;
      }
      .overview__nav-arrow {
        transition: none !important;
      }
    }

    /* ═══════════════════════════════════════════
       HIGH CONTRAST
       ═══════════════════════════════════════════ */
    @media (forced-colors: active) {
      .overview__nav-card:focus-visible {
        outline: 2px solid Highlight;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewContainer {
  private readonly router = inject(Router);

  goTo(page: string): void {
    // Navigate using relative sibling route — works both standalone and as remote
    this.router.navigate(['../', page], { relativeTo: this.getActivatedRoute() });
  }

  private getActivatedRoute() {
    // Walk the router state to find the deepest activated route
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }
}
