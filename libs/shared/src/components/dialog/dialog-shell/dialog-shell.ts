import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';

/**
 * Shared shell for all dialogs: a thin **draggable** header (grip), a scrollable
 * body (`ng-content`), and an actions footer (`ng-content[shDialogActions]`).
 * The 3px border + warning tone are applied to the dialog surface via a panel
 * class (see `DialogService` + `_material.css`).
 */
@Component({
  selector: 'sh-dialog-shell',
  imports: [CdkDrag, CdkDragHandle],
  template: `
    <div class="shell" cdkDrag cdkDragRootElement=".cdk-overlay-pane" cdkDragBoundary=".cdk-overlay-container">
      <div class="shell__header" [class.shell__header--warning]="variant() === 'warning'" cdkDragHandle>
        <span class="shell__title">{{ title() }}</span>
        <span class="shell__grip" aria-hidden="true">⠿</span>
      </div>
      <div class="shell__body"><ng-content /></div>
      <div class="shell__actions"><ng-content select="[shDialogActions]" /></div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .shell { display: flex; flex-direction: column; max-height: 85vh; }
    /* Thin, draggable header. */
    .shell__header {
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-md);
      padding: 4px var(--space-md);
      border-bottom: 1px solid var(--color-border);
      cursor: move; user-select: none;
    }
    .shell__header--warning {
      background: color-mix(in srgb, var(--color-warning) 36%, var(--color-bg-surface));
      border-bottom-color: var(--color-warning);
    }
    .shell__title { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text); }
    .shell__grip { color: var(--color-text-muted); letter-spacing: 2px; font-size: var(--text-xs); }
    /* Auto-expands to content; scrolls only when taller than the dialog. */
    .shell__body { padding: var(--space-md) var(--space-lg); overflow: auto; }
    .shell__actions {
      display: flex; justify-content: flex-end; gap: var(--space-md);
      padding: var(--space-sm) var(--space-md);
      border-top: 1px solid var(--color-border);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogShell {
  readonly title = input('');
  readonly variant = input<'default' | 'warning'>('default');
}
