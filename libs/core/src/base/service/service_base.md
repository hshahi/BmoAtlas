# ServiceBase

`ServiceBase` is the abstract foundation for all feature services. It injects `StateHub` and `DestroyRef`, providing a unified API for pub/sub messaging and reactive state management.

```
ServiceBase (abstract)
├── ErrorService          providedIn: 'root'   → singleton (global error handling)
├── StockService          providedIn: 'root'   → singleton (shared across 5 consumers)
├── PortfolioService      @Injectable()         → component-scoped on PortfolioContainer
└── LiveTickerService     @Injectable()         → component-scoped on LiveTickerContainer
```

---

## Provider Scope & Garbage Collection

Every class that extends `ServiceBase` must choose a provider scope. The scope determines **when the instance is created, when it is destroyed, and whether it can be garbage-collected**.

### Singleton — `providedIn: 'root'`

```typescript
@Injectable({ providedIn: 'root' })
export class StockService extends ServiceBase { }
```

- One instance for the entire application lifetime.
- **Never garbage-collected** — the root injector holds a reference until the browser tab closes.
- `ngOnDestroy` is never called during normal usage.
- Appropriate when the service is **shared across many consumers** in different routes and holds no expensive resources.

### Component-Scoped — Bare `@Injectable()`

```typescript
@Injectable()
export class LiveTickerService extends ServiceBase implements OnDestroy { }
```

- **Not registered by default** — must be added to a component's `providers` array.
- Instance is created when the component is created; **destroyed and garbage-collected** when the component is destroyed.
- Angular calls `ngOnDestroy` on the service, enabling cleanup of subscriptions, timers, and workers.
- Appropriate when the service has **a single consumer** or holds **expensive resources** that should not persist across navigation.

---

## How to Wire a Component-Scoped ServiceBase Subclass

### 1. Declare the service with bare `@Injectable()`

```typescript
// features/services/live-ticker/live-ticker.service.ts
@Injectable()
export class LiveTickerService extends ServiceBase implements OnDestroy {

  ngOnDestroy(): void {
    // Clean up subscriptions, workers, strategy engines, etc.
  }
}
```

### 2. Provide it (and its dependencies) on the container component

If the service depends on another service that also manages expensive resources
(e.g. `DataStreamService` owns a Web Worker), provide both at the same scope so
they share the same lifecycle:

```typescript
// features/live-ticker/live-ticker-container.ts
@Component({
  selector: 'app-live-ticker',
  providers: [LiveTickerService, DataStreamService],   // ← both component-scoped
  ...
})
export class LiveTickerContainer {
  private readonly tickerService = inject(LiveTickerService);
}
```

### 3. Garbage collection lifecycle

```
Navigate to /live-ticker
  → Angular creates LiveTickerContainer
  → Component injector creates DataStreamService (new instance)
  → Component injector creates LiveTickerService (new instance)
  → Service subscribes to DataStreamService, creates StrategyEngine

Navigate away
  → Angular destroys LiveTickerContainer
  → Component injector destroys LiveTickerService
  → ngOnDestroy() fires → unsubscribes, terminates worker, destroys engine
  → Component injector destroys DataStreamService
  → dispose() safely completes subjects (instance is also being destroyed)
  → No remaining references → both instances are garbage-collected ✅

Navigate back to /live-ticker
  → Fresh DataStreamService with new subjects ✅
  → Fresh LiveTickerService with new signals ✅
```

---

## Why `StockService` Stays Singleton

`StockService` is consumed by 5 different components across 4 routes plus `PortfolioService`. Making it component-scoped would require providing it on every container — messy and error-prone. It holds no expensive resources (no workers, no WebSockets, no timers). Its state (watchlist, stock data) is lightweight and read-heavy. Singleton is the pragmatic choice.

## Why `PortfolioService` Is Component-Scoped

`PortfolioService` has a single consumer (`PortfolioContainer`). Its positions state is persisted in `StateHub` (the true singleton), so it survives across service instances. It depends on `StockService` (singleton), which the component injector finds in the root injector — no conflict. Making it component-scoped means the computed signals and service instance are garbage-collected when the user leaves `/portfolio`.

---

## Zoneless Angular — No `NgZone` Needed

In zoneless Angular (v19+), `NgZone` is replaced by `NoopNgZone`. Signal-based change detection means:

- **`zone.runOutsideAngular()`** is unnecessary — there's no Zone.js patching browser APIs.
- **`zone.run()`** is unnecessary — `signal.set()` notifies Angular's scheduler directly regardless of execution context.

Services should write to signals directly without zone wrappers:

```typescript
// ✅ Correct — zoneless
this.strategyEngine.setRenderCallback((updates) => {
  const newStocks = new Map(this.stocks());
  for (const [symbol, tick] of updates) {
    newStocks.set(symbol, tick);
  }
  this.stocks.set(newStocks);  // Signal notifies Angular scheduler directly
});

// ❌ Unnecessary — zone wrapper is a no-op in zoneless mode
this.zone.run(() => {
  this.stocks.set(newStocks);
});
```

---

## Rules for ServiceBase Subclasses

1. **Choose the right scope.** If the service manages workers, WebSockets, large `Map`s, or `requestAnimationFrame` loops, use bare `@Injectable()` + component-level `providers` so it can be garbage-collected on navigation. If it's shared across many routes with no expensive resources, use `providedIn: 'root'`.

2. **Scope dependencies together.** If a component-scoped service depends on another service that holds expensive resources (workers, subjects that get completed), provide both at the same component scope. This prevents the "dead singleton" problem where `dispose()` permanently kills a root-level service's internals.

3. **Implement `OnDestroy` for component-scoped services.** Angular only calls `ngOnDestroy` on services registered in an injector that gets destroyed. Always implement it to clean up subscriptions and resources.

4. **Use `destroyRef` from `ServiceBase` for automatic teardown.** The inherited `destroyRef` is tied to the injector that created the service. Use `takeUntilDestroyed(this.destroyRef)` on RxJS streams to auto-unsubscribe when the service is destroyed — no manual cleanup needed.

```typescript
@Injectable()
export class MyFeatureService extends ServiceBase {
  private readonly http = inject(HttpData);

  readonly data$ = this.http.get<Item[]>('/api/items').pipe(
    takeUntilDestroyed(this.destroyRef),  // auto-unsubscribes on destroy
  );
}
```

5. **Do not use `NgZone`.** In zoneless Angular, `zone.run()` and `zone.runOutsideAngular()` are no-ops. Write to signals directly — Angular's scheduler detects dirty signals automatically.
