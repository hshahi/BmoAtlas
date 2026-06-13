import { Component, ChangeDetectionStrategy, input, signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';

/** A page within an app (leaf node — navigable) */
export interface MenuPage {
  label: string;
  route: string;
}

/** An app within an area (may have sub-pages) */
export interface MenuApp {
  label: string;
  route: string;
  pages?: MenuPage[];
}

/** A top-level area (may have child apps, or be a direct link) */
export interface MenuArea {
  label: string;
  route?: string;
  apps?: MenuApp[];
}

@Component({
  selector: 'app-side-menu',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="side-menu" [class.side-menu--collapsed]="collapsed()" aria-label="Main navigation">
      <!-- User bar at top of menu -->
      <div class="side-menu__user-bar">
        <span class="side-menu__username">ibg&#92;user</span>
        <a
          class="side-menu__search-btn"
          routerLink="/search"
          aria-label="Search pages"
          title="Search pages"
        >🔍</a>
      </div>
      <div class="side-menu__viewport">
        <div
          class="side-menu__slider"
          [class.side-menu__slider--inner]="!!activeArea()"
          [class.side-menu__slider--animate-forward]="animDirection() === 'forward'"
          [class.side-menu__slider--animate-back]="animDirection() === 'back'"
          (animationend)="onAnimEnd()"
        >
          <!-- ═══ PANEL 1: Main Menu ═══ -->
          <div class="side-menu__panel">
            <ul class="side-menu__list">
              @for (area of menuAreas; track area.label) {
                <li class="side-menu__item">
                  @if (area.apps) {
                    <button
                      class="side-menu__link side-menu__link--has-children"
                      (click)="drillInto(area)"
                    >
                      <span class="side-menu__label">{{ area.label }}</span>
                      <span class="side-menu__arrow">›</span>
                    </button>
                  } @else {
                    <a
                      class="side-menu__link"
                      [routerLink]="area.route"
                      routerLinkActive="side-menu__link--active"
                      [routerLinkActiveOptions]="{ exact: area.route === '/home' }"
                    >
                      <span class="side-menu__label">{{ area.label }}</span>
                    </a>
                  }
                </li>
              }
            </ul>
          </div>

          <!-- ═══ PANEL 2: Inner Menu ═══ -->
          <div class="side-menu__panel">
            @if (activeArea()) {
              <button class="side-menu__back" (click)="goBack()">
                <span class="side-menu__back-arrow">‹</span>
                Back
              </button>

              <ul class="side-menu__list">
                @for (app of activeArea()!.apps; track app.route) {
                  <li class="side-menu__item">
                    @if (app.pages && app.pages.length > 0) {
                      <div class="side-menu__app-group">
                        <div class="side-menu__app-header">
                          <a
                            class="side-menu__link side-menu__link--app"
                            [routerLink]="app.route"
                            routerLinkActive="side-menu__link--active"
                          >
                            <span class="side-menu__label">{{ app.label }}</span>
                          </a>
                          <button
                            class="side-menu__expand-btn"
                            (click)="toggleExpand(app.route)"
                            [attr.aria-expanded]="isExpanded(app.route)"
                            [attr.aria-label]="'Expand ' + app.label"
                          >
                            <span class="side-menu__expand-icon" [class.side-menu__expand-icon--open]="isExpanded(app.route)">+</span>
                          </button>
                        </div>

                        <div class="side-menu__sublist-wrapper" [class.side-menu__sublist-wrapper--open]="isExpanded(app.route)">
                          <ul class="side-menu__sublist">
                            @for (page of app.pages; track page.route) {
                              <li class="side-menu__subitem">
                                <a
                                  class="side-menu__sublink"
                                  [routerLink]="page.route"
                                  routerLinkActive="side-menu__sublink--active"
                                >
                                  {{ page.label }}
                                </a>
                              </li>
                            }
                          </ul>
                        </div>
                      </div>
                    } @else {
                      <a
                        class="side-menu__link"
                        [routerLink]="app.route"
                        routerLinkActive="side-menu__link--active"
                      >
                        <span class="side-menu__label">{{ app.label }}</span>
                      </a>
                    }
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    /* ══════════════════════════════════════════════
       HOST
       ══════════════════════════════════════════════ */
    :host {
      display: flex;
      flex-shrink: 0;
      contain: layout style;
    }

    /* ══════════════════════════════════════════════
       CONTAINER
       ══════════════════════════════════════════════ */
    .side-menu {
      width: var(--sidemenu-width);
      height: 100%;
      background: var(--sidemenu-bg);
      transition: width var(--transition-base);
      overflow: hidden;
      border-right: 1px solid var(--toolbar-border);
      display: flex;
      flex-direction: column;
      will-change: width;
    }
    .side-menu--collapsed {
      width: 0;
      border-right: none;
    }

    /* ══════════════════════════════════════════════
       USER BAR
       ══════════════════════════════════════════════ */
    .side-menu__user-bar {
      display: flex;
      align-items: center;
      height: var(--toolbar-secondary-height);
      padding-inline: var(--space-md);
      background: rgba(0, 0, 0, 0.15);
      font-size: var(--text-xs);
      color: var(--toolbar-text-muted);
      border-bottom: 1px solid var(--sidemenu-border);
      flex-shrink: 0;
      white-space: nowrap;
      gap: var(--space-sm);
    }
    .side-menu__username {
      font-weight: var(--weight-medium);
    }
    .side-menu__search-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-left: auto;
      border-radius: var(--radius-sm);
      text-decoration: none;
      font-size: var(--text-sm);
      line-height: 1;
      transition: background var(--transition-fast);
    }
    .side-menu__search-btn:hover {
      background: var(--sidemenu-active-bg);
    }
    .side-menu__search-btn:focus-visible {
      outline: 2px solid var(--bmo-blue-light);
      outline-offset: -2px;
    }

    /* ══════════════════════════════════════════════
       VIEWPORT & SLIDER
       ══════════════════════════════════════════════ */
    .side-menu__viewport {
      flex: 1 1 0%;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior-y: contain;

      /* Thin scrollbar — standard */
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
      scrollbar-gutter: stable;
    }
    /* Thin scrollbar — WebKit */
    .side-menu__viewport::-webkit-scrollbar {
      width: 4px;
    }
    .side-menu__viewport::-webkit-scrollbar-track {
      background: transparent;
    }
    .side-menu__viewport::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.15);
      border-radius: 2px;
    }
    .side-menu__viewport::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.25);
    }

    .side-menu__slider {
      display: flex;
      width: 200%;
      will-change: transform;
    }
    .side-menu__slider--inner {
      transform: translateX(-50%);
    }

    /* Slide forward (main → inner) */
    .side-menu__slider--animate-forward {
      animation: slideForward 250ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes slideForward {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }

    /* Slide back (inner → main) */
    .side-menu__slider--animate-back {
      animation: slideBack 250ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes slideBack {
      from { transform: translateX(-50%); }
      to   { transform: translateX(0); }
    }

    /* ══════════════════════════════════════════════
       PANELS
       ══════════════════════════════════════════════ */
    .side-menu__panel {
      width: 50%;
      flex-shrink: 0;
    }

    /* ══════════════════════════════════════════════
       LISTS
       ══════════════════════════════════════════════ */
    .side-menu__list {
      display: flex;
      flex-direction: column;
    }

    /* ══════════════════════════════════════════════
       LINKS — touch-friendly with min-height
       ══════════════════════════════════════════════ */
    .side-menu__link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: var(--touch-target-min);  /* WCAG 2.2 touch target */
      padding: var(--space-sm) var(--space-md);
      color: var(--sidemenu-text);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      transition: background var(--transition-fast), color var(--transition-fast);
      white-space: nowrap;
      border-bottom: 1px solid var(--sidemenu-border);
      text-align: left;
    }
    .side-menu__link:hover {
      background: var(--sidemenu-active-bg);
      color: var(--sidemenu-text-hover);
    }
    /* Focus-visible for keyboard navigation */
    .side-menu__link:focus-visible {
      outline: 2px solid var(--bmo-blue-light);
      outline-offset: -2px;
    }
    .side-menu__link--active {
      background: rgba(0, 0, 0, 0.2);
      color: var(--sidemenu-text-hover);
      border-left: 3px solid var(--bmo-blue-light, #4da3d4);
    }
    .side-menu__link--has-children {
      cursor: pointer;
    }
    .side-menu__arrow {
      font-size: var(--text-lg);
      opacity: 0.5;
      transition: transform var(--transition-fast);
    }
    .side-menu__link--has-children:hover .side-menu__arrow {
      transform: translateX(2px);
    }
    .side-menu__label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ══════════════════════════════════════════════
       BACK BUTTON
       ══════════════════════════════════════════════ */
    .side-menu__back {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      width: 100%;
      min-height: var(--touch-target-min);
      padding: var(--space-sm) var(--space-md);
      color: var(--sidemenu-text-hover);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      border-bottom: 1px solid var(--sidemenu-border);
      transition: background var(--transition-fast);
      text-align: left;
    }
    .side-menu__back:hover {
      background: var(--sidemenu-active-bg);
    }
    .side-menu__back:focus-visible {
      outline: 2px solid var(--bmo-blue-light);
      outline-offset: -2px;
    }
    .side-menu__back-arrow {
      font-size: var(--text-lg);
      transition: transform var(--transition-fast);
    }
    .side-menu__back:hover .side-menu__back-arrow {
      transform: translateX(-2px);
    }

    /* ══════════════════════════════════════════════
       APP GROUP (expandable)
       ══════════════════════════════════════════════ */
    .side-menu__app-header {
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--sidemenu-border);
    }
    .side-menu__app-header .side-menu__link {
      flex: 1;
      border-bottom: none;
    }
    .side-menu__expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--touch-target-min);   /* WCAG touch target */
      height: var(--touch-target-min);
      margin-right: var(--space-xs);
      color: var(--sidemenu-text);
      border: none;
      background: none;
      border-radius: var(--radius-sm);
      font-size: var(--text-sm);
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }
    .side-menu__expand-btn:hover {
      background: var(--sidemenu-active-bg);
      color: var(--sidemenu-text-hover);
    }
    .side-menu__expand-btn:focus-visible {
      outline: 2px solid var(--bmo-blue-light);
      outline-offset: -2px;
    }
    .side-menu__expand-icon {
      font-weight: var(--weight-bold);
      line-height: 1;
      transition: transform var(--transition-fast);
    }
    .side-menu__expand-icon--open {
      transform: rotate(45deg);
    }

    /* ══════════════════════════════════════════════
       SUB-PAGES (animated expand/collapse)
       ══════════════════════════════════════════════ */
    .side-menu__sublist-wrapper {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .side-menu__sublist-wrapper--open {
      grid-template-rows: 1fr;
    }
    .side-menu__sublist {
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: rgba(0, 0, 0, 0.1);
    }
    .side-menu__sublink {
      display: block;
      min-height: var(--touch-target-min);
      display: flex;
      align-items: center;
      padding: var(--space-xs) var(--space-md) var(--space-xs) var(--space-xl);
      color: var(--sidemenu-text);
      font-size: var(--text-sm);
      border-bottom: 1px solid var(--sidemenu-border);
      transition: background var(--transition-fast), color var(--transition-fast);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .side-menu__sublink:hover {
      background: var(--sidemenu-active-bg);
      color: var(--sidemenu-text-hover);
    }
    .side-menu__sublink:focus-visible {
      outline: 2px solid var(--bmo-blue-light);
      outline-offset: -2px;
    }
    .side-menu__sublink--active {
      background: rgba(0, 0, 0, 0.15);
      color: var(--sidemenu-text-hover);
      border-left: 3px solid var(--bmo-blue-light, #4da3d4);
    }

    /* ══════════════════════════════════════════════
       RESPONSIVE: Mobile (≤ 768px)
       On mobile the menu is an overlay (handled by app.ts)
       so we make it full-height and slightly wider
       ══════════════════════════════════════════════ */
    @media (max-width: 768px) {
      .side-menu {
        width: var(--sidemenu-width);  /* fixed width when shown as overlay */
      }
      .side-menu--collapsed {
        width: 0;
      }
    }

    /* ══════════════════════════════════════════════
       RESPONSIVE: Small mobile (≤ 480px)
       ══════════════════════════════════════════════ */
    @media (max-width: 480px) {
      .side-menu {
        width: 85vw;
        max-width: 300px;
      }
      .side-menu--collapsed {
        width: 0;
        max-width: 0;
      }
      .side-menu__link {
        font-size: var(--text-base);  /* slightly larger for touch */
        padding: var(--space-md);
      }
      .side-menu__sublink {
        padding-left: var(--space-lg);
        font-size: var(--text-base);
      }
    }

    /* ══════════════════════════════════════════════
       REDUCED MOTION
       Disable all animations for users who prefer it
       ══════════════════════════════════════════════ */
    @media (prefers-reduced-motion: reduce) {
      .side-menu {
        transition: none !important;
        will-change: auto;
      }
      .side-menu__slider {
        will-change: auto;
      }
      .side-menu__slider--animate-forward,
      .side-menu__slider--animate-back {
        animation: none !important;
      }
      /* Instant slide — no animation */
      .side-menu__slider--animate-forward {
        transform: translateX(-50%);
      }
      .side-menu__slider--animate-back {
        transform: translateX(0);
      }
      .side-menu__sublist-wrapper {
        transition: none !important;
      }
      .side-menu__expand-icon {
        transition: none !important;
      }
      .side-menu__link,
      .side-menu__sublink,
      .side-menu__back,
      .side-menu__arrow,
      .side-menu__back-arrow {
        transition: none !important;
      }
    }

    /* ══════════════════════════════════════════════
       HIGH CONTRAST
       ══════════════════════════════════════════════ */
    @media (forced-colors: active) {
      .side-menu__link--active,
      .side-menu__sublink--active {
        border-left: 3px solid LinkText;
      }
      .side-menu__expand-btn {
        outline: 1px solid ButtonText;
      }
      .side-menu__link:focus-visible,
      .side-menu__back:focus-visible,
      .side-menu__expand-btn:focus-visible,
      .side-menu__sublink:focus-visible {
        outline: 2px solid Highlight;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenu {
  collapsed = input<boolean>(false);

  private readonly router = inject(Router);

  /** Currently drilled-into area (null = show main menu) */
  readonly activeArea = signal<MenuArea | null>(null);

  /** Animation direction for slide transitions */
  readonly animDirection = signal<'forward' | 'back' | null>(null);

  /** Set of expanded app routes */
  private readonly expandedApps = signal<Set<string>>(new Set());

  constructor() {
    // Sync on initial load
    this.syncMenuToUrl(this.router.url, false);

    // Sync on future navigations
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects)
    ).subscribe(u => this.syncMenuToUrl(u, false));
  }

  /** ── Menu Data ─────────────────────────────── */
  readonly menuAreas: MenuArea[] = [
    { label: 'Home', route: '/home' },
    { label: 'Schedule', route: '/schedule' },
    { label: 'CMART', route: '/cmart' },
    { label: 'FCA Reporting', route: '/fca-reporting' },
    {
      label: 'Front Office',
      apps: [
        {
          label: 'Dashboard',
          route: '/front-office/dashboard',
          pages: [
            { label: 'Overview', route: '/front-office/dashboard/overview' },
            { label: 'Analytics', route: '/front-office/dashboard/analytics' },
            { label: 'Reports', route: '/front-office/dashboard/reports' },
          ],
        },
        {
          label: 'Settings',
          route: '/front-office/settings',
          pages: [
            { label: 'General', route: '/front-office/settings/general' },
            { label: 'Profile', route: '/front-office/settings/profile' },
          ],
        },
        {
          label: 'Stocks',
          route: '/front-office/stocks',
          pages: [
            { label: 'Summary', route: '/front-office/stocks/summary' },
            { label: 'Breakdown', route: '/front-office/stocks/breakdown' },
          ],
        },
      ],
    },
    { label: 'Regulatory Reporting', route: '/regulatory-reporting' },
    { label: 'Internal BMO Reporting', route: '/internal-bmo-reporting' },
    { label: 'Liquidity Risk', route: '/liquidity-risk' },
    { label: 'Operations', route: '/operations' },
    { label: 'Cash Rec', route: '/cash-rec' },
    { label: 'Audit', route: '/audit' },
    { label: 'Platform Data', route: '/platform-data' },
    { label: 'Reconciliation', route: '/reconciliation' },
    { label: 'Adenza', route: '/adenza' },
    { label: 'Statistics', route: '/statistics' },
    { label: 'Counterparty', route: '/counterparty' },
    { label: 'Securities', route: '/securities' },
    { label: 'IFPR', route: '/ifpr' },
  ];

  /** Drill into an area's inner menu with animation */
  drillInto(area: MenuArea): void {
    this.activeArea.set(area);
    this.animDirection.set('forward');
  }

  /** Go back to main menu with animation */
  goBack(): void {
    this.animDirection.set('back');
  }

  /** Called when CSS animation ends */
  onAnimEnd(): void {
    if (this.animDirection() === 'back') {
      this.activeArea.set(null);
      this.expandedApps.set(new Set());
    }
    this.animDirection.set(null);
  }

  /** Toggle expand/collapse for an app's sub-pages */
  toggleExpand(appRoute: string): void {
    this.expandedApps.update(set => {
      const next = new Set(set);
      if (next.has(appRoute)) {
        next.delete(appRoute);
      } else {
        next.add(appRoute);
      }
      return next;
    });
  }

  /** Check if an app is expanded */
  isExpanded(appRoute: string): boolean {
    return this.expandedApps().has(appRoute);
  }

  /** Sync menu state to the current URL (for page reload support) */
  private syncMenuToUrl(url: string, animate: boolean): void {
    for (const area of this.menuAreas) {
      if (area.apps) {
        for (const app of area.apps) {
          if (url.startsWith(app.route)) {
            if (!this.activeArea()) {
              this.activeArea.set(area);
              if (animate) {
                this.animDirection.set('forward');
              }
            }
            // Auto-expand the app if we're on one of its sub-pages
            if (app.pages) {
              for (const page of app.pages) {
                if (url.startsWith(page.route)) {
                  this.expandedApps.update(set => {
                    const next = new Set(set);
                    next.add(app.route);
                    return next;
                  });
                  return;
                }
              }
            }
            return;
          }
        }
      }
    }
  }
}
