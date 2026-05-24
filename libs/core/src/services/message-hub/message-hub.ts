
import { computed, effect, Injectable, Injector, signal, Signal, WritableSignal, DestroyRef, EffectRef } from '@angular/core';

/** Callback type for message subscribers */
export type ReceiveCallback<T> = (message: T) => void;

/**
 * Internal representation of a message channel.
 * Each channel holds a signal (the reactive source), a map of registered callbacks
 * (keyed by callback reference with the sequence number at subscription time),
 * and the effect reference so it can be torn down when no subscribers remain.
 */
interface MessageChannel {
  signal: WritableSignal<{ value: unknown; sequence: number } | undefined>;
  callbacks: Map<ReceiveCallback<unknown>, number>;
  effectRef: EffectRef;
}

/**
 * A lightweight, signal-based publish/subscribe state hub with persistent state for Angular.
 *
 * Provides two complementary APIs on the same service:
 *
 * **Events** — ephemeral, fire-and-forget pub/sub identified by a string `messageId`.
 * Subscribers are automatically cleaned up when their `DestroyRef` fires.
 *
 * **State** — persistent, reactive key-value store. Values are held as signals
 * and can be read, selected, patched, or removed by any component or service.
 *
 * @example
 * ```ts
 * // Events (ephemeral)
 * this.messageHub.publish('greeting', { text: 'Hello!' });
 * this.messageHub.subscribe<{ text: string }>('greeting', (msg) => {
 *   console.log(msg.text);
 * }, this.destroyRef);
 *
 * // State (persistent)
 * this.messageHub.setState('currentUser', user);
 * const userName = this.messageHub.select<User, string>('currentUser', u => u.name);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class MessageHub {

  // ── Events ───────────────────────────────────────────────────────────
  private readonly channels = new Map<string, MessageChannel>();

  /**
   * Global monotonically-increasing counter used to order publish and subscribe
   * events so that a subscriber never receives messages published *before* it
   * subscribed.
   */
  private sequence = 0;

  /**
   * Re-entrancy guard. Set to `true` while the hub is delivering messages
   * inside an effect callback. Any attempt to publish, subscribe, or destroy
   * a subscriber while this flag is `true` will throw immediately.
   */
  private delivering = false;

  // ── State ────────────────────────────────────────────────────────────
  private readonly states = new Map<string, WritableSignal<unknown>>();
  /** Bumped on every structural change (add / remove key) so computed() signals re-evaluate. */
  private readonly stateVersion = signal(0);

  constructor(private readonly injector: Injector) {}

  // ====================================================================
  // EVENT API
  // ====================================================================

  /**
   * Publish a message to all current subscribers of the given channel.
   * If no subscribers exist yet for `messageId`, the call is a no-op.
   */
  public publish<T>(messageId: string, data: T): void {
    if (!messageId) {
      console.warn('StateHub.publish called with empty messageId. Ignoring.');
      return;
    }

    if (this.delivering) {
      throw new Error(`StateHub: Cannot call publish() from within a subscriber callback. Attempted to publish on "${messageId}".`);
    }

    const channel = this.channels.get(messageId);
    // No channel means nobody has subscribed yet — nothing to notify.
    if (!channel) {
      return;
    }
    // Bump the sequence and set the signal; the channel's effect will fire and
    // fan out to every registered callback whose subscribedAt < this sequence.
    channel.signal.set({ value: data, sequence: ++this.sequence });
  }

  /**
   * Subscribe to messages on the given channel. The callback will be invoked
   * every time a new message is published *after* this subscription is created.
   *
   * Cleanup is automatic: when the provided `destroyRef` fires, the callback
   * is removed and, if it was the last subscriber, the entire channel is torn down.
   */
  public subscribe<T>(messageId: string, callback: ReceiveCallback<T>, destroyRef: DestroyRef): void {
    if (!messageId) {
      console.warn('StateHub.subscribe called with empty messageId. Ignoring.');
      return;
    }

    if (this.delivering) {
      throw new Error(`StateHub: Cannot call subscribe() from within a subscriber callback. Attempted to subscribe on "${messageId}".`);
    }
    const channel = this.getOrCreateChannel(messageId);

    // Guard against the same callback reference being registered twice on the
    // same channel, which would cause confusing double-delivery.
    if (channel.callbacks.has(callback as ReceiveCallback<unknown>)) {
      throw new Error(`StateHub: Duplicate callback registration for "${messageId}". Each callback can only be subscribed once per channel.`);
    }

    // Record the current sequence so this subscriber only receives future messages.
    const subscribedAt = ++this.sequence;
    channel.callbacks.set(callback as ReceiveCallback<unknown>, subscribedAt);

    // Automatically unsubscribe when the caller's context is destroyed.
    destroyRef.onDestroy(() => {
      if (this.delivering) {
        throw new Error(`StateHub: Cannot destroy a subscriber from within a callback. Channel: "${messageId}".`);
      }

      const currentChannel = this.channels.get(messageId);
      if (currentChannel) {
        currentChannel.callbacks.delete(callback as ReceiveCallback<unknown>);
        // If no subscribers remain, destroy the reactive effect and free the channel.
        if (currentChannel.callbacks.size === 0) {
          currentChannel.effectRef.destroy();
          this.channels.delete(messageId);
        }
      }
    });
  }

  // ====================================================================
  // PRIVATE — Event channel management
  // ====================================================================

  /**
   * Lazily creates a channel (signal + effect) for the given `messageId`.
   * The effect watches the channel's signal and fans out each new value to
   * every registered callback that subscribed before the message was published.
   */
  private getOrCreateChannel(messageId: string): MessageChannel {
    if (!this.channels.has(messageId)) {
      // Create a signal that holds the latest published value + its sequence number.
      const sig = signal<{ value: unknown; sequence: number } | undefined>(undefined);
      const callbacks = new Map<ReceiveCallback<unknown>, number>();

      // The effect re-runs whenever `sig()` changes, delivering the message
      // to all callbacks that were registered before this publish sequence.
      const effectRef = effect(() => {
        const wrapped = sig();
        if (wrapped !== undefined) {
          this.delivering = true;
          try {
            callbacks.forEach((subscribedAt, cb) => {
              // Only deliver to subscribers that existed before this message was published.
              if (subscribedAt < wrapped.sequence) {
                try {
                  cb(wrapped.value);
                } catch (error) {
                  console.error(`StateHub: Error in callback for "${messageId}"`, error);
                }
              }
            });
          } finally {
            this.delivering = false;
          }
        }
      }, { injector: this.injector });

      this.channels.set(messageId, { signal: sig, callbacks, effectRef });
    }
    return this.channels.get(messageId)!;
  }
}
