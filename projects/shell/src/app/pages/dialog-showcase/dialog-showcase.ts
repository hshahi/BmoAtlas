import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { form, required, email, min, FormField } from '@angular/forms/signals';
import { DialogService, FormDialogContent, DialogButton } from '@shared';

interface CreateUser {
  name: string;
  email: string;
  seats: number;
}

/**
 * Example signal-form component hosted by the form dialog. It implements
 * FormDialogContent — exposing its `form` so the dialog gates Save and returns the
 * value.
 */
@Component({
  selector: 'app-create-user-form',
  imports: [MatFormFieldModule, MatInputModule, FormField],
  template: `
    <div class="form">
      <mat-form-field appearance="outline">
        <mat-label>Name</mat-label>
        <input matInput [formField]="tree.name" placeholder="Jane Doe" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Email</mat-label>
        <input matInput [formField]="tree.email" placeholder="jane@bmo.com" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Seats</mat-label>
        <input matInput type="number" [formField]="tree.seats" />
      </mat-form-field>
    </div>
  `,
  styles: [`.form { display: flex; flex-direction: column; gap: var(--space-sm); min-width: 22rem; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateUserForm implements FormDialogContent<CreateUser> {
  private readonly model = signal<CreateUser>({ name: '', email: '', seats: 1 });
  protected readonly tree = form(this.model, (p: any) => {
    required(p.name);
    required(p.email);
    email(p.email);
    min(p.seats, 1);
  });
  readonly form = this.tree;
}

/** Showcase for the reusable DialogService (confirm / warning / signal-form). */
@Component({
  selector: 'app-dialog-showcase',
  imports: [MatButtonModule],
  template: `
    <div class="showcase">
      <header class="showcase__header">
        <h1 class="showcase__title">Dialog Service</h1>
        <p class="showcase__subtitle">
          One reusable <code>DialogService</code> (from <code>&#64;shared</code>) for confirm,
          warning and signal-form dialogs — Material, theme-adaptive, Promise-based.
        </p>
      </header>

      <section class="card demo">
        <div class="demo__head">
          <h2 class="demo__title">Confirm</h2>
          <p class="demo__notes"><code>await dialog.confirm({{ '{' }} message, danger? {{ '}' }})</code> → <code>boolean</code></p>
        </div>
        <div class="demo__row">
          <button matButton="outlined" (click)="confirm(false)">Confirm</button>
          <button matButton="outlined" (click)="confirm(true)">Confirm (danger)</button>
          <span class="chip">result: {{ confirmResult() }}</span>
        </div>
      </section>

      <section class="card demo">
        <div class="demo__head">
          <h2 class="demo__title">Warning</h2>
          <p class="demo__notes"><code>await dialog.warn({{ '{' }} message {{ '}' }})</code> → single OK</p>
        </div>
        <div class="demo__row">
          <button matButton="outlined" (click)="warn()">Show warning</button>
          <span class="chip">result: {{ warnResult() }}</span>
        </div>
      </section>

      <section class="card demo">
        <div class="demo__head">
          <h2 class="demo__title">Form dialog (signal forms)</h2>
          <p class="demo__notes">
            Draggable header · Save disabled until the form is valid · returns
            <code>form().value()</code>. Try custom footer buttons too.
          </p>
        </div>
        <div class="demo__row">
          <button matButton="outlined" (click)="openForm(false)">Open form</button>
          <button matButton="outlined" (click)="openForm(true)">Open form (custom buttons)</button>
          <span class="chip">result: {{ formResult() }}</span>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .showcase { display: flex; flex-direction: column; gap: var(--space-lg); padding: var(--space-lg); max-width: 900px; margin-inline: auto; }
    .showcase__title { margin: 0; font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text); }
    .showcase__subtitle { margin: var(--space-xs) 0 0; color: var(--color-text-secondary); font-size: var(--text-sm); max-width: 60ch; }
    .demo { display: flex; flex-direction: column; gap: var(--space-md); }
    .demo__title { margin: 0; font-size: var(--text-lg); color: var(--color-text); }
    .demo__notes { margin: var(--space-xs) 0 0; font-size: var(--text-xs); color: var(--color-text-secondary); }
    .demo__row { display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap; }
    .chip {
      font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text);
      background: var(--color-bg-muted); padding: 2px var(--space-sm);
    }
    code { font-family: var(--font-mono); font-size: 0.9em; background: var(--color-bg-muted); padding: 0 4px; color: var(--color-text); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogShowcase {
  private readonly dialog = inject(DialogService);

  protected readonly confirmResult = signal('—');
  protected readonly warnResult = signal('—');
  protected readonly formResult = signal('—');

  protected async confirm(danger: boolean): Promise<void> {
    const ok = await this.dialog.confirm({
      title: danger ? 'Delete item' : 'Please confirm',
      message: danger
        ? 'Are you sure you want to delete this item? This cannot be undone.'
        : 'Do you want to proceed with this action?',
      confirmText: danger ? 'Delete' : 'Proceed',
      danger,
    });
    this.confirmResult.set(ok ? 'confirmed' : 'cancelled');
  }

  protected async warn(): Promise<void> {
    await this.dialog.warn({ message: 'Your session will expire in 5 minutes.' });
    this.warnResult.set('acknowledged');
  }

  protected async openForm(custom: boolean): Promise<void> {
    const buttons: DialogButton[] | undefined = custom
      ? [{ label: 'Discard', role: 'cancel' }, { label: 'Create user', role: 'save' }]
      : undefined;
    const value = await this.dialog.openForm<CreateUser>({
      component: CreateUserForm,
      title: 'New user',
      buttons,
    });
    this.formResult.set(value ? JSON.stringify(value) : 'cancelled');
  }
}
