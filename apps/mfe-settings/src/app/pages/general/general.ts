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
      gap: var(--space-sm);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettings {
  protected readonly themeService = inject(ThemeService);
}
