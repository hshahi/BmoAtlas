# LoadWrapper

A declarative, template-driven component that renders different UI states based on the status of an `HttpData` resource. It eliminates repetitive `@if`/`@switch` boilerplate by mapping resource states (idle, loading, reloading, error, empty, content) to named template slots.

> **See also:** [`LoadWrapperClientData`](../load-wrapper-client-data/load-wrapper-client-data.md) — the equivalent component for `HttpClientData` (RxJS/`HttpClient`-based) sources.

## Why LoadWrapper?

Without `LoadWrapper`, every component that consumes an `HttpData` resource must manually check status signals and render the appropriate UI:

```html
@if (items.isLoading()) {
  <spinner />
} @else if (items.isError()) {
  <error-banner [error]="items.error()" />
  <button (click)="items.reload()">Retry</button>
} @else if (items.isSuccess()) {
  @for (item of items.value(); track item.id) {
    <item-card [item]="item" />
  }
}
```

`LoadWrapper` encapsulates this pattern into a single component with named template slots:

```html
<load-wrapper [source]="items">
  <ng-template #loading>
    <spinner />
  </ng-template>
  <ng-template #error let-ctx>
    <error-banner [error]="ctx.error" />
    <button (click)="ctx.retry()">Retry</button>
  </ng-template>
  <ng-template #content let-data>
    @for (item of data; track item.id) {
      <item-card [item]="item" />
    }
  </ng-template>
</load-wrapper>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `source` | `HttpData<T>` | **required** | The data source whose status drives which template is rendered. |
| `emptyWhen` | `(data: T) => boolean` | `undefined` | Custom predicate to determine if the resolved data should be treated as "empty". When not provided, arrays with `length === 0` are automatically considered empty. |
| `showReloadingState` | `boolean` | `true` | When `true`, a dedicated reloading state (with overlay) is shown during reloads. When `false`, the content template remains visible without an overlay during reloads. |

## Outputs

| Output | Type | Description |
|---|---|---|
| `loaded` | `T` | Emits the data value each time the resource resolves successfully. |
| `errored` | `unknown` | Emits the error each time the resource enters an error state. |
| `statusChange` | `ResourceStatus` | Emits every time the resource status changes (`'idle'`, `'loading'`, `'reloading'`, `'resolved'`, `'error'`, `'local'`). |

## Template Slots

All template slots are optional. When a slot is not provided, `LoadWrapper` renders a sensible default (or nothing for idle/content).

| Slot name | Context type | Default rendering | Description |
|---|---|---|---|
| `#idle` | `IdleContext` | Nothing | Shown when the resource is in `idle` state (before `load()` is called). |
| `#loading` | None | Spinner + "Loading..." text | Shown during the initial load. |
| `#reloading` | `ReloadingContext<T>` | Content with a semi-transparent overlay and small spinner | Shown during reloads when `showReloadingState` is `true`. |
| `#error` | `ErrorContext` | "Something went wrong" + Retry button | Shown when the resource is in error state. |
| `#empty` | None | "No data available" text | Shown when the resource resolves but the data is considered empty. |
| `#content` | `ContentContext<T>` | Nothing (must be provided for content to render) | Shown when the resource resolves with non-empty data. |

### Context Interfaces

```ts
interface ContentContext<T> {
  $implicit: T;     // Use with `let-data` for implicit binding
  data: T;          // Explicit access to the data
  reload: () => void;
  status: ResourceStatus;
}

interface ErrorContext {
  $implicit: unknown;  // The error object
  error: unknown;
  retry: () => void;   // Triggers a reload
}

interface ReloadingContext<T> {
  $implicit: T | undefined;
  data: T | undefined;
  status: ResourceStatus;
}

interface IdleContext {
  load: () => void;  // Triggers the initial load
}
```

## Usage Examples

### Basic usage with default templates

The simplest usage — only provide a `#content` template. Loading, error, and empty states use built-in defaults:

```html
<load-wrapper [source]="items">
  <ng-template #content let-data>
    @for (item of data; track item.id) {
      <div>{{ item.name }}</div>
    }
  </ng-template>
</load-wrapper>
```

### Custom templates for all states

```html
<load-wrapper [source]="items" (loaded)="onLoaded($event)" (errored)="onError($event)">
  <ng-template #idle let-ctx>
    <button (click)="ctx.load()">Load Items</button>
  </ng-template>

  <ng-template #loading>
    <my-skeleton-loader />
  </ng-template>

  <ng-template #error let-ctx>
    <div class="error-panel">
      <p>Failed to load: {{ ctx.error }}</p>
      <button (click)="ctx.retry()">Try Again</button>
    </div>
  </ng-template>

  <ng-template #empty>
    <div class="empty-state">
      <img src="empty-illustration.svg" />
      <p>No items found. Create your first item!</p>
    </div>
  </ng-template>

  <ng-template #content let-data>
    @for (item of data; track item.id) {
      <item-card [item]="item" />
    }
  </ng-template>
</load-wrapper>
```

