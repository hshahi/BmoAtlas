import { TestBed } from '@angular/core/testing';
import { computed, effect, EnvironmentInjector } from '@angular/core';

import { StateHub } from './state-hub';

describe('StateHub — State API', () => {
  let service: StateHub;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StateHub);
  });

  // ---------------------------------------------------------------------------
  // setState / getState
  // ---------------------------------------------------------------------------
  describe('setState and getState', () => {
    it('should store and retrieve a value', () => {
      service.setState('user', { name: 'Alice' });
      const user = service.getState<{ name: string }>('user');
      expect(user()).toEqual({ name: 'Alice' });
    });

    it('should return undefined for a non-existent key', () => {
      const value = service.getState<string>('missing');
      expect(value()).toBeUndefined();
    });

    it('should overwrite an existing value', () => {
      service.setState('count', 1);
      service.setState('count', 2);
      const count = service.getState<number>('count');
      expect(count()).toBe(2);
    });

    it('should store different types under different keys', () => {
      service.setState('name', 'Alice');
      service.setState('age', 30);
      service.setState('active', true);

      expect(service.getState<string>('name')()).toBe('Alice');
      expect(service.getState<number>('age')()).toBe(30);
      expect(service.getState<boolean>('active')()).toBe(true);
    });

    it('should store null as a valid value', () => {
      service.setState('nullable', null);
      expect(service.getState<null>('nullable')()).toBeNull();
    });

    it('should store complex objects', () => {
      const user = { id: 1, name: 'Alice', roles: ['admin', 'user'] };
      service.setState('user', user);
      expect(service.getState<typeof user>('user')()).toEqual(user);
    });

    it('should warn and ignore when key is empty', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.setState('', 'value');
      expect(warnSpy).toHaveBeenCalledWith('StateHub.setState called with empty key. Ignoring.');
      warnSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Reactivity
  // ---------------------------------------------------------------------------
  describe('reactivity', () => {
    it('should reactively update getState signal when setState is called', () => {
      service.setState('counter', 0);
      const counter = service.getState<number>('counter');
      expect(counter()).toBe(0);

      service.setState('counter', 5);
      expect(counter()).toBe(5);

      service.setState('counter', 10);
      expect(counter()).toBe(10);
    });

    it('should reactively update select signal when setState is called', () => {
      service.setState('user', { name: 'Alice', age: 30 });
      const name = service.select<{ name: string; age: number }, string>('user', u => u.name);
      expect(name()).toBe('Alice');

      service.setState('user', { name: 'Bob', age: 25 });
      expect(name()).toBe('Bob');
    });

    it('should reactively update getState signal when patchState is called', () => {
      service.setState('user', { name: 'Alice', age: 30 });
      const user = service.getState<{ name: string; age: number }>('user');

      service.patchState<{ name: string; age: number }>('user', { name: 'Bob' });
      expect(user()).toEqual({ name: 'Bob', age: 30 });
    });

    it('should reactively update getState signal when updateState is called', () => {
      service.setState('count', 1);
      const count = service.getState<number>('count');

      service.updateState<number>('count', c => c + 1);
      expect(count()).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // patchState
  // ---------------------------------------------------------------------------
  describe('patchState', () => {
    it('should shallow-merge partial into existing state', () => {
      service.setState('user', { name: 'Alice', age: 30, active: true });
      service.patchState<{ name: string; age: number; active: boolean }>('user', { age: 31 });

      const user = service.getState<{ name: string; age: number; active: boolean }>('user');
      expect(user()).toEqual({ name: 'Alice', age: 31, active: true });
    });

    it('should replace nested objects (shallow merge)', () => {
      service.setState('config', { theme: { primary: 'blue', secondary: 'red' }, lang: 'en' });
      service.patchState<{ theme: { primary: string }; lang: string }>('config', {
        theme: { primary: 'green' },
      });

      const config = service.snapshotState<{ theme: { primary: string; secondary?: string }; lang: string }>('config');
      expect(config!.theme.primary).toBe('green');
      expect(config!.theme.secondary).toBeUndefined(); // shallow merge replaced the whole object
      expect(config!.lang).toBe('en');
    });

    it('should warn when patching a non-existent key', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.patchState<{ name: string }>('missing', { name: 'test' });
      expect(warnSpy).toHaveBeenCalledWith('StateHub.patchState: No state found for key "missing". Use setState() first.');
      warnSpy.mockRestore();
    });

    it('should warn and ignore when key is empty', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.patchState<{ name: string }>('', { name: 'test' });
      expect(warnSpy).toHaveBeenCalledWith('StateHub.patchState called with empty key. Ignoring.');
      warnSpy.mockRestore();
    });

    it('should allow multiple patches in sequence', () => {
      service.setState('user', { name: 'Alice', age: 30, role: 'user' });

      service.patchState<{ name: string; age: number; role: string }>('user', { age: 31 });
      service.patchState<{ name: string; age: number; role: string }>('user', { role: 'admin' });
      service.patchState<{ name: string; age: number; role: string }>('user', { name: 'Bob' });

      expect(service.snapshotState('user')).toEqual({ name: 'Bob', age: 31, role: 'admin' });
    });
  });

  // ---------------------------------------------------------------------------
  // updateState
  // ---------------------------------------------------------------------------
  describe('updateState', () => {
    it('should update state using a function', () => {
      service.setState('count', 10);
      service.updateState<number>('count', c => c * 2);
      expect(service.snapshotState<number>('count')).toBe(20);
    });

    it('should receive the current value in the updater', () => {
      service.setState('items', ['a', 'b']);
      service.updateState<string[]>('items', items => [...items, 'c']);
      expect(service.snapshotState<string[]>('items')).toEqual(['a', 'b', 'c']);
    });

    it('should warn when updating a non-existent key', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.updateState<number>('missing', c => c + 1);
      expect(warnSpy).toHaveBeenCalledWith('StateHub.updateState: No state found for key "missing". Use setState() first.');
      warnSpy.mockRestore();
    });

    it('should warn and ignore when key is empty', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.updateState<number>('', c => c + 1);
      expect(warnSpy).toHaveBeenCalledWith('StateHub.updateState called with empty key. Ignoring.');
      warnSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // select
  // ---------------------------------------------------------------------------
  describe('select', () => {
    it('should select a slice of state', () => {
      service.setState('user', { name: 'Alice', age: 30 });
      const name = service.select<{ name: string; age: number }, string>('user', u => u.name);
      expect(name()).toBe('Alice');
    });

    it('should return undefined for a non-existent key', () => {
      const name = service.select<{ name: string }, string>('missing', u => u.name);
      expect(name()).toBeUndefined();
    });

    it('should support complex transformations', () => {
      service.setState('items', [1, 2, 3, 4, 5]);
      const sum = service.select<number[], number>('items', items => items.reduce((a, b) => a + b, 0));
      expect(sum()).toBe(15);
    });

    it('should reactively update when state changes', () => {
      service.setState('user', { name: 'Alice', age: 30 });
      const age = service.select<{ name: string; age: number }, number>('user', u => u.age);
      expect(age()).toBe(30);

      service.patchState<{ name: string; age: number }>('user', { age: 31 });
      expect(age()).toBe(31);
    });
  });

  // ---------------------------------------------------------------------------
  // hasState
  // ---------------------------------------------------------------------------
  describe('hasState', () => {
    it('should return false for a non-existent key', () => {
      expect(service.hasState('missing')).toBe(false);
    });

    it('should return true after setState', () => {
      service.setState('key', 'value');
      expect(service.hasState('key')).toBe(true);
    });

    it('should return false after removeState', () => {
      service.setState('key', 'value');
      service.removeState('key');
      expect(service.hasState('key')).toBe(false);
    });

    it('should return true even when value is null', () => {
      service.setState('nullable', null);
      expect(service.hasState('nullable')).toBe(true);
    });

    it('should return true even when value is undefined', () => {
      service.setState('undef', undefined);
      expect(service.hasState('undef')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // removeState
  // ---------------------------------------------------------------------------
  describe('removeState', () => {
    it('should remove existing state', () => {
      service.setState('key', 'value');
      expect(service.hasState('key')).toBe(true);

      service.removeState('key');
      expect(service.hasState('key')).toBe(false);
    });

    it('should cause getState to return undefined after removal', () => {
      service.setState('key', 'value');
      const state = service.getState<string>('key');
      expect(state()).toBe('value');

      service.removeState('key');
      expect(state()).toBeUndefined();
    });

    it('should cause select to return undefined after removal', () => {
      service.setState('user', { name: 'Alice' });
      const name = service.select<{ name: string }, string>('user', u => u.name);
      expect(name()).toBe('Alice');

      service.removeState('user');
      expect(name()).toBeUndefined();
    });

    it('should be a no-op for non-existent keys', () => {
      expect(() => service.removeState('missing')).not.toThrow();
    });

    it('should allow re-setting state after removal', () => {
      service.setState('key', 'first');
      service.removeState('key');
      service.setState('key', 'second');
      expect(service.snapshotState<string>('key')).toBe('second');
    });
  });

  // ---------------------------------------------------------------------------
  // snapshotState
  // ---------------------------------------------------------------------------
  describe('snapshotState', () => {
    it('should return the current value', () => {
      service.setState('key', 42);
      expect(service.snapshotState<number>('key')).toBe(42);
    });

    it('should return undefined for non-existent keys', () => {
      expect(service.snapshotState<string>('missing')).toBeUndefined();
    });

    it('should return the latest value after updates', () => {
      service.setState('count', 1);
      service.setState('count', 2);
      service.updateState<number>('count', c => c + 1);
      expect(service.snapshotState<number>('count')).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple keys
  // ---------------------------------------------------------------------------
  describe('multiple keys', () => {
    it('should manage multiple independent state keys', () => {
      service.setState('user', { name: 'Alice' });
      service.setState('theme', 'dark');
      service.setState('count', 0);

      expect(service.snapshotState('user')).toEqual({ name: 'Alice' });
      expect(service.snapshotState('theme')).toBe('dark');
      expect(service.snapshotState('count')).toBe(0);

      // Update one without affecting others
      service.setState('theme', 'light');
      expect(service.snapshotState('user')).toEqual({ name: 'Alice' });
      expect(service.snapshotState('theme')).toBe('light');
      expect(service.snapshotState('count')).toBe(0);
    });

    it('should remove one key without affecting others', () => {
      service.setState('a', 1);
      service.setState('b', 2);
      service.setState('c', 3);

      service.removeState('b');

      expect(service.hasState('a')).toBe(true);
      expect(service.hasState('b')).toBe(false);
      expect(service.hasState('c')).toBe(true);
      expect(service.snapshotState('a')).toBe(1);
      expect(service.snapshotState('c')).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle setting state to undefined', () => {
      service.setState('key', 'value');
      service.setState('key', undefined);
      expect(service.snapshotState('key')).toBeUndefined();
      expect(service.hasState('key')).toBe(true); // key exists, value is undefined
    });

    it('should handle setting state to 0', () => {
      service.setState('zero', 0);
      expect(service.snapshotState<number>('zero')).toBe(0);
    });

    it('should handle setting state to empty string', () => {
      service.setState('empty', '');
      expect(service.snapshotState<string>('empty')).toBe('');
    });

    it('should handle setting state to false', () => {
      service.setState('flag', false);
      expect(service.snapshotState<boolean>('flag')).toBe(false);
    });

    it('should handle setting state to an empty array', () => {
      service.setState('list', []);
      expect(service.snapshotState<unknown[]>('list')).toEqual([]);
    });

    it('should handle setting state to an empty object', () => {
      service.setState('obj', {});
      expect(service.snapshotState<object>('obj')).toEqual({});
    });

    it('should handle rapid sequential updates', () => {
      service.setState('counter', 0);
      for (let i = 1; i <= 100; i++) {
        service.updateState<number>('counter', c => c + 1);
      }
      expect(service.snapshotState<number>('counter')).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // Downstream signal propagation — computed() / effect() watching select()/getState()
  // ---------------------------------------------------------------------------
  describe('downstream signal propagation', () => {
    it('should notify a computed() watching a getState() signal when state changes', () => {
      service.setState('counter', 1);
      const counter = service.getState<number>('counter');

      // A component-level computed that derives from the StateHub signal
      const doubled = computed(() => (counter() ?? 0) * 2);
      expect(doubled()).toBe(2);

      service.setState('counter', 5);
      expect(doubled()).toBe(10);

      service.setState('counter', 0);
      expect(doubled()).toBe(0);
    });

    it('should notify a computed() watching a select() signal when state changes', () => {
      service.setState('user', { name: 'Alice', age: 30 });
      const name = service.select<{ name: string; age: number }, string>('user', u => u.name);

      // Downstream computed that transforms the selected slice
      const greeting = computed(() => {
        const n = name();
        return n ? `Hello, ${n}!` : 'No user';
      });
      expect(greeting()).toBe('Hello, Alice!');

      service.setState('user', { name: 'Bob', age: 25 });
      expect(greeting()).toBe('Hello, Bob!');
    });

    it('should notify a chained computed() (computed watching computed watching select())', () => {
      service.setState('items', [10, 20, 30]);
      const total = service.select<number[], number>('items', items => items.reduce((a, b) => a + b, 0));

      // First derived signal
      const withTax = computed(() => (total() ?? 0) * 1.2);
      // Second derived signal watching the first
      const formatted = computed(() => `£${withTax().toFixed(2)}`);

      expect(formatted()).toBe('£72.00');

      service.setState('items', [100, 200]);
      expect(withTax()).toBeCloseTo(360);
      expect(formatted()).toBe('£360.00');
    });

    it('should notify an effect() watching a getState() signal when state changes', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      service.setState('ticker', 'AAPL');
      const ticker = service.getState<string>('ticker');

      const observed: Array<string | undefined> = [];

      // Simulate what a component would do: create an effect that reads the signal
      const effectRef = effect(() => {
        observed.push(ticker());
      }, { injector });

      TestBed.tick();
      expect(observed).toEqual(['AAPL']);

      service.setState('ticker', 'GOOG');
      TestBed.tick();
      expect(observed).toEqual(['AAPL', 'GOOG']);

      service.setState('ticker', 'MSFT');
      TestBed.tick();
      expect(observed).toEqual(['AAPL', 'GOOG', 'MSFT']);

      effectRef.destroy();
    });

    it('should notify an effect() watching a select() signal when state changes', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      service.setState('stock', { symbol: 'AAPL', price: 150 });
      const price = service.select<{ symbol: string; price: number }, number>('stock', s => s.price);

      const observed: Array<number | undefined> = [];

      const effectRef = effect(() => {
        observed.push(price());
      }, { injector });

      TestBed.tick();
      expect(observed).toEqual([150]);

      service.patchState<{ symbol: string; price: number }>('stock', { price: 155 });
      TestBed.tick();
      expect(observed).toEqual([150, 155]);

      service.updateState<{ symbol: string; price: number }>('stock', s => ({ ...s, price: 160 }));
      TestBed.tick();
      expect(observed).toEqual([150, 155, 160]);

      effectRef.destroy();
    });

    it('should notify an effect() when state is removed (signal becomes undefined)', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      service.setState('session', { token: 'abc123' });
      const session = service.getState<{ token: string }>('session');

      const observed: Array<{ token: string } | undefined> = [];

      const effectRef = effect(() => {
        observed.push(session());
      }, { injector });

      TestBed.tick();
      expect(observed).toEqual([{ token: 'abc123' }]);

      service.removeState('session');
      TestBed.tick();
      expect(observed).toEqual([{ token: 'abc123' }, undefined]);

      effectRef.destroy();
    });

    it('should notify an effect() when state is created after getState() was called', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      // Get signal BEFORE state exists
      const theme = service.getState<string>('theme');

      const observed: Array<string | undefined> = [];

      const effectRef = effect(() => {
        observed.push(theme());
      }, { injector });

      TestBed.tick();
      expect(observed).toEqual([undefined]);

      // Now create the state — the effect should fire
      service.setState('theme', 'dark');
      TestBed.tick();
      expect(observed).toEqual([undefined, 'dark']);

      service.setState('theme', 'light');
      TestBed.tick();
      expect(observed).toEqual([undefined, 'dark', 'light']);

      effectRef.destroy();
    });

    it('should notify a computed() watching select() when state is created after select() was called', () => {
      // select() before state exists
      const userName = service.select<{ name: string }, string>('profile', u => u.name);
      const display = computed(() => userName() ?? 'Anonymous');

      expect(display()).toBe('Anonymous');

      service.setState('profile', { name: 'Alice' });
      expect(display()).toBe('Alice');

      service.setState('profile', { name: 'Bob' });
      expect(display()).toBe('Bob');

      service.removeState('profile');
      expect(display()).toBe('Anonymous');
    });

    it('should propagate patchState changes through select() to a downstream computed()', () => {
      interface Config { pageSize: number; sortBy: string; ascending: boolean }
      service.setState<Config>('config', { pageSize: 10, sortBy: 'name', ascending: true });

      const sortLabel = service.select<Config, string>('config', c =>
        `${c.sortBy} ${c.ascending ? '↑' : '↓'}`
      );
      const header = computed(() => `Sorted by: ${sortLabel() ?? 'N/A'}`);

      expect(header()).toBe('Sorted by: name ↑');

      service.patchState<Config>('config', { ascending: false });
      expect(header()).toBe('Sorted by: name ↓');

      service.patchState<Config>('config', { sortBy: 'date' });
      expect(header()).toBe('Sorted by: date ↓');
    });

    it('should propagate updateState changes through select() to a downstream effect()', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      service.setState('cart', { items: ['apple'], total: 1 });

      const itemCount = service.select<{ items: string[]; total: number }, number>(
        'cart', c => c.items.length
      );

      const observed: Array<number | undefined> = [];
      const effectRef = effect(() => {
        observed.push(itemCount());
      }, { injector });

      TestBed.tick();
      expect(observed).toEqual([1]);

      service.updateState<{ items: string[]; total: number }>('cart', c => ({
        items: [...c.items, 'banana'],
        total: c.total + 1,
      }));
      TestBed.tick();
      expect(observed).toEqual([1, 2]);

      service.updateState<{ items: string[]; total: number }>('cart', c => ({
        items: [...c.items, 'cherry'],
        total: c.total + 1,
      }));
      TestBed.tick();
      expect(observed).toEqual([1, 2, 3]);

      effectRef.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // Component destruction — State API cleanup safety
  // ---------------------------------------------------------------------------
  describe('component destruction with State API', () => {
    it('should not throw when state is updated after a component-scoped effect is destroyed', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      service.setState('counter', 0);
      const counter = service.getState<number>('counter');

      const observed: Array<number | undefined> = [];
      const effectRef = effect(() => {
        observed.push(counter());
      }, { injector });

      TestBed.tick();
      expect(observed).toEqual([0]);

      // Simulate component destruction by destroying the effect
      effectRef.destroy();

      // Updating state after the effect is destroyed should NOT throw
      expect(() => {
        service.setState('counter', 99);
      }).not.toThrow();

      // The destroyed effect should NOT have received the update
      expect(observed).toEqual([0]);
    });

    it('should not throw when state is updated after a component-scoped effect watching select() is destroyed', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      service.setState('user', { name: 'Alice', age: 30 });
      const name = service.select<{ name: string; age: number }, string>('user', u => u.name);

      const observed: Array<string | undefined> = [];
      const effectRef = effect(() => {
        observed.push(name());
      }, { injector });

      TestBed.tick();
      expect(observed).toEqual(['Alice']);

      effectRef.destroy();

      // State updates after effect destruction should be safe
      expect(() => {
        service.setState('user', { name: 'Bob', age: 25 });
        service.patchState<{ name: string; age: number }>('user', { name: 'Charlie' });
        service.updateState<{ name: string; age: number }>('user', u => ({ ...u, name: 'Dave' }));
      }).not.toThrow();

      // Destroyed effect should not have received any updates
      expect(observed).toEqual(['Alice']);
    });

    it('should allow a new effect to watch the same state after the previous one was destroyed', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      service.setState('theme', 'dark');
      const theme = service.getState<string>('theme');

      // First effect (simulating first component)
      const observed1: Array<string | undefined> = [];
      const effectRef1 = effect(() => {
        observed1.push(theme());
      }, { injector });

      TestBed.tick();
      expect(observed1).toEqual(['dark']);

      service.setState('theme', 'light');
      TestBed.tick();
      expect(observed1).toEqual(['dark', 'light']);

      // Destroy first effect (simulating component destruction)
      effectRef1.destroy();

      // Second effect (simulating new component, e.g. after route navigation)
      const observed2: Array<string | undefined> = [];
      const effectRef2 = effect(() => {
        observed2.push(theme());
      }, { injector });

      TestBed.tick();
      expect(observed2).toEqual(['light']); // picks up current value

      service.setState('theme', 'system');
      TestBed.tick();
      expect(observed2).toEqual(['light', 'system']);

      // First effect should still only have its original values
      expect(observed1).toEqual(['dark', 'light']);

      effectRef2.destroy();
    });

    it('should not leak computed signals after the consuming context is gone', () => {
      service.setState('data', { items: [1, 2, 3] });

      // Simulate a component creating a select() and a derived computed()
      const selected = service.select<{ items: number[] }, number>(
        'data', d => d.items.length
      );
      const derived = computed(() => `Count: ${selected() ?? 0}`);

      expect(derived()).toBe('Count: 3');

      // After the component is destroyed, the computed signals become unreferenced.
      // Updating state should still work without errors even though
      // the computed signals may still be weakly referenced.
      service.setState('data', { items: [1, 2, 3, 4, 5] });

      // The computed is still technically alive (in this test scope),
      // but in a real component it would be GC'd. Verify it still works.
      expect(derived()).toBe('Count: 5');

      // Removing state should also be safe
      service.removeState('data');
      expect(derived()).toBe('Count: 0');
    });

    it('should handle state removal while an effect is still watching', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      service.setState('session', { token: 'abc' });
      const session = service.getState<{ token: string }>('session');

      const observed: Array<{ token: string } | undefined> = [];
      const effectRef = effect(() => {
        observed.push(session());
      }, { injector });

      TestBed.tick();
      expect(observed).toEqual([{ token: 'abc' }]);

      // Remove state while effect is still watching
      service.removeState('session');
      TestBed.tick();
      expect(observed).toEqual([{ token: 'abc' }, undefined]);

      // Re-create state — effect should pick it up
      service.setState('session', { token: 'xyz' });
      TestBed.tick();
      expect(observed).toEqual([{ token: 'abc' }, undefined, { token: 'xyz' }]);

      // Now destroy the effect
      effectRef.destroy();

      // Further state changes should not affect the destroyed effect
      service.setState('session', { token: '123' });
      TestBed.tick();
      expect(observed).toEqual([{ token: 'abc' }, undefined, { token: 'xyz' }]);
    });

    it('should not throw when removeState is called after all watchers are destroyed', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      service.setState('temp', 'value');
      const temp = service.getState<string>('temp');

      const effectRef = effect(() => { temp(); }, { injector });
      TestBed.tick();

      effectRef.destroy();

      expect(() => {
        service.removeState('temp');
      }).not.toThrow();

      expect(service.hasState('temp')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // stateVersion — structural change tracking
  // ---------------------------------------------------------------------------
  describe('stateVersion — structural change tracking', () => {
    it('should re-evaluate getState() signal when a different key is added', () => {
      // Get a signal for a key that does not exist yet
      const value = service.getState<string>('watched');
      expect(value()).toBeUndefined();

      // Add a DIFFERENT key — this bumps stateVersion
      service.setState('other-key', 'other-value');

      // The signal for 'watched' should still be undefined (no change to its key)
      expect(value()).toBeUndefined();

      // Now add the watched key
      service.setState('watched', 'found');
      expect(value()).toBe('found');
    });

    it('should re-evaluate getState() signal when a different key is removed', () => {
      service.setState('a', 'alpha');
      service.setState('b', 'beta');

      const aSignal = service.getState<string>('a');
      expect(aSignal()).toBe('alpha');

      // Remove a different key — bumps stateVersion
      service.removeState('b');

      // Signal for 'a' should still return its value
      expect(aSignal()).toBe('alpha');
    });

    it('should re-evaluate select() signal when a different key is added', () => {
      const selected = service.select<{ name: string }, string>('profile', u => u.name);
      expect(selected()).toBeUndefined();

      // Add a different key
      service.setState('unrelated', 42);

      // Still undefined for 'profile'
      expect(selected()).toBeUndefined();

      // Now add the profile key
      service.setState('profile', { name: 'Alice' });
      expect(selected()).toBe('Alice');
    });
  });

  // ---------------------------------------------------------------------------
  // hasState / snapshotState with empty key
  // ---------------------------------------------------------------------------
  describe('hasState and snapshotState with empty key', () => {
    it('should return false for hasState with empty string', () => {
      expect(service.hasState('')).toBe(false);
    });

    it('should return undefined for snapshotState with empty string', () => {
      expect(service.snapshotState('')).toBeUndefined();
    });

    it('should return false for hasState with null key', () => {
      expect(service.hasState(null as unknown as string)).toBe(false);
    });

    it('should return undefined for snapshotState with null key', () => {
      expect(service.snapshotState(null as unknown as string)).toBeUndefined();
    });
  });
});
