import { Component, ChangeDetectionStrategy, inject, OnInit, signal, output } from '@angular/core';
import { ThemeService } from '@shared';
import { ComponentBase } from '@core';

@Component({
  selector: 'app-toolbar',
  template: `
    <header class="toolbar">
      <div class="toolbar__left">
        <div class="toolbar__brand">
          <span class="toolbar__logo">BMO</span>
          <span class="toolbar__logo-divider"></span>
          <span class="toolbar__logo-text">Capital Markets</span>
        </div>
        <div class="toolbar__meta">
          <span class="toolbar__version">Atlas Portal v2.0.0</span>
          <button class="toolbar__dropdown">
            Capital Markets - UK
            <span class="toolbar__caret">▾</span>
          </button>
        </div>
      </div>
      <div class="toolbar__right">
        @if (stockSymbol()) {
          <div class="toolbar__stock-info">
            <span class="toolbar__stock-symbol">📈 {{ stockSymbol() }}</span>
            <span class="toolbar__stock-page">{{ stockPage() }}</span>
            <button class="toolbar__icon-btn" (click)="refreshStocks()" aria-label="Refresh stock data">
              🔄
            </button>
          </div>
        }
        <div class="toolbar__status">
          <span class="toolbar__status-label">Data Status:</span>
          <span class="toolbar__status-value">● Live</span>
        </div>
        <button class="toolbar__icon-btn" (click)="themeService.toggle()" [attr.aria-label]="'Switch theme (current: ' + themeService.resolved() + ')'">
          @if (themeService.resolved() === 'dark') {
            ☀️
          } @else {
            🌙
          }
        </button>
        <button class="toolbar__icon-btn" (click)="menuToggle.emit()" aria-label="Toggle menu">
          <svg class="toolbar__menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  `,
  styles: [`
    /* ── Host ─────────────────────────────────── */
    :host {
      display: block;
      flex-shrink: 0;
    }

    /* ── Toolbar container ───────────────────── */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--toolbar-height);
      padding-inline: var(--space-md);
      background: var(--toolbar-bg);
      color: var(--toolbar-text);
      z-index: var(--z-sticky);
      font-size: var(--text-sm);
      border-bottom: 1px solid var(--toolbar-border);
    }

    .toolbar__left {
      display: flex;
      align-items: center;
      gap: var(--space-lg);
      min-width: 0;               /* allow shrinking */
    }

    .toolbar__brand {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-shrink: 0;             /* brand never shrinks */
    }

    .toolbar__logo {
      font-weight: var(--weight-bold);
      font-size: var(--text-lg);
      letter-spacing: 0.05em;
      color: var(--bmo-white);
    }

    .toolbar__logo-divider {
      width: 1px;
      height: 20px;
      background: var(--toolbar-border);
    }

    .toolbar__logo-text {
      font-size: var(--text-sm);
      color: var(--toolbar-text);
      font-weight: var(--weight-medium);
      white-space: nowrap;
    }

    .toolbar__meta {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      font-size: var(--text-xs);
      color: var(--toolbar-text-muted);
    }

    .toolbar__version {
      opacity: 0.7;
      white-space: nowrap;
    }

    .toolbar__dropdown {
      color: var(--toolbar-text);
      font-size: var(--text-xs);
      padding: 2px var(--space-sm);
      border: none;
      background: none;
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
      white-space: nowrap;
      min-height: var(--touch-target-min);  /* WCAG touch target */
      display: inline-flex;
      align-items: center;
    }
    .toolbar__dropdown:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .toolbar__caret {
      font-size: 0.6em;
      margin-left: 2px;
    }

    .toolbar__right {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      flex-shrink: 0;
    }

    .toolbar__stock-info {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 2px var(--space-sm);
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.08);
      font-size: var(--text-xs);
    }

    .toolbar__stock-symbol {
      font-weight: var(--weight-semibold);
      color: var(--toolbar-text);
    }

    .toolbar__stock-page {
      color: var(--toolbar-text-muted);
    }

    .toolbar__status {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: var(--text-xs);
    }

    .toolbar__status-label {
      color: var(--toolbar-text-muted);
    }

    .toolbar__status-value {
      color: #4ade80;
    }

    .toolbar__icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--touch-target-min);   /* WCAG touch target */
      height: var(--touch-target-min);
      border: none;
      background: none;
      border-radius: var(--radius-sm);
      font-size: var(--text-sm);
      transition: background var(--transition-fast);
    }
    .toolbar__icon-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .toolbar__menu-icon {
      width: 16px;
      height: 16px;
      color: var(--toolbar-text);
    }

    /* ═══ Tablet (≤ 1024px) ═══════════════════ */
    @media (max-width: 1024px) {
      .toolbar__version {
        display: none;
      }
      .toolbar__left {
        gap: var(--space-md);
      }
    }

    /* ═══ Mobile (≤ 768px) ════════════════════ */
    @media (max-width: 768px) {
      .toolbar {
        padding-inline: var(--space-sm);
      }
      .toolbar__meta {
        display: none;
      }
      .toolbar__status {
        display: none;
      }
      .toolbar__logo-text {
        display: none;
      }
      .toolbar__logo-divider {
        display: none;
      }
      .toolbar__right {
        gap: var(--space-sm);
      }
      .toolbar__stock-page {
        display: none;
      }
    }

    /* ═══ Small mobile (≤ 480px) ══════════════ */
    @media (max-width: 480px) {
      .toolbar {
        height: 36px;
      }
      .toolbar__stock-info {
        display: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toolbar extends ComponentBase implements OnInit {
  protected readonly themeService = inject(ThemeService);

  readonly menuToggle = output<void>();

  /** Stock info received from MFE pages */
  readonly stockSymbol = signal<string>('');
  readonly stockPage = signal<string>('');

  ngOnInit(): void {
    // Listen for stock page navigation messages (MFE → Toolbar)
    this.subscribe<{ symbol: string; page: string }>('stocks:symbol-changed', (msg) => {
      this.stockSymbol.set(msg.symbol);
      this.stockPage.set(msg.page);
    });
  }

  /** Send refresh command to stock pages (Toolbar → MFE) */
  refreshStocks(): void {
    this.publish('toolbar:stocks-action', { action: 'refresh' });
  }
}
