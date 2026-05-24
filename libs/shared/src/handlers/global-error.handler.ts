import { ErrorHandler, Injectable, inject, Injector } from '@angular/core';
import { ErrorService } from '../services/error/error.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    // Log to console in development
    console.error('GlobalErrorHandler caught:', error);

    // Lazily resolve ErrorService to avoid circular DI
    const errorService = this.injector.get(ErrorService);

    let message = 'An unexpected application error occurred.';

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    errorService.addError(message);
  }
}
