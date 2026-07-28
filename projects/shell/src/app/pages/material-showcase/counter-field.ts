import {
  Component,
  ChangeDetectionStrategy,
  forwardRef,
  signal,
  input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

/**
 * A custom form control that shows how the control set can be EXTENDED.
 *
 * By implementing `ControlValueAccessor` and registering itself with
 * `NG_VALUE_ACCESSOR`, this component participates in Angular forms exactly like
 * a built-in Material control — it supports `[(ngModel)]`, `[formControl]`,
 * `[disabled]`, validation and touched/dirty tracking, with no extra glue.
 */
@Component({
  selector: 'app-counter-field',
  imports: [MatButtonModule],
  template: `
    <div class="counter" [class.counter--disabled]="disabled()">
      <button matButton="outlined" type="button"
              [disabled]="disabled()"
              (click)="bump(-stepBy())">−</button>

      <span class="counter__value">{{ value() }}{{ unit() ? ' ' + unit() : '' }}</span>

      <button matButton="outlined" type="button"
              [disabled]="disabled()"
              (click)="bump(stepBy())">+</button>
    </div>
  `,
  styles: [`
    .counter {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      border: 1px solid var(--color-border);
      padding: var(--space-xs) var(--space-sm);
      background: var(--color-bg-surface);
    }
    .counter--disabled { opacity: 0.5; }
    .counter__value {
      min-width: 4rem;
      text-align: center;
      font-variant-numeric: tabular-nums;
      color: var(--color-text);
      font-weight: var(--weight-medium);
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CounterField),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterField implements ControlValueAccessor {
  /** Optional unit label rendered after the value (e.g. "shares"). */
  readonly unit = input('');
  /** Increment/decrement size. */
  readonly stepBy = input(1);

  protected readonly value = signal(0);
  protected readonly disabled = signal(false);

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  // ── ControlValueAccessor ────────────────────────────────────────
  writeValue(value: number | null): void {
    this.value.set(value ?? 0);
  }
  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected bump(delta: number): void {
    if (this.disabled()) return;
    this.value.update(v => v + delta);
    this.onChange(this.value());
    this.onTouched();
  }
}
