
import { computed, Injectable, signal, Signal, WritableSignal } from '@angular/core';


/**
 * A lightweight, state management for Angular.
 *
 * **State** — persistent, reactive key-value store. Values are held as signals
 * and can be read, selected, patched, or removed by any component or service.
 *
 * @example
 * ```ts
 *
 * // State (persistent)
 * this.stateHub.setState('currentUser', user);
 * const userName = this.stateHub.select<User, string>('currentUser', u => u.name);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class StateHub {

  // ── State ────────────────────────────────────────────────────────────
  private readonly states = new Map<string, WritableSignal<unknown>>();
  /** Bumped on every structural change (add / remove key) so computed() signals re-evaluate. */
  private readonly stateVersion = signal(0);

  constructor() {}

  // ====================================================================
  // STATE API
  // ====================================================================

  /**
   * Set or replace the state value for the given key.
   * Creates the state slot if it doesn't exist.
   * All signals returned by `getState()` / `select()` for this key
   * will reactively update.
   */
  public setState<T>(key: string, value: T): void {
    if (!key) {
      console.warn('StateHub.setState called with empty key. Ignoring.');
      return;
    }

    const existing = this.states.get(key);
    if (existing) {
      existing.set(value);
    } else {
      this.states.set(key, signal(value));
      this.stateVersion.update(v => v + 1);
    }
  }

  /**
   * Shallow-merge a partial object into the current state for the given key.
   * No-op with a warning if the key doesn't exist.
   */
  public patchState<T extends object>(key: string, partial: Partial<T>): void {
    if (!key) {
      console.warn('StateHub.patchState called with empty key. Ignoring.');
      return;
    }

    const existing = this.states.get(key);
    if (!existing) {
      console.warn(`StateHub.patchState: No state found for key "${key}". Use setState() first.`);
      return;
    }
    existing.update(current => ({ ...(current as T), ...partial }));
  }

  /**
   * Update state using a function that receives the current value.
   * No-op with a warning if the key doesn't exist.
   */
  public updateState<T>(key: string, updater: (current: T) => T): void {
    if (!key) {
      console.warn('StateHub.updateState called with empty key. Ignoring.');
      return;
    }

    const existing = this.states.get(key);
    if (!existing) {
      console.warn(`StateHub.updateState: No state found for key "${key}". Use setState() first.`);
      return;
    }
    existing.update(current => updater(current as T));
  }

  /**
   * Get a read-only signal for the state at the given key.
   * Returns a signal that emits `undefined` if the key doesn't exist (yet).
   * The signal will reactively update when `setState` / `patchState` / `updateState`
   * is called for this key.
   */
  public getState<T>(key: string): Signal<T | undefined> {
    return computed(() => {
      this.stateVersion();          // track structural changes
      const sig = this.states.get(key);
      return sig ? sig() as T : undefined;
    });
  }

  /**
   * Create a derived signal that selects/transforms a slice of state.
   * Returns `undefined` when the key has no state or the state value is `undefined`.
   */
  public select<T, R>(key: string, selector: (state: T) => R): Signal<R | undefined> {
    return computed(() => {
      this.stateVersion();          // track structural changes
      const sig = this.states.get(key);
      if (!sig) return undefined;
      const value = sig() as T;
      return value !== undefined ? selector(value) : undefined;
    });
  }

  /**
   * Check whether state exists for the given key.
   */
  public hasState(key: string): boolean {
    return this.states.has(key);
  }

  /**
   * Remove state for the given key.
   * Signals returned by `getState()` / `select()` will emit `undefined` after removal.
   */
  public removeState(key: string): void {
    if (this.states.delete(key)) {
      this.stateVersion.update(v => v + 1);
    }
  }

  /**
   * Get a snapshot of the current state value (non-reactive).
   * Returns `undefined` if the key doesn't exist.
   */
  public snapshotState<T>(key: string): T | undefined {
    const sig = this.states.get(key);
    return sig ? sig() as T : undefined;
  }
}
