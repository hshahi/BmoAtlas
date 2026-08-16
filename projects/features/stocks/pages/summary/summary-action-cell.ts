import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import type { StockEntry } from '../../models/stock.models';

/** Params passed to the summary action cell via `cellRendererParams`. */
export interface SummaryActionCellParams extends ICellRendererParams<StockEntry> {
  /** Row is currently in an edit session (drives save/cancel vs edit/delete). */
  isEditing: (row: StockEntry) => boolean;
  onEdit: (row: StockEntry) => void;
  onDelete: (row: StockEntry) => void;
  onSave: (row: StockEntry) => void;
  onCancel: (row: StockEntry) => void;
}

/**
 * Bespoke action cell for the Monthly Stock Summary grid's pinned-left column.
 *
 * Mirrors the data-grid action-column *feature* (edit / delete idle, save / cancel
 * while editing) but is intentionally NOT the generic component — it's local to
 * this feature and hard-typed to {@link StockEntry}. The pinned footer row renders
 * nothing.
 */
@Component({
  selector: 'app-summary-action-cell',
  imports: [MatButtonModule],
  template: `
    @if (!pinned()) {
      <div class="cell">
        @if (editing()) {
          <button matIconButton type="button" class="icon icon--ok" title="Save" (click)="save()">
            <i class="fa-solid fa-check"></i>
          </button>
          <button matIconButton type="button" class="icon icon--danger" title="Cancel" (click)="cancel()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        } @else {
          <button matIconButton type="button" class="icon" title="Edit" (click)="edit()">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button matIconButton type="button" class="icon icon--danger" title="Delete" (click)="remove()">
            <i class="fa-solid fa-trash"></i>
          </button>
        }
      </div>
    }
  `,
  styles: [`
    /* Compact icon buttons for a dense grid row; drop Material's 48px invisible
       touch target so the two buttons don't overlap / steal each other's clicks. */
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
export class SummaryActionCell implements ICellRendererAngularComp {
  protected readonly editing = signal(false);
  protected readonly pinned = signal(false);

  private params!: SummaryActionCellParams;

  agInit(params: SummaryActionCellParams): void { this.update(params); }

  refresh(params: SummaryActionCellParams): boolean { this.update(params); return true; }

  private update(params: SummaryActionCellParams): void {
    this.params = params;
    const isPinned = !!params.node?.rowPinned;
    this.pinned.set(isPinned);
    this.editing.set(!isPinned && !!params.data && params.isEditing(params.data));
  }

  private get row(): StockEntry { return this.params.data as StockEntry; }

  protected edit(): void { this.params.onEdit(this.row); }
  protected remove(): void { this.params.onDelete(this.row); }
  protected save(): void { this.params.onSave(this.row); }
  protected cancel(): void { this.params.onCancel(this.row); }
}
