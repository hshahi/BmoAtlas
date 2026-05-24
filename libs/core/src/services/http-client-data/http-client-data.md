# HttpClientData

A lazy, signal-based wrapper around Angular's `HttpClient` that defers HTTP requests until explicitly requested. All state — value, status, error, headers — is exposed as reactive `Signal`s, making it ideal for use in templates and computed expressions.

## Why HttpClientData?

`HttpClientData` provides the same lazy, signal-driven API as [`HttpData`](../http-data/http-data.md) but uses Angular's traditional `HttpClient` + RxJS `Subscription` instead of `httpResource` / `HttpResourceRef`. This makes it suitable for scenarios where:

- You need **imperative control** over HTTP requests without the reactive resource model.
- You want to **cancel in-flight requests** via RxJS subscription management.
- You prefer the well-established `HttpClient` API over the newer `httpResource` experimental API.
- You need compatibility with **interceptors, retry logic, or other RxJS operators** that integrate naturally with `HttpClient`.

## Differences from HttpData

| Aspect | `HttpData` | `HttpClientData` |
|---|---|---|
| **Underlying mechanism** | `httpResource` / `HttpResourceRef` | `HttpClient` / RxJS `Subscription` |
| **Reactive URL/body** | Automatic re-fetch when signal-based URL/body changes | URL/body evaluated at call time; no automatic re-fetch |
| **Progress events** | Supported via `reportProgress` option and `progress` signal | Not supported |
| **Resource getter** | Exposes `resource: HttpResourceRef` | Not applicable |
| **Cancel mechanism** | Destroys the `HttpResourceRef` | Unsubscribes the RxJS `Subscription` |

## Construction

`HttpClientData` is **not** an injectable service. Create instances directly, passing an `Injector` and a `DataOptions` configuration:

```ts
import { Injector, inject } from '@angular/core';
import { HttpClientData } from '@core/services/http-client-data/http-client-data';

@Injectable()
export class ItemService {
  private injector = inject(Injector);

  readonly item = new HttpClientData<Item>(this.injector, {
    url: '/api/items/1',
  });
}
```

### Static factory methods

For mutation operations (`POST`, `PUT`, `PATCH`), static factory methods provide a cleaner API that encodes the HTTP method in the function name and **requires** a `body`:

```ts
// Instead of:
readonly result = new HttpClientData<Item, CreateDto>(this.injector, {
  url: '/api/items',
  method: 'POST',
  body: dto,
});

// Use:
readonly result = HttpClientData.post<Item, CreateDto>(this.injector, {
  url: '/api/items',
  body: dto,
});
```

| Factory | HTTP method | Body required? |
|---|---|---|
| `HttpClientData.post<T, TBody>(injector, options)` | `POST` | Yes |
| `HttpClientData.put<T, TBody>(injector, options)` | `PUT` | Yes |
| `HttpClientData.patch<T, TBody>(injector, options)` | `PATCH` | Yes |

The `options` parameter is a `MutationOptions<T, TBody>` — identical to `DataOptions` but with `method` removed and `body` made required.

> **Note:** `GET` does not need a factory — it is the default method. `DELETE` rarely has a body, so `new HttpClientData(injector, { url, method: 'DELETE' })` is clear enough.

## DataOptions

```ts
interface DataOptions<T, TBody = unknown> {
  url: string | (() => string);
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string | ReadonlyArray<string>>;
  params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
  body?: TBody | (() => TBody);
  defaultValue?: T;
  parse?: (response: unknown) => T;
  delay?: number;
}
```

| Option | Description |
|---|---|
| `url` | Request URL. Can be a static string or a function (evaluated at call time). |
| `method` | HTTP method. Defaults to `'GET'`. |
| `headers` | Request headers. Supports single values or arrays for multi-value headers. |
| `params` | Query parameters. Numbers and booleans are automatically converted to strings. Arrays produce multi-value params. |
| `body` | Request body. Can be a static value or a function (evaluated at call time). |
| `defaultValue` | Value returned by `value()` when in `idle` or `loading` state. |
| `parse` | Transform function applied to the raw HTTP response body before it becomes the value. Useful for validation (e.g. Zod) or shape mapping. |
| `delay` | Delay in milliseconds before the HTTP request is dispatched. The status transitions to `'loading'` immediately; the actual request fires after the delay. Useful for debouncing or showing a loading indicator before the request starts. |

