import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ErrorToast } from '@shared';
import { Toolbar } from './layout/toolbar/toolbar';
import { Breadcrumb } from './layout/breadcrumb/breadcrumb';
import { SideMenu } from './layout/side-menu/side-menu';

const MOBILE_BREAKPOINT = 768;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ErrorToast, Toolbar, Breadcrumb, SideMenu],
  template: `
    <div class="shell" [class.shell--menu-open]="!menuCollapsed()">
      <!-- Row 1: Primary toolbar (full width) -->
      <app-toolbar (menuToggle)="toggleMenu()" />

      <!-- Row 2: Side menu + (breadcrumb + content) -->
      <div class="shell__body">
        <!-- Mobile backdrop overlay -->
        @if (!menuCollapsed()) {
          <div
            class="shell__backdrop"
            (click)="menuCollapsed.set(true)"
            aria-hidden="true"
          ></div>
        }

        <app-side-menu [collapsed]="menuCollapsed()" />

        <div class="shell__right">
          <app-breadcrumb />
          <main class="shell__main">
            <router-outlet />
          </main>
        </div>
      </div>
      <app-error-toast />
    </div>
  `,
  styles: [`
    /* ── Host ─────────────────────────────────── */
    :host {
      display: block;
      height: 100dvh;
      height: 100vh;                /* fallback for older browsers */
      overflow: hidden;
    }

    @supports (height: 100dvh) {
      :host { height: 100dvh; }
    }

    /* ── Shell grid ──────────────────────────── */
    .shell {
      display: grid;
      grid-template-rows: auto 1fr;
      height: 100%;
      background: var(--color-bg);
      isolation: isolate;
    }

    /* ── Body (side menu + right panel) ──────── */
    .shell__body {
      display: flex;
      min-height: 0;
      contain: layout style;
      position: relative;          /* anchor for backdrop */
    }

    /* ── Backdrop (mobile only — hidden on desktop via media query) ── */
    .shell__backdrop {
      display: none;
    }

    /* ── Right panel ─────────────────────────── */
    .shell__right {
      flex: 1 1 0%;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
      container-type: inline-size; /* enable container queries for MFE content */
      container-name: content;
    }

    /* ── Main content area ───────────────────── */
    .shell__main {
      flex: 1 1 0%;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior-y: contain;
      background: var(--color-bg);
      padding: var(--space-md);
    }

    /* ═══════════════════════════════════════════
       RESPONSIVE: Tablet (≤ 1024px)
       ═══════════════════════════════════════════ */
    @media (max-width: 1024px) {
      .shell__main {
        padding: var(--space-sm);
      }
    }

    /* ═══════════════════════════════════════════
       RESPONSIVE: Mobile (≤ 768px)
       Menu becomes an overlay with backdrop
       ═══════════════════════════════════════════ */
    @media (max-width: 768px) {
      /* Backdrop visible on mobile when menu is open */
      .shell--menu-open .shell__backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: var(--overlay-bg);
        z-index: var(--z-backdrop);
        animation: fadeIn 200ms ease forwards;
      }

      /* Side menu becomes fixed overlay */
      .shell--menu-open app-side-menu {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: var(--z-overlay);
        box-shadow: var(--shadow-xl);
        width: var(--sidemenu-width);
      }

      .shell__main {
        padding: var(--space-sm);
      }
    }

    /* ═══════════════════════════════════════════
       RESPONSIVE: Small mobile (≤ 480px)
       ═══════════════════════════════════════════ */
    @media (max-width: 480px) {
      .shell--menu-open app-side-menu {
        width: 85vw;              /* wider menu on small screens */
        max-width: 300px;
      }

      .shell__main {
        padding: var(--space-xs);
      }
    }

    /* ═══════════════════════════════════════════
       REDUCED MOTION
       ═══════════════════════════════════════════ */
    @media (prefers-reduced-motion: reduce) {
      .shell__backdrop {
        animation: none !important;
      }
    }

    /* ── Keyframes ───────────────────────────── */
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** Whether the menu is collapsed (hidden) */
  protected readonly menuCollapsed = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

      // Set initial state — auto-collapse on mobile
      if (mql.matches) {
        this.menuCollapsed.set(true);
      }

      // Listen for viewport changes
      mql.addEventListener('change', (e) => {
        if (e.matches) {
          // Auto-collapse when entering mobile
          this.menuCollapsed.set(true);
        } else {
          // Auto-expand when returning to desktop
          this.menuCollapsed.set(false);
        }
      });
    }
  }

  protected toggleMenu(): void {
    this.menuCollapsed.update(v => !v);
  }
}
