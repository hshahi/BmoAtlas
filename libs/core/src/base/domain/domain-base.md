# Domain Base — Architecture & Design Reference

## Overview

[`domain-base.ts`](domain-base.ts) provides two foundational abstract classes for domain modelling:

- **[`Domain<T>`](domain-base.ts:6)** — Abstract base for all domain entities
- **[`DomainList<T>`](domain-base.ts:57)** — Typed collection that extends `Array<T>` with domain-aware behaviour

Together they deliver **type-safe hydration, serialization, cloning, and rich domain logic** for data flowing between the backend API and the Angular frontend.

---

## Design Goals

| Goal | How it's achieved |
|------|-------------------|
| **Type safety** | CRTP pattern `Domain<T extends Domain<T>>` ensures `clone()`, `fromJson()`, and `toJson()` return the correct concrete type |
| **Reusability** | Any domain entity inherits serialization, cloning, and identity for free |
| **Flexible hydration** | `Partial<T>` constructors allow creating entities from incomplete backend data with sensible defaults |
| **Rich domain models** | Subclasses add computed getters, formatting, and business logic co-located with the data |
| **Collection behaviour** | `DomainList<T>` gives typed arrays with `clone()`, `toJson()`, `fromJson()`, and custom subclass methods |

---

## `Domain<T>` — Abstract Entity Base

```
Domain<T extends Domain<T>>
├── abstract id: string | number
├── constructor(domainType?: DomainConstructor<T>)
├── clone(): T
├── equals(other: T): boolean
├── toJson(): Record<string, unknown>
├── serializeValue(value): unknown          [private]
└── static fromJson(data: Partial<T>): T
```

### CRTP Pattern: `Domain<T extends Domain<T>>`

The **Curiously Recurring Template Pattern** ensures that methods like `clone()` and `fromJson()` return the concrete subclass type, not the base `Domain` type:

```typescript
class Stock extends Domain<Stock> { ... }

const stock = new Stock({ price: 150 });
const copy = stock.clone();    // type is Stock, not Domain<Stock>
const s = Stock.fromJson({});  // type is Stock, not Domain<unknown>
```

Without CRTP, you'd need manual casting everywhere.

### Constructor & `domainType`

```typescript
constructor(protected readonly domainType?: DomainConstructor<T>) {}
```

Subclasses pass their own constructor reference:

```typescript
class Stock extends Domain<Stock> {
    constructor(data?: Partial<Stock>) {
        super(Stock as DomainConstructor<Stock>);
        // ...assign fields with defaults
    }
}
```

The `domainType` is used by `clone()` to construct a new instance. If not provided, `clone()` falls back to `this.constructor` — this makes the parameter optional for simpler entities.

### `clone(): T`

```typescript
clone(): T {
    return new (this.domainType ?? (this.constructor as DomainConstructor<T>))(
        this.toJson() as Partial<T>
    );
}
```

Creates a deep copy by:
1. Serializing to JSON via `toJson()`
2. Constructing a new instance from that JSON

This guarantees independence — mutating the clone never affects the original.

### `equals(other: T): boolean`

```typescript
equals(other: T): boolean {
    if (!(other instanceof Domain)) return false;
    return JSON.stringify(this.toJson()) === JSON.stringify(other.toJson());
}
```

Compares two domain entities for **semantic equality** — same data, regardless of object identity:

```typescript
const a = new Stock({ id: 'AAPL', price: 150 });
const b = new Stock({ id: 'AAPL', price: 150 });

a === b;        // false (different references)
a.equals(b);    // true  (same data)
a.equals(a.clone()); // true
```

Returns `false` if the argument is not a `Domain` instance (e.g., a plain object), providing type safety at runtime.

### `toJson(): Record<string, unknown>`

Serializes all own properties (excluding `domainType`) using recursive `serializeValue()`:

| Value type | Serialization |
|-----------|---------------|
| `null` / `undefined` | Preserved as-is |
| `Domain` instance | Recursively calls `.toJson()` |
| `Array` | Maps each element through `serializeValue()` |
| `Date` | Converts to ISO 8601 string via `.toISOString()` |
| Plain object | Recursively serializes each key |
| Primitives | Returned directly |

### `static fromJson(data: Partial<T> | Record<string, unknown>): T`

Factory method that constructs a new instance from partial data:

```typescript
const stock = Stock.fromJson({ id: 'AAPL', price: 150 });
// Missing fields get defaults from the Stock constructor
```