## API

### Signals (read-only)

| Signal | Type | Before `load()` | Description |
|---|---|---|---|
| `value` | `Signal<T \| undefined>` | `defaultValue` or `undefined` | The current value. |
| `error` | `Signal<unknown>` | `undefined` | The last error, if any. |
| `status` | `Signal<HttpClientDataStatus>` | `'idle'` | Status: `'idle'` · `'loading'` · `'reloading'` · `'resolved'` · `'error'` · `'local'`. |
| `isIdle` | `Signal<boolean>` | `true` | `true` when status is `'idle'`. |
| `isLoading` | `Signal<boolean>` | `false` | `true` when status is `'loading'` (initial load). |
| `isReloading` | `Signal<boolean>` | `false` | `true` when status is `'reloading'` (subsequent load). |
| `isPending` | `Signal<boolean>` | `false` | `true` when `isLoading` or `isReloading`. |
| `isSuccess` | `Signal<boolean>` | `false` | `true` when status is `'resolved'`. |
| `isError` | `Signal<boolean>` | `false` | `true` when status is `'error'`. |
| `isLocal` | `Signal<boolean>` | `false` | `true` when status is `'local'` (value was set via `set()` or `update()`). |
| `hasValue` | `Signal<boolean>` | `true` if `defaultValue` set | `true` when the value is not `undefined`. |
| `isLoaded` | `Signal<boolean>` | `false` | `true` after `load()`, `set()`, or `update()` has been called. |
| `headers` | `Signal<HttpHeaders \| undefined>` | `undefined` | Response headers from the last successful request. |
| `statusCode` | `Signal<number \| undefined>` | `undefined` | HTTP status code from the last response (success or error). |

### Methods

#### `load(): void`

Fires the HTTP request. On first call, sets status to `'loading'`. On subsequent calls, sets status to `'reloading'`. Any in-flight request is automatically cancelled before the new one starts.

```ts
this.item.load();
```

#### `reload(): void`

Re-fetches data from the server. **No-op** if `load()` has never been called (unlike `load()`, which always fires).

```ts
this.item.reload(); // only works after load() has been called
```

#### `set(value: T): void`

Overwrites the value locally. Sets `isLoaded` to `true` and status to `'local'`.

```ts
this.item.set({ id: 1, name: 'Updated locally' });
```

#### `update(updateFn: (current: T | undefined) => T | undefined): void`

Updates the value using a function. Sets `isLoaded` to `true` and status to `'local'`.

```ts
this.item.update(current => current ? { ...current, name: 'Modified' } : current);
```

#### `loadFrom(source$: Observable<T>): void`

Loads data from an external Observable source instead of making an HTTP request. Cancels any in-flight HTTP request first. Sets status to `'loading'` (or `'reloading'` if a value already exists). Resolves or errors based on the Observable's emissions — same lifecycle as `load()`.

```ts
this.item.loadFrom(this.webSocket.messages$);
// Status → 'loading' → 'resolved' (on next) or 'error' (on error)
```

This is useful when you want to populate an `HttpClientData` from a non-HTTP source (WebSocket, local computation, another Observable) while keeping the same signal-based status API.

#### `cancel(): void`

Cancels an in-flight HTTP request and resets back to the initial (pre-load) state. **No-op** if not currently in `'loading'` or `'reloading'` status.

```ts
this.item.cancel();
// After cancel: isLoaded() === false, isIdle() === true, value() === defaultValue
// load() can be called again to start a fresh request
```

#### `destroy(): void`

Cancels any pending request and resets back to the initial (pre-load) state. **No-op** if `isLoaded` is `false`. Unlike `cancel()`, `destroy()` resets regardless of the current status.

```ts
this.item.destroy();
// After destroy: isLoaded() === false, isIdle() === true, value() === defaultValue
```

#### `map<U>(mapFn: (data: T) => U): Signal<U | undefined>`

