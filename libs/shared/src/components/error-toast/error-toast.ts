import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { ErrorService } from '../../services/error/error.service';

@Component({
  selector: 'app-error-toast',
  templateUrl: './error-toast.html',
  styleUrl: './error-toast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorToast {

  private readonly errorService = inject(ErrorService);

  protected readonly errors = computed(() => this.errorService.errors() ?? []);
  protected readonly hasErrors = this.errorService.hasErrors;

  protected dismiss(id: string): void {
    this.errorService.dismissError(id);
  }

  protected clearAll(): void {
    this.errorService.clearAll();
  }
}