The `this` parameter typing ensures it's called on the concrete class, not the base.

The parameter also accepts `Record<string, unknown>` so that subclasses can receive raw API payloads with different key names (e.g. snake_case) and perform custom mapping in their constructor.

### Custom `fromJson` — When Default Mapping Doesn't Work

The default `fromJson` simply calls `new this(data)`, which works when the incoming JSON keys match the class property names. **When they don't** — for example when the backend uses snake_case, nested structures that need flattening, or values that require transformation — you should handle the mapping in the **constructor** itself.

The constructor approach is preferred because `clone()` also calls the constructor (via `toJson() → new Constructor(json)`), so any mapping logic in the constructor automatically works for both `fromJson()` and `clone()`.

#### Pattern: Constructor-Based Custom Mapping

```typescript
class Order extends Domain<Order> {
    id: string;
    customerName: string;
    total: number;          // stored in dollars
    createdAt: Date;

    constructor(data?: Partial<Order> | Record<string, unknown>) {
        super(Order);
        const d = (data ?? {}) as Record<string, unknown>;

        // Support both camelCase (from clone/direct) and snake_case (from API)
        this.id           = (d['id'] ?? d['order_id'] ?? '') as string;
        this.customerName = (d['customerName'] ?? d['customer_name'] ?? '') as string;

        // Transform cents → dollars when 'total_cents' is present
        if (d['total_cents'] !== undefined) {
            this.total = (d['total_cents'] as number) / 100;
        } else {
            this.total = (d['total'] as number) ?? 0;
        }

        // Parse date string → Date when needed
        const rawDate = d['createdAt'] ?? d['created_at'];
        this.createdAt = rawDate instanceof Date
            ? rawDate
            : new Date((rawDate as string) ?? 0);
    }
}
```

#### Usage with `HttpClientData`

```typescript
// The parse callback passes raw API JSON through fromJson
readonly orders = new HttpClientData<Order>(this.injector, {
    url: '/api/orders/123',
    parse: (raw) => Order.fromJson(raw as Record<string, unknown>),
});
```

#### When to Use This Pattern

| Scenario | Example |
|----------|---------|
| **Key name mismatch** | API sends `order_id`, domain uses `id` |
| **Value transformation** | API sends cents, domain stores dollars |
| **Type coercion** | API sends ISO string, domain stores `Date` |
| **Nested flattening** | API sends `{ address: { city } }`, domain stores `city` directly |
| **Computed defaults** | `id` derived from another field (e.g. `id = meta.symbol`) |

#### Why Constructor, Not Static Override?

Overriding the static `fromJson` method is possible but has a TypeScript limitation: the base class uses a generic `this` parameter (`this: DomainConstructor<T>`) that makes the override signature incompatible with strict type checking. Putting the mapping logic in the constructor avoids this issue entirely and also ensures `clone()` works correctly, since `clone()` calls `new Constructor(toJson())`.

---

## `DomainList<T>` — Typed Collection

```
DomainList<T extends Domain<T>> extends Array<T>
├── static [Symbol.species]: ArrayConstructor
├── static readonly itemType?: DomainConstructor<any>
├── constructor(itemType, listType?, items?)
├── static instance(itemType, items?): DomainList<T>
├── static fromJson(itemType, data): DomainList<T>     [overload 1]
├── static fromJson(data): L                            [overload 2 — subclass]
├── clone(): this
└── toJson(): Record<string, unknown>[]
```

### Why Extend `Array`?

Extending `Array` means `DomainList` instances work everywhere a regular array does:
- `for...of` loops
- Spread syntax `[...list]`
- `reduce()`, `find()`, `every()`, `some()`, `indexOf()`, `includes()`
- Angular template `@for` directives
- RxJS operators that expect arrays

### `Symbol.species` Override

```typescript
static override get [Symbol.species](): ArrayConstructor { return Array; }
```

**This is critical.** When `Array.prototype.map()`, `filter()`, `slice()`, etc. create a new array, JavaScript uses `Symbol.species` to determine the constructor. Without this override, calling `stockList.map(...)` would try to construct a new `StockList(length)` — passing a number where an array of items is expected, causing `items is not iterable`.

The override tells JavaScript: *"When array methods create new arrays from me, use plain `Array`, not my subclass."*

This is the **standard pattern** used by every library that extends `Array` — TypedArrays, Immutable.js, MobX observable arrays, etc.

#### Impact on Array Methods

