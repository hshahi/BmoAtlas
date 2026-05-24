import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'bmo-atlas-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** The current theme (light | dark). */
  readonly resolved = signal<Theme>(this.loadPreference());

  constructor() {
    // Apply theme to DOM whenever resolved theme changes
    effect(() => {
      const theme = this.resolved();
      this.applyToDOM(theme);
    });
  }

  /** Toggle between light and dark. */
  toggle(): void {
    const next: Theme = this.resolved() === 'light' ? 'dark' : 'light';
    this.resolved.set(next);
    this.savePreference(next);
  }

  /** Set a specific theme. */
  setPreference(theme: Theme): void {
    this.resolved.set(theme);
    this.savePreference(theme);
  }

  private applyToDOM(theme: Theme): void {
    if (!this.isBrowser) return;
    document.documentElement.setAttribute('data-theme', theme);
  }

  private loadPreference(): Theme {
    if (!this.isBrowser) return 'dark';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return 'dark';
  }

  private savePreference(theme: Theme): void {
    if (!this.isBrowser) return;
    localStorage.setItem(STORAGE_KEY, theme);
  }
}
