# HttpData

A lazy, signal-based wrapper around Angular's `httpResource` for newer version of Angular that defers HTTP resource creation until explicitly requested. All state — value, status, error, headers — is exposed as reactive `Signal`s, making it ideal for use in templates and computed expressions.

## Why HttpData?

Angular's `httpResource` creates and fires the HTTP request immediately upon construction (inside an injection context). `HttpData` adds a **lazy initialisation layer**: the underlying `httpResource` is not created until `load()`, `set()`, or `update()` is called. This enables:

- **Deferred loading** — create the `HttpData` instance during construction, trigger the request later (e.g. on user action or route activation).
- **Consistent signal API** — all status flags return sensible defaults (`isIdle: true`, `isLoading: false`, etc.) even before the resource exists.
- **Lifecycle control** — `destroy()` tears down the resource and resets to the initial state; `load()` can be called again to re-create it.

## Construction

`HttpData` is **not** an injectable service. Create instances directly, passing an `Injector` and a `DataOptions` configuration:

```ts
import { Injector, inject } from '@angular/core';
import { HttpData } from '@core/services/http-data/http-data';

@Injectable()
export class ItemService {
  private injector = inject(Injector);

  readonly item = new HttpData<Item>(this.injector, {
    url: '/api/items/1',
  });
}
```

### Static factory methods

For mutation operations (`POST`, `PUT`, `PATCH`), static factory methods provide a cleaner API that encodes the HTTP method in the function name and **requires** a `body`:

```ts
// Instead of:
readonly result = new HttpData<Item, CreateDto>(this.injector, {
  url: '/api/items',
  method: 'POST',
  body: dto,
});

// Use:
readonly result = HttpData.post<Item, CreateDto>(this.injector, {
  url: '/api/items',
  body: dto,
});
```

| Factory | HTTP method | Body required? |
|---|---|---|
| `HttpData.post<T, TBody>(injector, options)` | `POST` | ✅ Yes |
| `HttpData.put<T, TBody>(injector, options)` | `PUT` | ✅ Yes |
| `HttpData.patch<T, TBody>(injector, options)` | `PATCH` | ✅ Yes |

The `options` parameter is a `MutationOptions<T, TBody>` — identical to `DataOptions` but with `method` removed and `body` made required.

> **Note:** `GET` does not need a factory — it is the default method. `DELETE` rarely has a body, so `new HttpData(injector, { url, method: 'DELETE' })` is clear enough.

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
  reportProgress?: boolean;
  delay?: number;
}
```

| Option | Description |
|---|---|
| `url` | Request URL. Can be a static string or a function (reactive — re-evaluated when signals inside it change). |
| `method` | HTTP method. Defaults to `'GET'`. |
| `headers` | Request headers. Supports single values or arrays for multi-value headers. |
| `params` | Query parameters. Numbers and booleans are automatically converted to strings. Arrays produce multi-value params. |
| `body` | Request body. Can be a static value or a function (reactive). |
| `defaultValue` | Value returned by `value()` when the resource is in `idle` or `loading` state. |
| `parse` | Transform function applied to the raw HTTP response before it becomes the resource value. Useful for validation (e.g. Zod) or shape mapping. |
| `reportProgress` | When `true`, enables progress events accessible via the `progress` signal. |
| `delay` | Delay in milliseconds before the `httpResource` is created. The status transitions to `'loading'` immediately; the actual resource creation happens after the delay. The delay only applies to the first `load()` call — subsequent calls (reloads) bypass the delay. Useful for debouncing or showing a loading indicator before the request starts. |

## API

### Signals (read-only)

| Signal | Type | Before `load()` | Description |
|---|---|---|---|
| `value` | `Signal<T \| undefined>` | `defaultValue` or `undefined` | The current resource value. |
| `error` | `Signal<unknown>` | `undefined` | The last error, if any. |
| `status` | `Signal<ResourceStatus>` | `'idle'` | Angular's `ResourceStatus`: `'idle'` · `'loading'` · `'reloading'` · `'resolved'` · `'error'` · `'local'`. |
| `isIdle` | `Signal<boolean>` | `true` | `true` when status is `'idle'`. |
| `isLoading` | `Signal<boolean>` | `false` | `true` when status is `'loading'` (initial load). |
| `isReloading` | `Signal<boolean>` | `false` | `true` when status is `'reloading'` (subsequent load). |
| `isPending` | `Signal<boolean>` | `false` | `true` when `isLoading` or `isReloading`. |
| `isSuccess` | `Signal<boolean>` | `false` | `true` when status is `'resolved'`. |
| `isError` | `Signal<boolean>` | `false` | `true` when status is `'error'`. |
| `isLocal` | `Signal<boolean>` | `false` | `true` when status is `'local'` (value was set via `set()` or `update()`). |
| `hasValue` | `Signal<boolean>` | `true` if `defaultValue` set | `true` when the resource has a usable value. |
| `isLoaded` | `Signal<boolean>` | `false` | `true` when the underlying `httpResource` has been created. |
| `headers` | `Signal<HttpHeaders \| undefined>` | `undefined` | Response headers from the last successful request. |
| `statusCode` | `Signal<number \| undefined>` | `undefined` | HTTP status code from the last response. |
| `progress` | `Signal<HttpProgressEvent \| undefined>` | `undefined` | Latest progress event (requires `reportProgress: true`). |

### Methods

#### `load(): void`

Creates the underlying `httpResource` (if not already created) and triggers the HTTP request. If the resource already exists, it reloads it.

```ts
this.item.load();
```

#### `reload(): void`

Re-fetches data from the server. **No-op** if the resource has not been loaded yet (unlike `load()`, which creates the resource).

```ts
this.item.reload(); // only works after load() has been called
```

#### `set(value: T): void`

Overwrites the resource value locally. Creates the resource if it doesn't exist. Sets the status to `'local'`.

```ts
this.item.set({ id: 1, name: 'Updated locally' });
```

#### `update(updateFn: (current: T | undefined) => T | undefined): void`

Updates the resource value using a function. Creates the resource if it doesn't exist. Sets the status to `'local'`.

```ts
this.item.update(current => current ? { ...current, name: 'Modified' } : current);
```

#### `cancel(): void`

Cancels an in-flight HTTP request and resets the `HttpData` back to its initial (pre-load) state. **No-op** if the resource is not currently in `'loading'` or `'reloading'` status. Unlike `destroy()`, `cancel()` is semantically intended for aborting an active request while keeping the `HttpData` instance ready for future use.

```ts
this.item.cancel();
// After cancel: isLoaded() === false, isIdle() === true, value() === defaultValue
// load() can be called again to start a fresh request
```

#### `destroy(): void`

Destroys the underlying `httpResource`, cancels any pending request, and resets the `HttpData` back to its initial (pre-load) state. **No-op** if the resource has not been loaded. Unlike `cancel()`, `destroy()` tears down the resource regardless of its current status.

```ts
this.item.destroy();
// After destroy: isLoaded() === false, isIdle() === true, value() === defaultValue
```

#### `map<U>(mapFn: (data: T) => U): Signal<U | undefined>`

Creates a derived signal that transforms the resource value. Returns `undefined` when the resource has no value.

```ts
const itemName = this.item.map(item => item.name);
// itemName() === 'Alpha' (when loaded) or undefined (when not)
```

#### `getOrDefault(defaultValue: T): Signal<T>`

Creates a derived signal that returns the resource value or the provided default.

```ts
const safeItem = this.item.getOrDefault({ id: 0, name: 'N/A' });
// safeItem() always returns a T, never undefined
```

#### `resource: HttpResourceRef<T | undefined> | null` (getter)

Direct access to the underlying Angular `HttpResourceRef`. Returns `null` before `load()` is called.

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

  readonly items = new HttpData<Item[]>(this.injector, {
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
readonly createResult = HttpData.post<Item, CreateItemDto>(this.injector, {
  url: '/api/items',
  body: () => this.formData(),  // reactive body — body is required by the type
});

submit(): void {
  this.createResult.load();
}
```