**Methods that create new arrays** — return plain `Array` after the fix:

| Method | Returns | Notes |
|--------|---------|-------|
| `map()` | `Array` | Used internally by `clone()` and `toJson()` |
| `filter()` | `Array` | Used by `StockList.gainers` / `losers` |
| `slice()` | `Array` | Sub-range extraction |
| `splice()` | `Array` | Removed elements |
| `concat()` | `Array` | Merged arrays |
| `flat()` / `flatMap()` | `Array` | Flattened arrays |

**Methods unaffected** — work directly on `this`:

| Method | Returns | Notes |
|--------|---------|-------|
| `push()` / `pop()` | element/length | Used in constructor to populate |
| `sort()` | `this` | Sorts in-place |
| `reduce()` / `reduceRight()` | accumulated value | Used by `totalMarketCap` |
| `find()` / `findIndex()` | single element/index | |
| `forEach()` | `void` | |
| `every()` / `some()` | `boolean` | |
| `indexOf()` / `includes()` | index/boolean | |
| `at()` | single element | ES2022 |

#### Re-wrapping Pattern

If you need a `DomainList` subclass back from a filter/map, explicitly construct it:

```typescript
// Returns Stock[] (plain array) — correct for most uses
const expensive = stockList.filter(s => s.price > 100);

// Returns StockList — when you need subclass methods
const expensiveList = new StockList(stockList.filter(s => s.price > 100));
```

### Constructor

```typescript
constructor(
    protected readonly itemType: DomainConstructor<T>,
    protected readonly listType?: DomainListConstructor<T, any>,
    items?: Array<Partial<T> | T>
)
```

- **`itemType`** — Constructor for the element type (e.g., `Stock`)
- **`listType`** — Optional constructor for the list subclass (e.g., `StockList`), used by `clone()`
- **`items`** — Mixed array of partials or existing instances; partials are hydrated via `new itemType(item)`

`Object.setPrototypeOf(this, new.target.prototype)` ensures the prototype chain is correct when extending built-in `Array`.

### `static instance()`

Factory that creates a `DomainList` without a `listType`:

```typescript
const list = DomainList.instance(Stock, [{ id: 'AAPL', price: 150 }]);
```

### `static fromJson()` — Two Overloads

**Overload 1 — Base `DomainList`:**
```typescript
DomainList.fromJson(Stock, [{ id: 'AAPL' }, { id: 'GOOG' }]);
```

**Overload 2 — Subclass with `static itemType`:**
```typescript
StockList.fromJson([{ id: 'AAPL' }, { id: 'GOOG' }]);
// Uses StockList.itemType = Stock to know how to hydrate
```

The subclass overload requires `static readonly itemType` to be defined. Calling it on the base `DomainList` without `itemType` throws a descriptive error.

### `clone(): this`

```typescript
clone(): this {
    const clonedItems = this.map(i => i.clone());
    if (this.listType) {
        return new this.listType(clonedItems) as this;
    }
    return new DomainList(this.itemType, this.listType, clonedItems) as this;
}
```

Clones every item via `Domain.clone()`, then wraps in the correct list type. The `listType` path preserves subclass identity (e.g., `StockList.clone()` returns a `StockList`).

### `toJson(): Record<string, unknown>[]`

Maps each item through `Domain.toJson()`, returning a plain array of serialized objects ready for API transmission.

---

## Subclass Pattern — `Stock` / `StockList` Example

### Domain Entity

```typescript
export class Stock extends Domain<Stock> {
    id: string;
    symbol: string;
    price: number;
    // ...

    constructor(data?: Partial<Stock>) {
        super(Stock as DomainConstructor<Stock>);
        this.id     = data?.id ?? '';
        this.symbol = data?.symbol ?? '';
        this.price  = data?.price ?? 0;
        // ...defaults for every field
    }

    // Rich domain logic co-located with data
    get isGain(): boolean { return this.change >= 0; }
    get formattedPrice(): string { return `$${this.price.toFixed(2)}`; }
}
```

### Domain Collection

```typescript
export class StockList extends DomainList<Stock> {
    static override readonly itemType = Stock as DomainConstructor<Stock>;

    constructor(items?: Array<Partial<Stock> | Stock>) {
        super(Stock as DomainConstructor<Stock>, StockList as DomainListConstructor<Stock, StockList>, items);
    }

    // Collection-level computed properties
    get gainers(): Stock[] {
        return this.filter(s => s.change > 0)
                   .sort((a, b) => b.changePercent - a.changePercent);
    }

    get totalMarketCap(): number {
        return this.reduce((sum, s) => sum + s.marketCap, 0);
    }
}
```

