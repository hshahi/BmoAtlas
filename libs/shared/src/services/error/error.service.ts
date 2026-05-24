import { Injectable, signal, computed } from '@angular/core';
import { ServiceBase } from '@core';

export interface AppError {
  id: string;
  message: string;
  status?: number;
  timestamp: Date;
  url?: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorService extends ServiceBase {

  private readonly STATE_KEY = 'app-errors';
  private errorCounter = 0;

  constructor() {
    super();
    this.setState<AppError[]>(this.STATE_KEY, []);
  }

  readonly errors = this.getState<AppError[]>(this.STATE_KEY);

  readonly latestError = computed(() => {
    const errs = this.errors() ?? [];
    return errs.length > 0 ? errs[errs.length - 1] : undefined;
  });

  readonly hasErrors = computed(() => (this.errors() ?? []).length > 0);

  addError(message: string, status?: number, url?: string): void {
    const error: AppError = {
      id: `err-${++this.errorCounter}`,
      message,
      status,
      timestamp: new Date(),
      url,
    };

    this.updateState<AppError[]>(this.STATE_KEY, current => [...current, error]);

    // Auto-dismiss after 8 seconds
    setTimeout(() => this.dismissError(error.id), 8000);
  }

  dismissError(id: string): void {
    this.updateState<AppError[]>(this.STATE_KEY, current =>
      current.filter(e => e.id !== id)
    );
  }

  clearAll(): void {
    this.setState<AppError[]>(this.STATE_KEY, []);
  }
}
