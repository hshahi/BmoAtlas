# StateHub

A lightweight, signal-based persistent state hub for Angular. Provides a reactive key-value store where values are held as signals and can be read, selected, patched, or removed by any component or service.

## Installation

`StateHub` is provided in root — simply inject it:

```ts
private stateHub = inject(StateHub);
```

Or use the base classes which expose the state API as protected methods:

```ts
export class MyComponent extends ComponentBase { ... }
export class MyService extends ServiceBase { ... }
```

## State API

### `setState<T>(key: string, value: T): void`

Set or replace the state value for the given key. Creates the state slot if it doesn't exist. All signals returned by `getState()` / `select()` for this key will reactively update.

### `getState<T>(key: string): Signal<T | undefined>`

Get a read-only signal for the state at the given key. Returns a signal that emits `undefined` if the key doesn't exist (yet). The signal reactively updates when `setState` / `patchState` / `updateState` is called for this key.

### `select<T, R>(key: string, selector: (state: T) => R): Signal<R | undefined>`

Create a derived signal that selects/transforms a slice of state. Returns `undefined` when the key has no state.

### `patchState<T extends object>(key: string, partial: Partial<T>): void`

Shallow-merge a partial object into the current state for the given key. Logs a warning if the key doesn't exist — use `setState()` first.

### `updateState<T>(key: string, updater: (current: T) => T): void`

Update state using a function that receives the current value. Logs a warning if the key doesn't exist — use `setState()` first.

### `removeState(key: string): void`

Remove state for the given key. Signals returned by `getState()` / `select()` will emit `undefined` after removal.

### `hasState(key: string): boolean`

Check whether state exists for the given key.

### `snapshotState<T>(key: string): T | undefined`

Get a snapshot of the current state value (non-reactive). Returns `undefined` if the key doesn't exist.

### `stateVersion: Signal<number>`

A reactive signal that increments every time **any** state key is added, removed, or updated. Useful for triggering re-evaluation of signals that depend on the overall state structure rather than a specific key.

```ts
const version = stateHub.stateVersion;
// version() === 0 initially
stateHub.setState('a', 1);   // version() === 1
stateHub.setState('b', 2);   // version() === 2
stateHub.removeState('a');   // version() === 3
```

This is used internally to ensure that `getState()` and `select()` signals re-evaluate when keys are added or removed — not just when the value of the watched key changes.

## State Usage

### Setting and reading state

```ts
@Injectable({ providedIn: 'root' })
export class AuthService extends ServiceBase {

  login(user: User, token: string): void {
    this.setState('currentUser', user);
    this.setState('authToken', token);
    this.publish('auth.login', user);  // also broadcast an event via MessageHub
  }

  logout(): void {
    this.removeState('currentUser');
    this.removeState('authToken');
    this.publish('auth.logout', null);
  }
}
```

### Reading state reactively in a component

```ts
@Component({
  template: `
    @if (userName(); as name) {
      <span>Welcome, {{ name }}</span>
    } @else {
      <a routerLink="/login">Login</a>
    }
  `,
})
export class NavbarComponent extends ComponentBase {
  readonly userName = this.select<User, string>('currentUser', u => u.name);
}
```

### Patching state

```ts
// Update only the name field, keep everything else
this.patchState<User>('currentUser', { name: 'New Name' });
```

### Updating state with a function

```ts
// Increment a counter
this.updateState<AppState>('appState', state => ({
  ...state,
  notificationCount: state.notificationCount + 1,
}));
```

### Combining events and state

```ts
@Component({ ... })
export class DashboardComponent extends ComponentBase implements OnInit {
  // Persistent state — always available
  readonly user = this.getState<User>('currentUser');

  ngOnInit(): void {
    // Ephemeral event — react to login/logout (via MessageHub)
    this.subscribe<User>('auth.login', (user) => {
      console.log(`${user.name} just logged in`);
    });
  }
}
```

### Bridging HttpData into state

```ts
@Injectable()
export class ProductService extends ServiceBase {
  private injector = inject(Injector);

  readonly products = new HttpData<Product[]>(this.injector, {
    url: '/api/products',
    defaultValue: [],
  });

  constructor() {
    super();
    effect(() => {
      if (this.products.isSuccess()) {
        this.setState('products', this.products.value()!);
      }
    });
  }
}
```

## Key behaviours

| Behaviour | Detail |
|---|---|
| **Persistent** | State values persist until explicitly removed via `removeState()`. They survive component destruction. |
| **Reactive** | `getState()` and `select()` return `Signal`s that update automatically when state changes. |
| **Lazy creation** | State slots are created on first `setState()` call. `getState()` on a non-existent key returns a signal that emits `undefined`. |
| **Shallow merge** | `patchState()` performs a shallow merge — nested objects are replaced, not deep-merged. |
| **Independent namespaces** | Events and state use separate internal maps. An event key `'user.login'` and a state key `'user.login'` do not conflict. |
| **Empty key guard** | Calling `setState` or `patchState` with a falsy key logs a warning and returns immediately. |
| **No automatic cleanup** | Unlike event channels, state is not tied to `DestroyRef`. Call `removeState()` explicitly when state is no longer needed. |
