import { TestBed } from '@angular/core/testing';
import { DestroyRef, Injector, EnvironmentInjector } from '@angular/core';

import { MessageHub, ReceiveCallback } from './message-hub';

describe('StateHub', () => {
  let service: MessageHub;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageHub);
    injector = TestBed.inject(EnvironmentInjector);
  });

  // ---------------------------------------------------------------------------
  // Helper: create a standalone DestroyRef that can be manually triggered
  // ---------------------------------------------------------------------------
  function createManualDestroyRef(): { destroyRef: DestroyRef; destroy: () => void } {
    const callbacks: Array<() => void> = [];
    const destroyRef: DestroyRef = {
      onDestroy(cb: () => void) {
        callbacks.push(cb);
        // Return a cleanup function (Angular 19+ signature)
        return () => {
          const idx = callbacks.indexOf(cb);
          if (idx >= 0) callbacks.splice(idx, 1);
        };
      },
    } as DestroyRef;
    return {
      destroyRef,
      destroy: () => callbacks.forEach((cb) => cb()),
    };
  }

  // ---------------------------------------------------------------------------
  // Creation
  // ---------------------------------------------------------------------------
  it('should be created as a singleton', () => {
    expect(service).toBeTruthy();
    const second = TestBed.inject(MessageHub);
    expect(second).toBe(service);
  });

  // ---------------------------------------------------------------------------
  // Basic publish / subscribe
  // ---------------------------------------------------------------------------
  describe('publish and subscribe', () => {
    it('should deliver a published message to a subscriber', () => {
      const { destroyRef } = createManualDestroyRef();
      const received: string[] = [];

      service.subscribe<string>('topic-a', (msg) => received.push(msg), destroyRef);
      service.publish('topic-a', 'hello');

      // Effects are scheduled — flush them
      TestBed.tick();

      expect(received).toEqual(['hello']);
    });

    it('should deliver multiple messages in order', () => {
      const { destroyRef } = createManualDestroyRef();
      const received: number[] = [];

      service.subscribe<number>('nums', (msg) => received.push(msg), destroyRef);

      service.publish('nums', 1);
      TestBed.tick();

      service.publish('nums', 2);
      TestBed.tick();

      service.publish('nums', 3);
      TestBed.tick();

      expect(received).toEqual([1, 2, 3]);
    });

    it('should deliver the same value twice (different sequence numbers)', () => {
      const { destroyRef } = createManualDestroyRef();
      const received: number[] = [];

      service.subscribe<number>('dup', (msg) => received.push(msg), destroyRef);

      service.publish('dup', 42);
      TestBed.tick();

      service.publish('dup', 42);
      TestBed.tick();

      expect(received).toEqual([42, 42]);
    });

    it('should deliver messages to multiple subscribers on the same channel', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const received1: string[] = [];
      const received2: string[] = [];

      service.subscribe<string>('shared', (msg) => received1.push(msg), dr1);
      service.subscribe<string>('shared', (msg) => received2.push(msg), dr2);

      service.publish('shared', 'broadcast');
      TestBed.tick();

      expect(received1).toEqual(['broadcast']);
      expect(received2).toEqual(['broadcast']);
    });

    it('should not deliver messages across different channels', () => {
      const { destroyRef } = createManualDestroyRef();
      const received: string[] = [];

      service.subscribe<string>('channel-A', (msg) => received.push(msg), destroyRef);
      service.publish('channel-B', 'wrong-channel');
      TestBed.tick();

      expect(received).toEqual([]);
    });

    it('should handle complex object payloads', () => {
      const { destroyRef } = createManualDestroyRef();
      const received: Array<{ id: number; name: string }> = [];

      service.subscribe<{ id: number; name: string }>('objects', (msg) => received.push(msg), destroyRef);
      service.publish('objects', { id: 1, name: 'test' });
      TestBed.tick();

      expect(received).toEqual([{ id: 1, name: 'test' }]);
    });
  });

  // ---------------------------------------------------------------------------
  // Publish before subscribe (fire-and-forget)
  // ---------------------------------------------------------------------------
  describe('publish before subscribe', () => {
    it('should silently drop messages when no subscribers exist', () => {
      // Should not throw
      expect(() => service.publish('no-one-listening', 'data')).not.toThrow();
    });

    it('should not deliver previously published messages to new subscribers', () => {
      const { destroyRef } = createManualDestroyRef();
      const received: string[] = [];

      // Publish first — no subscribers yet, so this is a no-op
      service.publish('late-sub', 'early-message');
      TestBed.tick();

      // Now subscribe
      service.subscribe<string>('late-sub', (msg) => received.push(msg), destroyRef);
      TestBed.tick();

      expect(received).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Subscriber ordering — only future messages
  // ---------------------------------------------------------------------------
  describe('subscriber ordering', () => {
    it('should not deliver messages published before subscription to a late joiner', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const earlyReceived: string[] = [];
      const lateReceived: string[] = [];

      // First subscriber
      service.subscribe<string>('order', (msg) => earlyReceived.push(msg), dr1);

      // Publish a message — only the first subscriber should get it
      service.publish('order', 'before-late');
      TestBed.tick();

      // Second subscriber joins after the publish
      service.subscribe<string>('order', (msg) => lateReceived.push(msg), dr2);
      TestBed.tick();

      // Publish another message — both should get this one
      service.publish('order', 'after-late');
      TestBed.tick();

      expect(earlyReceived).toEqual(['before-late', 'after-late']);
      expect(lateReceived).toEqual(['after-late']);
    });
  });

  // ---------------------------------------------------------------------------
  // Cleanup / memory release
  // ---------------------------------------------------------------------------
  describe('cleanup and memory release', () => {
    it('should stop delivering messages after destroyRef fires', () => {
      const { destroyRef, destroy } = createManualDestroyRef();
      const received: string[] = [];

      service.subscribe<string>('cleanup', (msg) => received.push(msg), destroyRef);

      service.publish('cleanup', 'before-destroy');
      TestBed.tick();

      // Destroy the subscriber
      destroy();

      service.publish('cleanup', 'after-destroy');
      TestBed.tick();

      expect(received).toEqual(['before-destroy']);
    });

    it('should remove the channel entirely when the last subscriber is destroyed', () => {
      const { destroyRef, destroy } = createManualDestroyRef();
      const received: string[] = [];

      service.subscribe<string>('ephemeral', (msg) => received.push(msg), destroyRef);

      // Access private channels map to verify cleanup
      const channels = (service as any)['channels'] as Map<string, unknown>;
      expect(channels.has('ephemeral')).toBe(true);

      destroy();

      expect(channels.has('ephemeral')).toBe(false);
    });

    it('should keep the channel alive while at least one subscriber remains', () => {
      const { destroyRef: dr1, destroy: destroy1 } = createManualDestroyRef();
      const { destroyRef: dr2, destroy: destroy2 } = createManualDestroyRef();
      const received1: string[] = [];
      const received2: string[] = [];

      service.subscribe<string>('multi', (msg) => received1.push(msg), dr1);
      service.subscribe<string>('multi', (msg) => received2.push(msg), dr2);

      const channels = (service as any)['channels'] as Map<string, unknown>;

      // Destroy first subscriber
      destroy1();
      expect(channels.has('multi')).toBe(true);

      // Second subscriber should still receive messages
      service.publish('multi', 'still-alive');
      TestBed.tick();

      expect(received1).toEqual([]);
      expect(received2).toEqual(['still-alive']);

      // Destroy second subscriber — channel should be removed
      destroy2();
      expect(channels.has('multi')).toBe(false);
    });

    it('should deliver to 3 subscribers, then only 2 after one is destroyed', () => {
      const { destroyRef: dr1, destroy: destroy1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const { destroyRef: dr3 } = createManualDestroyRef();
      const received1: string[] = [];
      const received2: string[] = [];
      const received3: string[] = [];

      // Subscribe all 3
      service.subscribe<string>('three-subs', (msg) => received1.push(msg), dr1);
      service.subscribe<string>('three-subs', (msg) => received2.push(msg), dr2);
      service.subscribe<string>('three-subs', (msg) => received3.push(msg), dr3);

      // Publish — all 3 should receive
      service.publish('three-subs', 'msg-1');
      TestBed.tick();

      expect(received1).toEqual(['msg-1']);
      expect(received2).toEqual(['msg-1']);
      expect(received3).toEqual(['msg-1']);

      // Destroy subscriber 1
      destroy1();

      // Publish again — only subscribers 2 and 3 should receive
      service.publish('three-subs', 'msg-2');
      TestBed.tick();

      expect(received1).toEqual(['msg-1']);       // no new message
      expect(received2).toEqual(['msg-1', 'msg-2']);
      expect(received3).toEqual(['msg-1', 'msg-2']);
    });

    it('should destroy the effect when the last subscriber is removed', () => {
      const { destroyRef, destroy } = createManualDestroyRef();

      service.subscribe<string>('effect-test', () => {}, destroyRef);

      const channels = (service as any)['channels'] as Map<string, any>;
      const channel = channels.get('effect-test');
      const effectRef = channel.effectRef;

      // Spy on destroy
      const destroySpy = vi.spyOn(effectRef, 'destroy');

      destroy();

      expect(destroySpy).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------------
  // Duplicate callback prevention
  // ---------------------------------------------------------------------------
  describe('duplicate callback prevention', () => {
    it('should throw when the same callback is registered twice on the same channel', () => {
      const { destroyRef } = createManualDestroyRef();
      const callback: ReceiveCallback<string> = () => {};

      service.subscribe('dup-check', callback, destroyRef);

      expect(() => service.subscribe('dup-check', callback, destroyRef)).toThrowError(
        /Duplicate callback registration for "dup-check"/,
      );
    });

    it('should allow the same callback on different channels', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const callback: ReceiveCallback<string> = () => {};

      service.subscribe('channel-1', callback, dr1);

      // Same callback reference, different channel — should NOT throw
      expect(() => service.subscribe('channel-2', callback, dr2)).not.toThrow();
    });

    it('should allow re-subscribing the same callback after it was destroyed', () => {
      const { destroyRef: dr1, destroy: destroy1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const callback: ReceiveCallback<string> = () => {};

      service.subscribe('re-sub', callback, dr1);
      destroy1();

      // After destroy, the callback should be removed — re-subscribing should work
      expect(() => service.subscribe('re-sub', callback, dr2)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Empty messageId guard
  // ---------------------------------------------------------------------------
  describe('empty messageId guard', () => {
    it('should warn and return when publishing with empty messageId', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.publish('', 'data');

      expect(warnSpy).toHaveBeenCalledWith('StateHub.publish called with empty messageId. Ignoring.');
      warnSpy.mockRestore();
    });

    it('should warn and return when subscribing with empty messageId', () => {
      const { destroyRef } = createManualDestroyRef();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.subscribe('', () => {}, destroyRef);

      expect(warnSpy).toHaveBeenCalledWith('StateHub.subscribe called with empty messageId. Ignoring.');
      warnSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Error isolation
  // ---------------------------------------------------------------------------
  describe('error isolation', () => {
    it('should catch errors in callbacks and continue delivering to other subscribers', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const received: string[] = [];
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // First subscriber throws
      service.subscribe<string>(
        'error-channel',
        () => {
          throw new Error('boom');
        },
        dr1,
      );

      // Second subscriber should still receive the message
      service.subscribe<string>('error-channel', (msg) => received.push(msg), dr2);

      service.publish('error-channel', 'test');
      TestBed.tick();

      // The error should have been logged
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in callback for "error-channel"'),
        expect.any(Error),
      );

      // The second subscriber should still have received the message
      expect(received).toEqual(['test']);

      errorSpy.mockRestore();
    });

    it('should log the error with the correct messageId', () => {
      const { destroyRef } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.subscribe<string>(
        'specific-channel',
        () => {
          throw new Error('specific error');
        },
        destroyRef,
      );

      service.publish('specific-channel', 'trigger');
      TestBed.tick();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('specific-channel'),
        expect.objectContaining({ message: 'specific error' }),
      );

      errorSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Channel lifecycle
  // ---------------------------------------------------------------------------
  describe('channel lifecycle', () => {
    it('should create a channel lazily on first subscribe', () => {
      const channels = (service as any)['channels'] as Map<string, unknown>;
      expect(channels.size).toBe(0);

      const { destroyRef } = createManualDestroyRef();
      service.subscribe('lazy', () => {}, destroyRef);

      expect(channels.has('lazy')).toBe(true);
      expect(channels.size).toBe(1);
    });

    it('should not create a channel on publish alone', () => {
      const channels = (service as any)['channels'] as Map<string, unknown>;

      service.publish('no-channel', 'data');

      expect(channels.has('no-channel')).toBe(false);
    });

    it('should support multiple independent channels', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const receivedA: string[] = [];
      const receivedB: number[] = [];

      service.subscribe<string>('chan-a', (msg) => receivedA.push(msg), dr1);
      service.subscribe<number>('chan-b', (msg) => receivedB.push(msg), dr2);

      service.publish('chan-a', 'alpha');
      service.publish('chan-b', 99);
      TestBed.tick();

      expect(receivedA).toEqual(['alpha']);
      expect(receivedB).toEqual([99]);
    });

    it('should recreate a channel after it was fully destroyed and re-subscribed', () => {
      const { destroyRef: dr1, destroy: destroy1 } = createManualDestroyRef();
      const received1: string[] = [];

      service.subscribe<string>('recreate', (msg) => received1.push(msg), dr1);
      service.publish('recreate', 'first');
      TestBed.tick();

      // Destroy — channel is removed
      destroy1();

      const channels = (service as any)['channels'] as Map<string, unknown>;
      expect(channels.has('recreate')).toBe(false);

      // Re-subscribe with a new destroyRef
      const { destroyRef: dr2 } = createManualDestroyRef();
      const received2: string[] = [];
      service.subscribe<string>('recreate', (msg) => received2.push(msg), dr2);

      service.publish('recreate', 'second');
      TestBed.tick();

      expect(received1).toEqual(['first']);
      expect(received2).toEqual(['second']);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle null and undefined payloads', () => {
      const { destroyRef } = createManualDestroyRef();
      const received: Array<null | undefined> = [];

      service.subscribe<null | undefined>('nullable', (msg) => received.push(msg), destroyRef);

      service.publish('nullable', null);
      TestBed.tick();

      service.publish('nullable', undefined);
      TestBed.tick();

      expect(received).toEqual([null, undefined]);
    });

    it('should handle rapid sequential publishes', () => {
      const { destroyRef } = createManualDestroyRef();
      const received: number[] = [];

      service.subscribe<number>('rapid', (msg) => received.push(msg), destroyRef);

      for (let i = 0; i < 100; i++) {
        service.publish('rapid', i);
        TestBed.tick();
      }

      expect(received).toHaveLength(100);
      expect(received[0]).toBe(0);
      expect(received[99]).toBe(99);
    });

    it('should not throw when destroying a subscriber whose channel was already removed', () => {
      // Manually track onDestroy callbacks so we can fire them multiple times
      const callbacks1: Array<() => void> = [];
      const callbacks2: Array<() => void> = [];

      const destroyRef1: DestroyRef = {
        onDestroy(cb: () => void) {
          callbacks1.push(cb);
          return () => {};
        },
      } as DestroyRef;

      const destroyRef2: DestroyRef = {
        onDestroy(cb: () => void) {
          callbacks2.push(cb);
          return () => {};
        },
      } as DestroyRef;

      service.subscribe('double-destroy', () => {}, destroyRef1);
      service.subscribe('double-destroy', () => {}, destroyRef2);

      const channels = (service as any)['channels'] as Map<string, unknown>;
      expect(channels.has('double-destroy')).toBe(true);

      // Destroy first subscriber — channel still exists (one subscriber remains)
      callbacks1.forEach((cb) => cb());
      expect(channels.has('double-destroy')).toBe(true);

      // Destroy second subscriber — channel is now removed
      callbacks2.forEach((cb) => cb());
      expect(channels.has('double-destroy')).toBe(false);

      // Fire destroy callbacks AGAIN — channel is already gone
      // This exercises the `if (currentChannel)` guard in onDestroy
      expect(() => {
        callbacks1.forEach((cb) => cb());
        callbacks2.forEach((cb) => cb());
      }).not.toThrow();
    });

    it('should treat publish as a no-op after all subscribers are destroyed', () => {
      const { destroyRef, destroy } = createManualDestroyRef();
      const received: string[] = [];

      service.subscribe<string>('gone', (msg) => received.push(msg), destroyRef);

      service.publish('gone', 'before');
      TestBed.tick();

      // Destroy the only subscriber — channel is removed
      destroy();

      // Publish again — should be a silent no-op (no channel exists)
      expect(() => {
        service.publish('gone', 'after');
        TestBed.tick();
      }).not.toThrow();

      expect(received).toEqual(['before']);
    });

    it('should handle many subscribers on a single channel', () => {
      const destroyers: Array<() => void> = [];
      const results: Array<string[]> = [];

      // Create 50 subscribers
      for (let i = 0; i < 50; i++) {
        const { destroyRef, destroy } = createManualDestroyRef();
        const received: string[] = [];
        results.push(received);
        destroyers.push(destroy);
        service.subscribe<string>('mass', (msg) => received.push(msg), destroyRef);
      }

      service.publish('mass', 'hello-all');
      TestBed.tick();

      // All 50 should have received the message
      for (const received of results) {
        expect(received).toEqual(['hello-all']);
      }

      // Destroy half of them
      for (let i = 0; i < 25; i++) {
        destroyers[i]();
      }

      service.publish('mass', 'hello-remaining');
      TestBed.tick();

      // First 25 should only have the first message
      for (let i = 0; i < 25; i++) {
        expect(results[i]).toEqual(['hello-all']);
      }
      // Remaining 25 should have both messages
      for (let i = 25; i < 50; i++) {
        expect(results[i]).toEqual(['hello-all', 'hello-remaining']);
      }
    });

    it('should manage subscribers with different DestroyRefs independently', () => {
      const { destroyRef: dr1, destroy: destroy1 } = createManualDestroyRef();
      const { destroyRef: dr2, destroy: destroy2 } = createManualDestroyRef();
      const { destroyRef: dr3, destroy: destroy3 } = createManualDestroyRef();
      const received1: string[] = [];
      const received2: string[] = [];
      const received3: string[] = [];

      service.subscribe<string>('independent', (msg) => received1.push(msg), dr1);
      service.subscribe<string>('independent', (msg) => received2.push(msg), dr2);
      service.subscribe<string>('independent', (msg) => received3.push(msg), dr3);

      // All receive first message
      service.publish('independent', 'round-1');
      TestBed.tick();

      // Destroy middle subscriber
      destroy2();

      // Only 1 and 3 receive second message
      service.publish('independent', 'round-2');
      TestBed.tick();

      // Destroy first subscriber
      destroy1();

      // Only 3 receives third message
      service.publish('independent', 'round-3');
      TestBed.tick();

      expect(received1).toEqual(['round-1', 'round-2']);
      expect(received2).toEqual(['round-1']);
      expect(received3).toEqual(['round-1', 'round-2', 'round-3']);

      // Destroy last subscriber — channel should be fully removed
      destroy3();
      const channels = (service as any)['channels'] as Map<string, unknown>;
      expect(channels.has('independent')).toBe(false);
    });

    it('should handle interleaved operations across multiple channels', () => {
      const { destroyRef: drA1, destroy: destroyA1 } = createManualDestroyRef();
      const { destroyRef: drA2 } = createManualDestroyRef();
      const { destroyRef: drB1 } = createManualDestroyRef();
      const receivedA1: string[] = [];
      const receivedA2: string[] = [];
      const receivedB1: number[] = [];

      // Subscribe to channel A and B
      service.subscribe<string>('chan-x', (msg) => receivedA1.push(msg), drA1);
      service.subscribe<number>('chan-y', (msg) => receivedB1.push(msg), drB1);

      // Publish to both
      service.publish('chan-x', 'x1');
      service.publish('chan-y', 100);
      TestBed.tick();

      // Add second subscriber to channel A
      service.subscribe<string>('chan-x', (msg) => receivedA2.push(msg), drA2);

      // Destroy first subscriber of channel A
      destroyA1();

      // Publish to both again
      service.publish('chan-x', 'x2');
      service.publish('chan-y', 200);
      TestBed.tick();

      expect(receivedA1).toEqual(['x1']);          // destroyed, no x2
      expect(receivedA2).toEqual(['x2']);           // joined after x1, got x2
      expect(receivedB1).toEqual([100, 200]);       // unaffected by channel A changes
    });
  });

  // ---------------------------------------------------------------------------
  // Falsy messageId values beyond empty string
  // ---------------------------------------------------------------------------
  describe('falsy messageId values', () => {
    it('should warn and ignore when publishing with null messageId', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.publish(null as unknown as string, 'data');

      expect(warnSpy).toHaveBeenCalledWith('StateHub.publish called with empty messageId. Ignoring.');
      warnSpy.mockRestore();
    });

    it('should warn and ignore when publishing with undefined messageId', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.publish(undefined as unknown as string, 'data');

      expect(warnSpy).toHaveBeenCalledWith('StateHub.publish called with empty messageId. Ignoring.');
      warnSpy.mockRestore();
    });

    it('should warn and ignore when subscribing with null messageId', () => {
      const { destroyRef } = createManualDestroyRef();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.subscribe(null as unknown as string, () => {}, destroyRef);

      expect(warnSpy).toHaveBeenCalledWith('StateHub.subscribe called with empty messageId. Ignoring.');
      warnSpy.mockRestore();
    });

    it('should warn and ignore when subscribing with undefined messageId', () => {
      const { destroyRef } = createManualDestroyRef();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.subscribe(undefined as unknown as string, () => {}, destroyRef);

      expect(warnSpy).toHaveBeenCalledWith('StateHub.subscribe called with empty messageId. Ignoring.');
      warnSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Error persistence — failing callback is NOT auto-unsubscribed
  // ---------------------------------------------------------------------------
  describe('error persistence', () => {
    it('should continue calling a failing subscriber on subsequent publishes', () => {
      const { destroyRef } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let callCount = 0;

      service.subscribe<string>(
        'error-persist',
        () => {
          callCount++;
          throw new Error('always fails');
        },
        destroyRef,
      );

      service.publish('error-persist', 'msg-1');
      TestBed.tick();

      service.publish('error-persist', 'msg-2');
      TestBed.tick();

      service.publish('error-persist', 'msg-3');
      TestBed.tick();

      // The failing callback should have been called 3 times (not auto-removed)
      expect(callCount).toBe(3);
      expect(errorSpy).toHaveBeenCalledTimes(3);

      errorSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Channel reuse — getOrCreateChannel returns the same object
  // ---------------------------------------------------------------------------
  describe('channel reuse', () => {
    it('should return the same channel object for multiple subscriptions on the same messageId', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const channels = (service as any)['channels'] as Map<string, unknown>;

      service.subscribe('reuse', () => {}, dr1);
      const channelAfterFirst = channels.get('reuse');

      service.subscribe('reuse', () => {}, dr2);
      const channelAfterSecond = channels.get('reuse');

      // Should be the exact same channel object (not recreated)
      expect(channelAfterFirst).toBe(channelAfterSecond);
    });
  });

  // ---------------------------------------------------------------------------
  // Signal state distinction — no-message vs undefined-payload
  // ---------------------------------------------------------------------------
  describe('signal state distinction', () => {
    it('should distinguish between no-message-published and message-with-undefined-payload', () => {
      const { destroyRef } = createManualDestroyRef();
      const channels = (service as any)['channels'] as Map<string, any>;
      const received: unknown[] = [];

      service.subscribe<undefined>('undef-payload', (msg) => received.push(msg), destroyRef);

      // Before any publish, the signal should be undefined (no message)
      const channel = channels.get('undef-payload');
      expect(channel.signal()).toBeUndefined();

      // After publishing undefined, the signal should be a wrapped object (not undefined)
      service.publish('undef-payload', undefined);

      const signalValue = channel.signal();
      expect(signalValue).not.toBeUndefined();
      expect(signalValue).toHaveProperty('value', undefined);
      expect(signalValue).toHaveProperty('sequence');

      TestBed.tick();
      expect(received).toEqual([undefined]);
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-channel sequence integrity
  // ---------------------------------------------------------------------------
  describe('cross-channel sequence integrity', () => {
    it('should maintain correct ordering when subscribes and publishes are interleaved across channels', () => {
      const { destroyRef: drA } = createManualDestroyRef();
      const { destroyRef: drB } = createManualDestroyRef();
      const receivedA: string[] = [];
      const receivedB: string[] = [];

      // Subscribe to channel A (bumps sequence)
      service.subscribe<string>('seq-a', (msg) => receivedA.push(msg), drA);

      // Publish to channel A (bumps sequence) — subscriber A should get this
      service.publish('seq-a', 'a1');
      TestBed.tick();

      // Subscribe to channel B (bumps sequence)
      service.subscribe<string>('seq-b', (msg) => receivedB.push(msg), drB);

      // Publish to channel B — subscriber B should get this
      service.publish('seq-b', 'b1');
      TestBed.tick();

      // Publish to channel A again — subscriber A should get this
      service.publish('seq-a', 'a2');
      TestBed.tick();

      expect(receivedA).toEqual(['a1', 'a2']);
      expect(receivedB).toEqual(['b1']);
    });
  });

  // ---------------------------------------------------------------------------
  // Re-entrancy guards
  // ---------------------------------------------------------------------------
  describe('re-entrancy guards', () => {
    it('should error when publishing from within a subscriber callback', () => {
      const { destroyRef } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.subscribe<string>(
        'reentrant-pub',
        () => {
          service.publish('reentrant-pub', 'recursive');
        },
        destroyRef,
      );

      service.publish('reentrant-pub', 'trigger');
      TestBed.tick();

      // The re-entrant publish throws inside the callback, which is caught by
      // the try/catch in the delivery loop and logged via console.error
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in callback for "reentrant-pub"'),
        expect.objectContaining({
          message: expect.stringContaining('Cannot call publish() from within a subscriber callback'),
        }),
      );

      errorSpy.mockRestore();
    });

    it('should error when publishing to a different channel from within a callback', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.subscribe<string>('other-channel', () => {}, dr2);

      service.subscribe<string>(
        'source-channel',
        () => {
          service.publish('other-channel', 'cross-channel');
        },
        dr1,
      );

      service.publish('source-channel', 'trigger');
      TestBed.tick();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in callback for "source-channel"'),
        expect.objectContaining({
          message: expect.stringContaining('Cannot call publish() from within a subscriber callback'),
        }),
      );

      // Verify the error message includes the target channel name
      const errorCall = errorSpy.mock.calls[0];
      expect((errorCall[1] as Error).message).toContain('"other-channel"');

      errorSpy.mockRestore();
    });

    it('should error when subscribing from within a subscriber callback', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.subscribe<string>(
        'reentrant-sub',
        () => {
          service.subscribe<string>('reentrant-sub', () => {}, dr2);
        },
        dr1,
      );

      service.publish('reentrant-sub', 'trigger');
      TestBed.tick();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in callback for "reentrant-sub"'),
        expect.objectContaining({
          message: expect.stringContaining('Cannot call subscribe() from within a subscriber callback'),
        }),
      );

      errorSpy.mockRestore();
    });

    it('should error when destroying a subscriber from within a callback', () => {
      const { destroyRef: dr1, destroy: destroy1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.subscribe<string>(
        'reentrant-destroy',
        () => {
          destroy1(); // self-destroy during delivery
        },
        dr1,
      );

      service.subscribe<string>('reentrant-destroy', () => {}, dr2);

      service.publish('reentrant-destroy', 'trigger');
      TestBed.tick();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in callback for "reentrant-destroy"'),
        expect.objectContaining({
          message: expect.stringContaining('Cannot destroy a subscriber from within a callback'),
        }),
      );

      errorSpy.mockRestore();
    });

    it('should reset the delivering flag after delivery completes normally', () => {
      const { destroyRef } = createManualDestroyRef();
      const received: string[] = [];

      service.subscribe<string>('flag-reset', (msg) => received.push(msg), destroyRef);

      service.publish('flag-reset', 'first');
      TestBed.tick();

      // If the flag wasn't reset, this second publish would throw
      expect(() => {
        service.publish('flag-reset', 'second');
        TestBed.tick();
      }).not.toThrow();

      expect(received).toEqual(['first', 'second']);
    });

    it('should reset the delivering flag even when a callback throws', () => {
      const { destroyRef } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.subscribe<string>(
        'flag-reset-error',
        () => {
          throw new Error('boom');
        },
        destroyRef,
      );

      service.publish('flag-reset-error', 'trigger');
      TestBed.tick();

      // The delivering flag should have been reset by the finally block,
      // so a subsequent publish should work without throwing
      expect(() => {
        service.publish('flag-reset-error', 'after-error');
        TestBed.tick();
      }).not.toThrow();

      errorSpy.mockRestore();
    });

    it('should include the target messageId in the re-entrant publish error', () => {
      const { destroyRef } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.subscribe<string>(
        'named-channel',
        () => {
          service.publish('target-channel', 'data');
        },
        destroyRef,
      );

      service.publish('named-channel', 'trigger');
      TestBed.tick();

      const errorCall = errorSpy.mock.calls[0];
      expect((errorCall[1] as Error).message).toContain('"target-channel"');

      errorSpy.mockRestore();
    });

    it('should include the target messageId in the re-entrant subscribe error', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.subscribe<string>(
        'named-sub-channel',
        () => {
          service.subscribe<string>('target-sub-channel', () => {}, dr2);
        },
        dr1,
      );

      service.publish('named-sub-channel', 'trigger');
      TestBed.tick();

      const errorCall = errorSpy.mock.calls[0];
      expect((errorCall[1] as Error).message).toContain('"target-sub-channel"');

      errorSpy.mockRestore();
    });

    it('should not prevent subsequent publishes after a re-entrant error', () => {
      const { destroyRef: dr1 } = createManualDestroyRef();
      const { destroyRef: dr2 } = createManualDestroyRef();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const received: string[] = [];

      // First subscriber tries re-entrant publish (will error)
      service.subscribe<string>(
        'recover',
        (msg) => {
          if (msg === 'trigger') {
            service.publish('recover', 'bad');
          }
        },
        dr1,
      );

      // Second subscriber collects messages normally
      service.subscribe<string>('recover', (msg) => received.push(msg), dr2);

      // First publish triggers the re-entrant error
      service.publish('recover', 'trigger');
      TestBed.tick();

      // The delivering flag should be reset (finally block), so subsequent publishes work
      service.publish('recover', 'after-recovery');
      TestBed.tick();

      expect(received).toContain('after-recovery');

      errorSpy.mockRestore();
    });
  });
});