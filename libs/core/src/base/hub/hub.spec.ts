import { TestBed } from '@angular/core/testing';
import { Component, DestroyRef, Directive, inject, Injectable, Injector, Signal } from '@angular/core';

import { Hub } from './hub';
import { MessageHub } from '../../services/message-hub/message-hub';
import { StateHub } from '../../services/state-hub/state-hub';

// ── Concrete test subclass (Directive-decorated, like ComponentBase) ─────────
@Directive()
class TestHub extends Hub {
  // Expose protected methods for testing
  doPublish<T>(messageId: string, data: T): void {
    this.publish(messageId, data);
  }

  doSubscribe<T>(messageId: string, callback: (msg: T) => void): void {
    this.subscribe(messageId, callback);
  }

  doSetState<T>(key: string, value: T): void {
    this.setState(key, value);
  }

  doGetState<T>(key: string): Signal<T | undefined> {
    return this.getState<T>(key);
  }

  doSelect<T, R>(key: string, selector: (state: T) => R): Signal<R | undefined> {
    return this.select<T, R>(key, selector);
  }

  doPatchState<T extends object>(key: string, partial: Partial<T>): void {
    this.patchState<T>(key, partial);
  }

  doUpdateState<T>(key: string, updater: (current: T) => T): void {
    this.updateState<T>(key, updater);
  }

  doRemoveState(key: string): void {
    this.removeState(key);
  }

  // Expose internals for lazy-resolution verification
  get exposedInjector(): Injector {
    return this.injector;
  }
}

// ── Minimal component host so TestHub can be created in an injection context ─
@Component({
  selector: 'test-hub-host',
  template: '',
  providers: [TestHub],
})
class TestHubHostComponent {
  hub = inject(TestHub);
}

// =============================================================================
// Tests
// =============================================================================