Creates a derived signal that transforms the value. Returns `undefined` when the value is `undefined`.

```ts
const itemName = this.item.map(item => item.name);
// itemName() === 'Alpha' (when loaded) or undefined (when not)
```

#### `getOrDefault(defaultValue: T): Signal<T>`

Creates a derived signal that returns the value or the provided default.

```ts
const safeItem = this.item.getOrDefault({ id: 0, name: 'N/A' });
// safeItem() always returns a T, never undefined
```

## Usage examples

### Basic lazy loading

```ts
@Component({
  template: `
    @if (items.isLoading()) {
      <spinner />
    } @else if (items.isSuccess()) {
      @for (item of items.value(); track item.id) {
        <item-card [item]="item" />
      }
    } @else if (items.isError()) {
      <error-banner [error]="items.error()" />
    }
  `
})
export class ItemListComponent {
  private injector = inject(Injector);

  readonly items = new HttpClientData<Item[]>(this.injector, {
    url: '/api/items',
    defaultValue: [],
  });

  ngOnInit(): void {
    this.items.load();
  }
}
```

### POST with body (using factory method)

```ts
readonly createResult = HttpClientData.post<Item, CreateItemDto>(this.injector, {
  url: '/api/items',
  body: () => this.formData(),  // evaluated at load() time
});

submit(): void {
  this.createResult.load();
}
```

### Dynamic URL with signals

```ts
private selectedId = signal<number>(1);

readonly item = new HttpClientData<Item>(this.injector, {
  url: () => `/api/items/${this.selectedId()}`,
});

selectItem(id: number): void {
  this.selectedId.set(id);
  this.item.load(); // URL evaluated at call time
}
```

### Response transformation with parse

```ts
readonly item = new HttpClientData<Item>(this.injector, {
  url: '/api/items/1',
  parse: (raw: unknown) => {
    const r = raw as { item_id: number; item_name: string };
    return { id: r.item_id, name: r.item_name };
  },
});
```

### Query parameters

```ts
readonly items = new HttpClientData<Item[]>(this.injector, {
  url: '/api/items',
  params: { page: 1, limit: 20, active: true, tags: ['angular', 'signals'] },
  defaultValue: [],
});
```

### Cancelling an in-flight request

```ts
private query = signal('');

readonly search = new HttpClientData<SearchResult[]>(this.injector, {
  url: () => `/api/search?q=${this.query()}`,
  defaultValue: [],
});

onQueryChange(query: string): void {
  this.search.cancel();   // Abort the previous request (no-op if not loading)
  this.query.set(query);
  this.search.load();     // Start a fresh request
}
```

### Lifecycle: load → set → reload → cancel → destroy

```ts
const data = new HttpClientData<Item>(injector, { url: '/api/items/1' });

data.load();          // Fires GET, status → 'loading'
// ... response arrives → status → 'resolved'

data.set(localItem);  // Overwrite locally → status → 'local'

data.reload();        // Re-fetch from server → status → 'reloading' → 'resolved'

data.load();          // Triggers reload (already loaded)
data.cancel();        // Abort in-flight request → resets to idle

data.load();          // Start fresh → fires GET again

data.destroy();       // Tear down → resets to idle
```

## Key behaviours

| Behaviour | Detail |
|---|---|
| **Lazy execution** | No HTTP request is made until `load()` is called. |
| **Sensible defaults** | Before load: `isIdle` is `true`, all other status flags are `false`, `value` returns `defaultValue`. |
| **Reload semantics** | `reload()` is a no-op before `load()`. After `load()`, it re-fetches from the server. `load()` itself acts as reload if already loaded. |
| **Cancel semantics** | `cancel()` aborts an in-flight request (`'loading'` or `'reloading'` status) and resets to the initial state. It is a no-op if not currently pending. After `cancel()`, `load()` can be called to start a fresh request. |
| **Destroy & re-create** | `destroy()` resets regardless of status. `load()` can be called again afterwards. |
| **Param conversion** | Number and boolean params are automatically stringified. Array params produce multi-value query parameters. |
| **Request cancellation** | Each `load()` / `reload()` automatically unsubscribes any previous in-flight request before starting a new one. |
