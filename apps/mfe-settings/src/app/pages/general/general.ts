import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThemeService } from '@shared';

@Component({
  selector: 'app-general-settings',
  template: `
    <div class="general">
      <h2 class="general__title">General Settings</h2>

      <div class="card general__section">
        <h3>Appearance</h3>
        <div class="form-group">
          <label class="form-label">Theme</label>
          <div class="general__theme-options">
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'light'"
              [class.btn--outline]="themeService.resolved() !== 'light'"
              (click)="themeService.setPreference('light')"
            >
              ☀️ Light
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'dark'"
              [class.btn--outline]="themeService.resolved() !== 'dark'"
              (click)="themeService.setPreference('dark')"
            >
              🌙 Dark
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'silver'"
              [class.btn--outline]="themeService.resolved() !== 'silver'"
              (click)="themeService.setPreference('silver')"
            >
              🪙 Silver
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'silver-shine'"
              [class.btn--outline]="themeService.resolved() !== 'silver-shine'"
              (click)="themeService.setPreference('silver-shine')"
            >
              ✨ Silver Shine
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'midnight'"
              [class.btn--outline]="themeService.resolved() !== 'midnight'"
              (click)="themeService.setPreference('midnight')"
            >
              🌌 Midnight
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'platinum'"
              [class.btn--outline]="themeService.resolved() !== 'platinum'"
              (click)="themeService.setPreference('platinum')"
            >
              ⚪ Platinum
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'chrome'"
              [class.btn--outline]="themeService.resolved() !== 'chrome'"
              (click)="themeService.setPreference('chrome')"
            >
              🪞 Chrome
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'titanium'"
              [class.btn--outline]="themeService.resolved() !== 'titanium'"
              (click)="themeService.setPreference('titanium')"
            >
              ⚫ Titanium
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'nord'"
              [class.btn--outline]="themeService.resolved() !== 'nord'"
              (click)="themeService.setPreference('nord')"
            >
              ❄️ Nord
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'dracula'"
              [class.btn--outline]="themeService.resolved() !== 'dracula'"
              (click)="themeService.setPreference('dracula')"
            >
              🧛 Dracula
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'tokyo-night'"
              [class.btn--outline]="themeService.resolved() !== 'tokyo-night'"
              (click)="themeService.setPreference('tokyo-night')"
            >
              🌃 Tokyo Night
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'high-contrast'"
              [class.btn--outline]="themeService.resolved() !== 'high-contrast'"
              (click)="themeService.setPreference('high-contrast')"
            >
              🔲 High Contrast
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'catppuccin'"
              [class.btn--outline]="themeService.resolved() !== 'catppuccin'"
              (click)="themeService.setPreference('catppuccin')"
            >
              🐱 Catppuccin
            </button>
            <button
              class="btn"
              [class.btn--primary]="themeService.resolved() === 'merged-blue'"
              [class.btn--outline]="themeService.resolved() !== 'merged-blue'"
              (click)="themeService.setPreference('merged-blue')"
            >
              🟦 Merged Blue
            </button>
          </div>
        </div>
      </div>

      <div class="card general__section">
        <h3>Notifications</h3>
        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" checked> Email notifications
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">
            <input type="checkbox"> Push notifications
          </label>
        </div>
      </div>

      <div class="card general__section">
        <h3>Language & Region</h3>
        <div class="form-group">
          <label class="form-label">Language</label>
          <select class="form-input">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Timezone</label>
          <select class="form-input">
            <option>UTC</option>
            <option>Europe/London</option>
            <option>America/New_York</option>
          </select>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .general__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      margin-bottom: var(--space-lg);
    }
    .general__section {
      margin-bottom: var(--space-lg);
    }
    .general__section h3 {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      margin-bottom: var(--space-md);
    }
    .general__theme-options {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettings {
  protected readonly themeService = inject(ThemeService);
}