describe('Hub', () => {
  let hub: TestHub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHubHostComponent],
    });

    const fixture = TestBed.createComponent(TestHubHostComponent);
    fixture.detectChanges();
    hub = fixture.componentInstance.hub;
  });

  // ---------------------------------------------------------------------------
  // Lazy resolution
  // ---------------------------------------------------------------------------
  describe('lazy resolution', () => {
    it('should not instantiate StateHub until a state method is called', () => {
      const injector = hub.exposedInjector;
      const getSpy = vi.spyOn(injector, 'get');

      // No state method called yet — StateHub should not have been resolved
      expect(getSpy).not.toHaveBeenCalledWith(StateHub);

      // Now call a state method
      hub.doSetState('key', 'value');

      expect(getSpy).toHaveBeenCalledWith(StateHub);

      getSpy.mockRestore();
    });

    it('should not instantiate MessageHub until an event method is called', () => {
      const injector = hub.exposedInjector;
      const getSpy = vi.spyOn(injector, 'get');

      // No event method called yet — MessageHub should not have been resolved
      expect(getSpy).not.toHaveBeenCalledWith(MessageHub);

      // Now call an event method
      hub.doPublish('topic', 'data');

      expect(getSpy).toHaveBeenCalledWith(MessageHub);

      getSpy.mockRestore();
    });

    it('should only resolve StateHub once across multiple state calls', () => {
      const injector = hub.exposedInjector;
      const getSpy = vi.spyOn(injector, 'get');

      hub.doSetState('a', 1);
      hub.doSetState('b', 2);
      hub.doGetState('a');

      const stateHubCalls = getSpy.mock.calls.filter(call => call[0] === StateHub);
      expect(stateHubCalls.length).toBe(1);

      getSpy.mockRestore();
    });

    it('should only resolve MessageHub once across multiple event calls', () => {
      const injector = hub.exposedInjector;
      const getSpy = vi.spyOn(injector, 'get');

      hub.doPublish('topic-1', 'a');
      hub.doPublish('topic-2', 'b');

      const messageHubCalls = getSpy.mock.calls.filter(call => call[0] === MessageHub);
      expect(messageHubCalls.length).toBe(1);

      getSpy.mockRestore();
    });

    it('should not instantiate MessageHub when only state methods are used', () => {
      const injector = hub.exposedInjector;
      const getSpy = vi.spyOn(injector, 'get');

      hub.doSetState('key', 'value');
      hub.doGetState('key');
      hub.doPatchState<{ key: string }>('key', {});
      hub.doRemoveState('key');

      const messageHubCalls = getSpy.mock.calls.filter(call => call[0] === MessageHub);
      expect(messageHubCalls.length).toBe(0);

      getSpy.mockRestore();
    });

    it('should not instantiate StateHub when only event methods are used', () => {
      const injector = hub.exposedInjector;
      const getSpy = vi.spyOn(injector, 'get');

      hub.doPublish('topic', 'data');

      const stateHubCalls = getSpy.mock.calls.filter(call => call[0] === StateHub);
      expect(stateHubCalls.length).toBe(0);

      getSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Event delegation (publish / subscribe)
  // ---------------------------------------------------------------------------
  describe('event delegation', () => {
    it('should delegate publish() to MessageHub.publish()', () => {
      const messageHub = TestBed.inject(MessageHub);
      const publishSpy = vi.spyOn(messageHub, 'publish');

      hub.doPublish('test-topic', { data: 42 });

      expect(publishSpy).toHaveBeenCalledWith('test-topic', { data: 42 });

      publishSpy.mockRestore();
    });

    it('should delegate subscribe() to MessageHub.subscribe() with destroyRef', () => {
      const messageHub = TestBed.inject(MessageHub);
      const subscribeSpy = vi.spyOn(messageHub, 'subscribe');
      const callback = () => {};

      hub.doSubscribe('test-topic', callback);

      expect(subscribeSpy).toHaveBeenCalledWith('test-topic', callback, expect.anything());
      // The third argument should be a DestroyRef
      const destroyRefArg = subscribeSpy.mock.calls[0][2];
      expect(destroyRefArg).toBeDefined();
      expect(typeof destroyRefArg.onDestroy).toBe('function');

      subscribeSpy.mockRestore();
    });

    it('should deliver messages end-to-end via publish/subscribe', () => {
      const received: string[] = [];

      hub.doSubscribe<string>('e2e-topic', (msg) => received.push(msg));
      hub.doPublish('e2e-topic', 'hello');
      TestBed.tick();

      expect(received).toEqual(['hello']);
    });
  });

  // ---------------------------------------------------------------------------
  // State delegation
  // ---------------------------------------------------------------------------
  describe('state delegation', () => {
    it('should delegate setState() to StateHub.setState()', () => {
      const stateHub = TestBed.inject(StateHub);
      const spy = vi.spyOn(stateHub, 'setState');

      hub.doSetState('user', { name: 'Alice' });

      expect(spy).toHaveBeenCalledWith('user', { name: 'Alice' });

      spy.mockRestore();
    });

    it('should delegate getState() to StateHub.getState()', () => {
      const stateHub = TestBed.inject(StateHub);
      const spy = vi.spyOn(stateHub, 'getState');

      hub.doGetState<string>('key');

      expect(spy).toHaveBeenCalledWith('key');

      spy.mockRestore();
    });

    it('should delegate select() to StateHub.select()', () => {
      const stateHub = TestBed.inject(StateHub);
      const spy = vi.spyOn(stateHub, 'select');
      const selector = (u: { name: string }) => u.name;

      hub.doSelect<{ name: string }, string>('user', selector);

      expect(spy).toHaveBeenCalledWith('user', selector);

      spy.mockRestore();
    });

    it('should delegate patchState() to StateHub.patchState()', () => {
      const stateHub = TestBed.inject(StateHub);
      const spy = vi.spyOn(stateHub, 'patchState');

      hub.doSetState('user', { name: 'Alice', age: 30 });
      hub.doPatchState<{ name: string; age: number }>('user', { age: 31 });

      expect(spy).toHaveBeenCalledWith('user', { age: 31 });

      spy.mockRestore();
    });

    it('should delegate updateState() to StateHub.updateState()', () => {
      const stateHub = TestBed.inject(StateHub);
      const spy = vi.spyOn(stateHub, 'updateState');
      const updater = (c: number) => c + 1;

      hub.doSetState('count', 0);
      hub.doUpdateState<number>('count', updater);

      expect(spy).toHaveBeenCalledWith('count', updater);

      spy.mockRestore();
    });

    it('should delegate removeState() to StateHub.removeState()', () => {
      const stateHub = TestBed.inject(StateHub);
      const spy = vi.spyOn(stateHub, 'removeState');

      hub.doRemoveState('key');

      expect(spy).toHaveBeenCalledWith('key');

      spy.mockRestore();
    });

    it('should store and retrieve state end-to-end', () => {
      hub.doSetState('counter', 42);
      const counter = hub.doGetState<number>('counter');
      expect(counter()).toBe(42);
    });

    it('should select a slice of state end-to-end', () => {
      hub.doSetState('user', { name: 'Alice', age: 30 });
      const name = hub.doSelect<{ name: string; age: number }, string>('user', u => u.name);
      expect(name()).toBe('Alice');
    });

    it('should patch state end-to-end', () => {
      hub.doSetState('user', { name: 'Alice', age: 30 });
      hub.doPatchState<{ name: string; age: number }>('user', { age: 31 });
      const user = hub.doGetState<{ name: string; age: number }>('user');
      expect(user()).toEqual({ name: 'Alice', age: 31 });
    });

    it('should update state end-to-end', () => {
      hub.doSetState('count', 10);
      hub.doUpdateState<number>('count', c => c * 2);
      const count = hub.doGetState<number>('count');
      expect(count()).toBe(20);
    });

    it('should remove state end-to-end', () => {
      hub.doSetState('temp', 'value');
      hub.doRemoveState('temp');
      const temp = hub.doGetState<string>('temp');
      expect(temp()).toBeUndefined();
    });
  });
});
