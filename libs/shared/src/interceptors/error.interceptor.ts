import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from '../services/error/error.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message: string;

      if (error.status === 0) {
        message = 'Network error — please check your connection.';
      } else if (error.status === 401) {
        message = 'Unauthorized — please log in again.';
      } else if (error.status === 403) {
        message = 'Forbidden — you do not have access to this resource.';
      } else if (error.status === 404) {
        message = 'Resource not found.';
      } else if (error.status === 429) {
        message = 'Too many requests — please try again later.';
      } else if (error.status >= 500) {
        message = 'Server error — please try again later.';
      } else {
        message = error.message || 'An unexpected error occurred.';
      }

      errorService.addError(message, error.status, req.url);

      return throwError(() => error);
    })
  );
};
