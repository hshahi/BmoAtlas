import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  viewChild,
  AfterViewInit,
  ViewContainerRef,
} from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DialogShell } from '../dialog-shell/dialog-shell';
import { DialogButton, FormDialogConfig, FormDialogContent, DEFAULT_FORM_BUTTONS } from '../dialog.types';

/**
 * Host for the form dialog. Renders the caller's form component (built lazily via
 * `ViewContainerRef.createComponent`, destroyed with the dialog) inside the shared
 * draggable {@link DialogShell}, with configurable footer buttons.
 *
 * Liaison: the hosted component implements {@link FormDialogContent} (exposes its
 * signal `form`). Save is disabled while `form().invalid()` and resolves the dialog
 * with `form().value()`; Cancel resolves `undefined`.
 */
@Component({
  selector: 'sh-form-dialog',
  imports: [MatDialogModule, MatButtonModule, DialogShell],
  template: `
    <sh-dialog-shell [title]="data.title">
      <ng-container #slot />
      @for (b of buttons; track b.label) {
        <button matButton="outlined" shDialogActions
                [disabled]="b.role === 'save' && saveDisabled()"
                (click)="onButton(b)">{{ b.label }}</button>
      }
    </sh-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormDialog<T> implements AfterViewInit {
  private readonly ref = inject<MatDialogRef<FormDialog<T>, T | undefined>>(MatDialogRef);
  protected readonly data = inject<FormDialogConfig<T>>(MAT_DIALOG_DATA);

  private readonly slot = viewChild.required('slot', { read: ViewContainerRef });
  private readonly content = signal<FormDialogContent<T> | null>(null);

  protected readonly buttons: DialogButton[] = this.data.buttons ?? DEFAULT_FORM_BUTTONS;

  /** Save is disabled until the hosted form is present and valid. */
  protected readonly saveDisabled = computed(() => {
    const c = this.content();
    return !c || c.form().invalid();
  });

  ngAfterViewInit(): void {
    const ref = this.slot().createComponent(this.data.component);
    if (this.data.inputs) {
      for (const [key, value] of Object.entries(this.data.inputs)) {
        ref.setInput(key, value);
      }
    }
    this.content.set(ref.instance);
  }

  protected onButton(button: DialogButton): void {
    if (button.role === 'cancel') {
      this.ref.close(undefined);
      return;
    }
    if (button.role === 'save') {
      const c = this.content();
      if (!c || c.form().invalid()) return;
      this.ref.close(c.form().value());
      return;
    }
    this.ref.close(button.value as T);
  }
}
