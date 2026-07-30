import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import type { DataGridFeatures } from '../data-grid.types';

/** Params passed to the action cell via `cellRendererParams`. */
export interface ActionCellParams<T> extends ICellRendererParams<T> {
  features: DataGridFeatures;
  /** Row is a freshly-inserted, not-yet-saved row. */
  isNew: (row: T) => boolean;
  /** Row is currently being edited (an editor is open on it). */
  isEditing: (row: T) => boolean;
  onHistory: (row: T) => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  /** Commit — save a new row (POST) or the current edit (PUT). */
  onSave: (row: T) => void;
  /** Discard — remove a new row or revert the current edit. */
  onCancel: (row: T) => void;
}

/**
 * Body renderer for the pinned-left action column.
 *
 * - Idle existing row → history / edit / delete icons.
 * - New row OR a row in edit mode → save / cancel icons (history & delete hidden).
 */
@Component({
  selector: 'app-data-grid-action-cell',
  imports: [MatButtonModule],
  template: `
    <div class="cell">
      @if (isNew() || isEditing()) {
        @if (isNew() ? features().add : features().edit) {
          <button matIconButton type="button" class="icon icon--ok" title="Save" (click)="save()">
            <i class="fa-solid fa-check"></i>
          </button>
        }
        <button matIconButton type="button" class="icon icon--danger" title="Cancel" (click)="cancel()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      } @else {
        @if (features().history) {
          <button matIconButton type="button" class="icon" title="History" (click)="history()">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </button>
        }
        @if (features().edit) {
          <button matIconButton type="button" class="icon" title="Edit" (click)="edit()">
            <i class="fa-solid fa-pen"></i>
          </button>
        }
        @if (features().delete) {
          <button matIconButton type="button" class="icon icon--danger" title="Delete" (click)="remove()">
            <i class="fa-solid fa-trash"></i>
          </button>
        }
      }
    </div>
  `,
  styles: [`
    /* Compact icon buttons for a dense grid row, and drop Material's 48px
       invisible touch target so adjacent buttons don't overlap / steal clicks. */
    :host { --mat-icon-button-state-layer-size: 28px; }
    .cell { display: inline-flex; align-items: center; gap: 2px; height: 100%; }
    .icon { font-size: 13px; color: var(--color-text-secondary); }
    .icon:hover { color: var(--color-primary); }
    .icon--ok:hover { color: var(--color-success); }
    .icon--danger:hover { color: var(--color-danger); }
    :host ::ng-deep .mat-mdc-button-touch-target { display: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionCell<T> implements ICellRendererAngularComp {
  protected readonly features = signal<DataGridFeatures>({});
  protected readonly isNew = signal(false);
  protected readonly isEditing = signal(false);

  private params!: ActionCellParams<T>;

  agInit(params: ActionCellParams<T>): void {
    this.update(params);
  }

  refresh(params: ActionCellParams<T>): boolean {
    this.update(params);
    return true;
  }

  private update(params: ActionCellParams<T>): void {
    this.params = params;
    this.features.set(params.features ?? {});
    this.isNew.set(!!params.data && params.isNew(params.data));
    this.isEditing.set(!!params.data && params.isEditing(params.data));
  }

  private get row(): T {
    return this.params.data as T;
  }

  protected history(): void { this.params.onHistory(this.row); }
  protected edit(): void { this.params.onEdit(this.row); }
  protected remove(): void { this.params.onDelete(this.row); }
  protected save(): void { this.params.onSave(this.row); }
  protected cancel(): void { this.params.onCancel(this.row); }
}
