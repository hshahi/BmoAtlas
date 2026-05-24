
import { DestroyRef, inject, Injector, Signal } from '@angular/core';
import { MessageHub, ReceiveCallback } from '../../services/message-hub/message-hub';
import { StateHub } from '../../services/state-hub/state-hub';

/**
 * Shared base class that provides lazy access to {@link MessageHub} and {@link StateHub}.
 *
 * Both services are resolved on first use via `Injector.get()`, so a subclass
 * that only uses events never instantiates `StateHub` and vice-versa.
 *
 * Decorated subclasses (`@Directive()` for components, `@Injectable()` for
 * services) establish the injection context that makes the eager
 * `inject(Injector)` / `inject(DestroyRef)` calls valid.
 */
export abstract class Hub {

    protected readonly injector = inject(Injector);
    protected destroyRef = inject(DestroyRef);

    // ── Lazy singletons ───────────────────────────────────────────────

    private _stateHub?: StateHub;
    private get stateHub(): StateHub {
        return (this._stateHub ??= this.injector.get(StateHub));
    }

    private _messageHub?: MessageHub;
    private get messageHub(): MessageHub {
        return (this._messageHub ??= this.injector.get(MessageHub));
    }

    // ── Events ────────────────────────────────────────────────────────

    protected publish<T>(messageId: string, data: T): void {
        this.messageHub.publish(messageId, data);
    }

    protected subscribe<T>(messageId: string, callback: ReceiveCallback<T>): void {
        this.messageHub.subscribe(messageId, callback, this.destroyRef);
    }

    // ── State ─────────────────────────────────────────────────────────

    protected setState<T>(key: string, value: T): void {
        this.stateHub.setState(key, value);
    }

    protected getState<T>(key: string): Signal<T | undefined> {
        return this.stateHub.getState<T>(key);
    }

    protected select<T, R>(key: string, selector: (state: T) => R): Signal<R | undefined> {
        return this.stateHub.select<T, R>(key, selector);
    }

    protected patchState<T extends object>(key: string, partial: Partial<T>): void {
        this.stateHub.patchState<T>(key, partial);
    }

    protected updateState<T>(key: string, updater: (current: T) => T): void {
        this.stateHub.updateState<T>(key, updater);
    }

    protected removeState(key: string): void {
        this.stateHub.removeState(key);
    }
}