### Custom empty detection

By default, only empty arrays (`[]`) are treated as empty. Use `emptyWhen` for custom logic:

```html
<!-- Treat null/undefined inner data as empty -->
<load-wrapper [source]="profile" [emptyWhen]="isProfileEmpty">
  <ng-template #content let-data>
    <profile-card [profile]="data" />
  </ng-template>
</load-wrapper>
```

```ts
isProfileEmpty = (data: Profile) => !data.name && !data.email;
```

### Reloading behaviour

When `showReloadingState` is `true` (default), reloads show a dedicated reloading template (or the default overlay). When `false`, the content remains visible during reloads with no visual indication:

```html
<!-- Silent reloading — content stays visible, no overlay -->
<load-wrapper [source]="items" [showReloadingState]="false">
  <ng-template #content let-data>
    @for (item of data; track item.id) {
      <item-card [item]="item" />
    }
  </ng-template>
</load-wrapper>
```

### Custom reloading template

```html
<load-wrapper [source]="items">
  <ng-template #reloading let-ctx>
    <div class="reloading-banner">
      Refreshing data...
      <progress-bar />
    </div>
    <!-- Still show the previous data -->
    @if (ctx.data) {
      @for (item of ctx.data; track item.id) {
        <item-card [item]="item" [dimmed]="true" />
      }
    }
  </ng-template>

  <ng-template #content let-data>
    @for (item of data; track item.id) {
      <item-card [item]="item" />
    }
  </ng-template>
</load-wrapper>
```

### Reacting to status changes

```html
<load-wrapper
  [source]="items"
  (loaded)="onItemsLoaded($event)"
  (errored)="onItemsError($event)"
  (statusChange)="onStatusChange($event)"
>
  <ng-template #content let-data>
    <!-- ... -->
  </ng-template>
</load-wrapper>
```

```ts
onItemsLoaded(items: Item[]) {
  console.log(`Loaded ${items.length} items`);
}

onItemsError(error: unknown) {
  this.notificationService.showError('Failed to load items');
}

onStatusChange(status: ResourceStatus) {
  this.isLoading = status === 'loading' || status === 'reloading';
}
```

### Using content context for reload

The `#content` template receives a context with a `reload` function, enabling refresh buttons inside the content area:

```html
<load-wrapper [source]="items">
  <ng-template #content let-data let-reload="reload" let-status="status">
    <div class="toolbar">
      <span>{{ data.length }} items</span>
      <button (click)="reload()">Refresh</button>
    </div>
    @for (item of data; track item.id) {
      <item-card [item]="item" />
    }
  </ng-template>
</load-wrapper>
```

## State Resolution Order

The `@switch(true)` in the template evaluates states in this priority order:

1. **Idle** — resource has not been loaded yet
2. **Loading** — initial load in progress
3. **Reloading** (with `showReloadingState`) — subsequent load in progress, dedicated UI
4. **Error** — request failed
5. **Empty** — resolved but data is empty (per `emptyWhen` or default array check)
6. **Content** — resolved with non-empty data

Additionally, when `showReloadingState` is `false` and the resource is reloading, the content template is rendered outside the switch block (no overlay).

## CSS Classes

The component uses BEM-style class names under the `.data-status` block:

| Class | Description |
|---|---|
| `.data-status` | Root container |
| `.data-status__loading` | Loading state wrapper (flex column, centered) |
| `.data-status__spinner` | CSS spinner animation |
| `.data-status__spinner--small` | Smaller spinner variant for reloading overlay |
| `.data-status__reloading-wrapper` | Wrapper for content + overlay during reload |
| `.data-status__reloading-overlay` | Semi-transparent overlay during reload |
| `.data-status__error` | Error state wrapper |
| `.data-status__error-icon` | Error icon (⚠) |
| `.data-status__retry-btn` | Retry button in error state |
| `.data-status__empty` | Empty state wrapper |

All colours use CSS custom properties with sensible fallbacks:

| Custom property | Fallback | Usage |
|---|---|---|
| `--text-secondary` | `#666` | Loading and empty state text |
| `--border-color` | `#e0e0e0` | Spinner border, retry button border |
| `--primary-color` | `#3b82f6` | Spinner active colour, hover border |
| `--background-color` | `#fff` | Retry button background |
| `--text-primary` | `#333` | Retry button text |
| `--hover-background` | `#f5f5f5` | Retry button hover |
| `--active-background` | `#e8e8e8` | Retry button active |