### Dynamic URL with signals

```ts
private selectedId = signal<number>(1);

readonly item = new HttpData<Item>(this.injector, {
  url: () => `/api/items/${this.selectedId()}`,
});

selectItem(id: number): void {
  this.selectedId.set(id);
  this.item.load(); // URL updates reactively
}
```

### Response transformation with parse

```ts
readonly item = new HttpData<Item>(this.injector, {
  url: '/api/items/1',
  parse: (raw: unknown) => {
    const r = raw as { item_id: number; item_name: string };
    return { id: r.item_id, name: r.item_name };
  },
});
```

### Query parameters

```ts
readonly items = new HttpData<Item[]>(this.injector, {
  url: '/api/items',
  params: { page: 1, limit: 20, active: true, tags: ['angular', 'signals'] },
  defaultValue: [],
});
```

### Optimistic update

```ts
// After loading, update locally before the server confirms
this.item.load();
// ... later, after response arrives:
this.item.set({ ...this.item.value()!, name: 'Optimistic name' });
// Status becomes 'local'; reload() to re-fetch from server
```

### Cancelling an in-flight request

```ts
private query = signal('');

readonly search = new HttpData<SearchResult[]>(this.injector, {
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
const data = new HttpData<Item>(injector, { url: '/api/items/1' });

data.load();          // Creates resource, fires GET
// ... response arrives → isSuccess() === true

data.set(localItem);  // Overwrite locally → isLocal() === true

data.reload();        // Re-fetch from server → isSuccess() === true

data.load();          // Triggers reload (resource already exists)
data.cancel();        // Abort in-flight request → isLoaded() === false, isIdle() === true

data.load();          // Start fresh → fires GET again

data.destroy();       // Tear down → isLoaded() === false, isIdle() === true
```

## Key behaviours

| Behaviour | Detail |
|---|---|
| **Lazy creation** | The `httpResource` is not created until `load()`, `set()`, or `update()` is called. |
| **Sensible defaults** | Before load: `isIdle` is `true`, all other status flags are `false`, `value` returns `defaultValue`. |
| **Reload semantics** | `reload()` is a no-op before `load()`. After `load()`, it re-fetches from the server. `load()` itself acts as reload if the resource already exists. |
| **Cancel semantics** | `cancel()` aborts an in-flight request (`'loading'` or `'reloading'` status) and resets to the initial state. It is a no-op if the resource is not currently pending. After `cancel()`, `load()` can be called to start a fresh request. |
| **Destroy & re-create** | `destroy()` tears down the resource regardless of status. `load()` can be called again afterwards to create a fresh resource. |
| **Param conversion** | Number and boolean params are automatically stringified. Array params produce multi-value query parameters. |
| **Reactive URL & body** | When `url` or `body` are functions, they are re-evaluated reactively. Changes to signals used inside them trigger new requests automatically (via `httpResource`'s built-in reactivity). |