### Usage Patterns

```typescript
// From backend JSON
const stocks = StockList.fromJson(apiResponse.data);

// Clone for immutable state updates
const updated = stocks.clone();
updated[0].price = 155;

// Serialize for API calls
const payload = stocks.toJson();

// Semantic equality
const a = new Stock({ id: 'AAPL', price: 150 });
const b = new Stock({ id: 'AAPL', price: 150 });
console.log(a.equals(b)); // true

// Rich domain access
console.log(stocks.gainers);
console.log(stocks.totalMarketCap);
console.log(stocks[0].formattedPrice);
```

---

## Test Coverage

[`domain-base.spec.ts`](domain-base.spec.ts) provides **93 tests** covering every code path:

| Category | Tests | What's covered |
|----------|-------|----------------|
| `Domain` construction | 3 | Default values, partial data, full data |
| `Domain.clone()` | 4 | New reference, identical values, independence, constructor fallback |
| `Domain.equals()` | 6 | Identical data, different data, clone equality, non-Domain rejection, defaults, single-field difference |
| `Domain.toJson()` | 10 | All properties, excludes domainType, nested Domain, Date, arrays, objects, null, undefined, primitives |
| `Domain.fromJson()` | 3 | Partial, empty, full data |
| Stock getters | 22 | `isGain`, `formattedPrice`, `formattedChange`, `formattedVolume`, `formattedMarketCap` with boundary values |
| `DomainList` construction | 7 | Empty, partials, instances, mixed, iteration, reduce, find |
| `DomainList.instance()` | 2 | With items, empty |
| `DomainList.fromJson()` | 3 | Both overloads, error case |
| `DomainList.clone()` | 3 | With/without listType, independence |
| `DomainList.toJson()` | 3 | Serialization, empty, no domainType |
| StockList getters | 6 | `gainers`, `losers`, `totalMarketCap` |
| Round-trip integrity | 4 | `toJson→fromJson`, `clone→toJson` equality |
| `Symbol.species` | 5 | `filter()`, `map()`, `slice()`, `concat()` return plain `Array`; subclass safety |
| `DomainList.push()` | 2 | Push after construction, push on empty list |
| Cross-type `equals()` | 1 | Returns `false` for different `Domain` subtypes with matching JSON |
| Custom `fromJson` mapping | 6 | snake_case → camelCase, cents → dollars, date parsing, clone/equals/toJson after custom mapping |

---

## Design Decisions & Justifications

### Why CRTP instead of a simpler base class?

Without CRTP, `clone()` would return `Domain` and `fromJson()` would need manual type assertions everywhere. CRTP eliminates this at the type level while keeping runtime behaviour identical.

### Why `Partial<T>` constructors instead of required fields?

Backend responses may be incomplete, and different use cases need different subsets of fields. `Partial<T>` with defaults makes every entity constructible from any data shape without runtime errors.

### Why extend `Array` instead of wrapping one?

Extending `Array` means `DomainList` is a drop-in replacement everywhere arrays are expected — Angular templates, RxJS operators, spread syntax, destructuring. A wrapper would require `.items` access or conversion methods everywhere.

### Why `Symbol.species` returns `Array`?

This is the standard solution to the "extending Array" problem. Without it, `map()`/`filter()` try to construct the subclass with wrong arguments. Returning `Array` means derived methods produce plain arrays, while `DomainList`-specific methods (`clone`, `toJson`, `fromJson`) handle type preservation explicitly.

### Why `domainType` as a constructor parameter?

JavaScript's `this.constructor` can be unreliable with certain build tools and minifiers. Passing the constructor explicitly is more robust. The fallback to `this.constructor` keeps it optional for simple cases.

### Why `toJson()` instead of `JSON.stringify()`?

`toJson()` gives control over serialization — excluding internal fields like `domainType`, handling nested `Domain` instances, converting `Date` to ISO strings, and recursively processing complex structures. `JSON.stringify()` would include everything and miss domain-specific serialization.

---

## Framework Agnosticism

Nothing in `domain-base.ts` depends on Angular, RxJS, or any framework:

- Pure TypeScript/JavaScript classes
- No decorators, no DI, no signals
- Works in Node.js, Deno, browsers, web workers
- Compatible with any state management approach
- ES2022 target with no polyfill requirements
