# Reusable dialogs (`DialogService`)

A small, reusable dialog layer built on Angular Material `MatDialog`, exported from
`@shared`. One **singleton service** exposes three dialog types; each dialog is a
Material presenter component.

| File | Export | Purpose |
|---|---|---|
| `dialog.service.ts` | `DialogService` | the single entry point (confirm / warn / openForm) |
| `confirm-dialog/…` | `ConfirmDialog` | confirm/cancel presenter |
| `warning-dialog/…` | `WarningDialog` | warning + OK presenter |
| `form-dialog/…` | `FormDialog` | draggable host for a signal-form component |
| `dialog.types.ts` | types | data/config interfaces + `FormDialogContent` contract |

A live demo is at **`/dialogs`** (linked from Home), source in
`projects/shell/src/app/pages/dialog-showcase/`.

## Why

Encapsulate + reuse: one place for confirm/warn/form dialogs, consistent styling,
theme-adaptive, and a **Promise** API so callers just `await` a result. The service
is a `providedIn: 'root'` **singleton** but memory-light — it's stateless; `MatDialog`
builds each dialog (and, for the form, the caller's form component) **lazily on open**
and **destroys** it on close, so nothing is retained between opens.

## API

```ts
private readonly dialog = inject(DialogService);

// 1) Confirm → Promise<boolean>
if (await dialog.confirm({ message: 'Delete this row?', danger: true, confirmText: 'Delete' })) {
  // confirmed
}

// 2) Warn → Promise<void>
await dialog.warn({ message: 'Rate limit reached — try again shortly.' });

// 3) Form → Promise<T | undefined>  (value on Save, undefined on Cancel/dismiss)
const value = await dialog.openForm<CreateUser>({ component: CreateUserForm, title: 'New user' });
if (value) { /* save value */ }
```

### `confirm(data: ConfirmDialogData): Promise<boolean>`
`{ message, title?, confirmText?, cancelText?, danger? }` — `danger: true` styles the
confirm button as destructive. Resolves `true` only when confirmed.

### `warn(data: WarningDialogData): Promise<void>`
`{ message, title?, okText? }`.

### `openForm<T>(config: FormDialogConfig<T>): Promise<T | undefined>`
`{ component, title, inputs?, buttons?, width?, disableClose? }`.
- **`component`** — the form component to host (built lazily, destroyed on close).
- **`title`** — draggable header title.
- **`inputs`** — inputs set on the hosted component (via `setInput`).
- **`buttons`** — footer buttons; defaults to `[Cancel, Save]`.
- **`disableClose`** — default `true` (blocks backdrop/ESC dismiss so edits aren't lost).

## Using the returned values

Every method returns a **Promise**, so a container just `await`s it and reacts to
the result:

```ts
@Component({ /* … */ })
export class PositionsContainer {
  private readonly dialog = inject(DialogService);
  private readonly api = inject(PositionsService);

  // confirm → Promise<boolean>
  async deleteRow(row: Position): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Delete position',
      message: `Delete ${row.symbol}? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;                  // Cancel → false → do nothing
    await this.api.delete(row.id);    // Confirm → true → proceed
  }

  // warn → Promise<void>  (no value; await it to continue after the user clicks OK)
  async onRateLimited(): Promise<void> {
    await this.dialog.warn({ message: 'Rate limit reached — try again shortly.' });
    // …runs after OK is pressed
  }

  // openForm → Promise<T | undefined>  (the form value on Save, undefined otherwise)
  async addPosition(): Promise<void> {
    const value = await this.dialog.openForm<CreatePosition>({
      component: CreatePositionForm,
      title: 'New position',
    });
    if (!value) return;               // Cancel / dismiss → undefined
    await this.api.create(value);     // Save → value === form().value()
  }

  // openForm with a pre-filled form: `inputs` are set on the hosted component's @Input()s
  async editPosition(row: Position): Promise<void> {
    const value = await this.dialog.openForm<CreatePosition>({
      component: CreatePositionForm,
      title: 'Edit position',
      inputs: { initial: row },       // → @Input() initial on CreatePositionForm
    });
    if (value) await this.api.update(row.id, value);
  }
}
```

At a glance:

| Method | Resolves with | Guard the caller writes |
|---|---|---|
| `confirm()` | `true` on Confirm, else `false` | `if (!ok) return;` |
| `warn()` | `void` (after OK) | `await` if code must run afterwards |
| `openForm<T>()` | `form().value()` (**T**) on Save, `undefined` on Cancel/dismiss | `if (!value) return;` |

Notes:
- `confirm` and `warn` set `disableClose: true` — the backdrop and ESC **don't**
  dismiss them; the user must click a button. So `confirm` is `false` only via Cancel.
- `openForm` resolves `undefined` on Cancel/dismiss; a **custom** footer button
  (`role: 'custom'`) resolves with that button's `value` instead of the form value.
- The returned value is fully typed — `openForm<CreatePosition>(…)` resolves as
  `CreatePosition | undefined`.

## The form-dialog contract

The form dialog hosts **any** component that implements `FormDialogContent<T>` — it
exposes its Angular **signal form** so the dialog can gate Save and read the value:

```ts
export interface FormDialogContent<T> {
  /** The component's signal form; call it to read the root field state. */
  readonly form: SignalForm<T>;   // () => { value(): T; valid(): boolean; invalid(): boolean }
}
```

The dialog:
- disables **Save** while `form().invalid()`,
- resolves the promise with **`form().value()`** on Save,
- resolves **`undefined`** on Cancel / dismiss.

Example form component:

```ts
import { form, required, email } from '@angular/forms/signals';

interface CreateUser { name: string; email: string; }

@Component({
  selector: 'create-user-form',
  imports: [MatFormFieldModule, MatInputModule, FormField],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>Name</mat-label>
      <input matInput [formField]="tree.name" />
    </mat-form-field>
    <mat-form-field appearance="outline">
      <mat-label>Email</mat-label>
      <input matInput [formField]="tree.email" />
    </mat-form-field>
  `,
})
export class CreateUserForm implements FormDialogContent<CreateUser> {
  private readonly model = signal<CreateUser>({ name: '', email: '' });
  protected readonly tree = form(this.model, (p) => {
    required(p.name);
    required(p.email);
    email(p.email);
  });
  readonly form = this.tree;   // satisfies FormDialogContent
}
```

Pass initial values with `inputs` (set on `@Input()`s of the form component), or seed
the model inside the component.

## Features

- **Draggable** — the form dialog header is a CDK drag handle (`cdkDrag` +
  `cdkDragHandle`) constrained to the viewport; the whole dialog pane moves.
- **Auto-height** — the content expands to the form and only scrolls past `85vh`.
- **Configurable buttons** — `DialogButton[]` with `role: 'save' | 'cancel' | 'custom'`
  (a `custom` button resolves the dialog with its `value`); default is Cancel + Save.
- **Promise API** — `await` everywhere; the form resolves with a typed value or
  `undefined`.
- **Theme-adaptive** — dialogs follow the app themes via the `--mat-sys-*` bridge.

## Notes

- `MatDialog` provides the focus-trap, backdrop and a11y wiring.
- The data-grid's delete confirmation reuses this same `ConfirmDialog` (single
  confirm implementation across the app).
