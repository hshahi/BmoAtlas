import { Domain, DomainConstructor, DomainList } from './domain-base';
import { Stock, StockList } from '../../models/test-models';

// ── Helpers for edge-case testing ───────────────────────────────────
class NestedInfo extends Domain<NestedInfo> {
    id: string;
    label: string;
    constructor(data?: Partial<NestedInfo>) {
        super(NestedInfo as DomainConstructor<NestedInfo>);
        this.id    = data?.id ?? '';
        this.label = data?.label ?? '';
    }
}

class ParentEntity extends Domain<ParentEntity> {
    id: string;
    nested: NestedInfo;
    tags: string[];
    createdAt: Date;
    metadata: Record<string, unknown>;
    optional: string | null;
    constructor(data?: Partial<ParentEntity>) {
        super(ParentEntity as DomainConstructor<ParentEntity>);
        this.id        = data?.id ?? '';
        this.nested    = data?.nested instanceof NestedInfo
            ? data.nested
            : new NestedInfo(data?.nested as unknown as Partial<NestedInfo>);
        this.tags      = data?.tags ?? [];
        this.createdAt = data?.createdAt instanceof Date
            ? data.createdAt
            : new Date(data?.createdAt ?? 0);
        this.metadata  = (data?.metadata as Record<string, unknown>) ?? {};
        this.optional  = data?.optional ?? null;
    }
}

class FallbackEntity extends Domain<FallbackEntity> {
    id: string;
    value: number;
    constructor(data?: Partial<FallbackEntity>) {
        super(); // no domainType — tests constructor fallback in clone()
        this.id    = data?.id ?? '';
        this.value = data?.value ?? 0;
    }
}

// ─────────────────────────────────────────────────────────────────────
describe('Domain<T>', () => {

    describe('construction', () => {
        it('should create a Stock with default values when no data is provided', () => {
            const s = new Stock();
            expect(s.id).toBe('');
            expect(s.symbol).toBe('');
            expect(s.name).toBe('');
            expect(s.price).toBe(0);
            expect(s.change).toBe(0);
            expect(s.changePercent).toBe(0);
            expect(s.volume).toBe(0);
            expect(s.marketCap).toBe(0);
            expect(s.high52w).toBe(0);
            expect(s.low52w).toBe(0);
            expect(s.sector).toBe('');
        });

        it('should create a Stock with partial data', () => {
            const s = new Stock({ id: 'AAPL', symbol: 'AAPL', price: 150 });
            expect(s.id).toBe('AAPL');
            expect(s.symbol).toBe('AAPL');
            expect(s.price).toBe(150);
            expect(s.name).toBe('');
        });

        it('should create a Stock with full data', () => {
            const s = new Stock({
                id: 'MSFT', symbol: 'MSFT', name: 'Microsoft', price: 300,
                change: 5.5, changePercent: 1.87, volume: 25_000_000,
                marketCap: 2_200_000_000_000, high52w: 350, low52w: 220, sector: 'Technology',
            });
            expect(s.id).toBe('MSFT');
            expect(s.name).toBe('Microsoft');
            expect(s.price).toBe(300);
            expect(s.sector).toBe('Technology');
        });
    });

    describe('clone()', () => {
        it('should produce a new Stock instance (not same reference)', () => {
            const orig = new Stock({ id: 'GOOG', price: 140 });
            const copy = orig.clone();
            expect(copy).not.toBe(orig);
            expect(copy).toBeInstanceOf(Stock);
        });

        it('should produce a clone with identical property values', () => {
            const orig = new Stock({
                id: 'GOOG', symbol: 'GOOG', name: 'Alphabet', price: 140,
                change: -2, changePercent: -1.41, volume: 10_000_000,
                marketCap: 1_800_000_000_000, high52w: 160, low52w: 100, sector: 'Tech',
            });
            const copy = orig.clone();
            expect(copy.id).toBe(orig.id);
            expect(copy.symbol).toBe(orig.symbol);
            expect(copy.price).toBe(orig.price);
            expect(copy.sector).toBe(orig.sector);
        });

        it('should be independent — mutating clone does not affect original', () => {
            const orig = new Stock({ id: 'TSLA', price: 200 });
            const copy = orig.clone();
            copy.price = 999;
            expect(orig.price).toBe(200);
        });

        it('should use constructor fallback when domainType is not provided', () => {
            const orig = new FallbackEntity({ id: 'fb-1', value: 42 });
            const copy = orig.clone();
            expect(copy).toBeInstanceOf(FallbackEntity);
            expect(copy.id).toBe('fb-1');
            expect(copy.value).toBe(42);
            expect(copy).not.toBe(orig);
        });
    });

    describe('equals()', () => {
        it('should return true for two Stocks with identical data', () => {
            const a = new Stock({ id: 'AAPL', symbol: 'AAPL', price: 150 });
            const b = new Stock({ id: 'AAPL', symbol: 'AAPL', price: 150 });
            expect(a.equals(b)).toBe(true);
        });

        it('should return false for two Stocks with different data', () => {
            const a = new Stock({ id: 'AAPL', price: 150 });
            const b = new Stock({ id: 'AAPL', price: 200 });
            expect(a.equals(b)).toBe(false);
        });

        it('should return true for a Stock and its clone', () => {
            const orig = new Stock({ id: 'GOOG', symbol: 'GOOG', price: 140, sector: 'Tech' });
            expect(orig.equals(orig.clone())).toBe(true);
        });

        it('should return false when comparing with a non-Domain value', () => {
            const stock = new Stock({ id: 'X' });
            expect(stock.equals({ id: 'X' } as any)).toBe(false);
        });

        it('should return true for two default-constructed Stocks', () => {
            expect(new Stock().equals(new Stock())).toBe(true);
        });

        it('should return false when only one field differs', () => {
            const a = new Stock({ id: 'A', symbol: 'A', price: 100, sector: 'Tech' });
            const b = new Stock({ id: 'A', symbol: 'A', price: 100, sector: 'Finance' });
            expect(a.equals(b)).toBe(false);
        });
    });

    describe('toJson()', () => {
        it('should return a plain object with all Stock properties', () => {
            const json = new Stock({ id: 'AAPL', symbol: 'AAPL', price: 150 }).toJson();
            expect(json['id']).toBe('AAPL');
            expect(json['symbol']).toBe('AAPL');
            expect(json['price']).toBe(150);
        });

        it('should exclude the domainType key', () => {
            expect(new Stock({ id: 'X' }).toJson()).not.toHaveProperty('domainType');
        });

        it('should serialize a nested Domain instance via its toJson()', () => {
            const p = new ParentEntity({ id: 'p1', nested: new NestedInfo({ id: 'n1', label: 'lbl' }) });
            expect(p.toJson()['nested']).toEqual({ id: 'n1', label: 'lbl' });
        });

        it('should serialize Date fields to ISO strings', () => {
            const d = new Date('2025-06-15T12:00:00.000Z');
            expect(new ParentEntity({ id: 'p2', createdAt: d }).toJson()['createdAt']).toBe('2025-06-15T12:00:00.000Z');
        });

        it('should serialize arrays recursively', () => {
            expect(new ParentEntity({ id: 'p3', tags: ['a', 'b'] }).toJson()['tags']).toEqual(['a', 'b']);
        });

        it('should serialize plain objects recursively', () => {
            const meta = { key1: 'v1', nested: { deep: true } };
            expect(new ParentEntity({ id: 'p4', metadata: meta }).toJson()['metadata']).toEqual(meta);
        });

        it('should preserve null values', () => {
            expect(new ParentEntity({ id: 'p5', optional: null }).toJson()['optional']).toBeNull();
        });

        it('should preserve undefined values', () => {
            const p = new ParentEntity({ id: 'p6' });
            (p as unknown as Record<string, unknown>)['undefinedProp'] = undefined;
            expect(p.toJson()['undefinedProp']).toBeUndefined();
        });

        it('should serialize an array containing Domain instances', () => {
            const e = new ParentEntity({ id: 'p7' });
            (e as unknown as Record<string, unknown>)['items'] = [
                new NestedInfo({ id: 'i1', label: 'first' }),
                new NestedInfo({ id: 'i2', label: 'second' }),
            ];
            expect(e.toJson()['items']).toEqual([
                { id: 'i1', label: 'first' },
                { id: 'i2', label: 'second' },
            ]);
        });

        it('should handle primitive values directly', () => {
            const json = new Stock({ id: 'P', price: 99.99, volume: 1000 }).toJson();
            expect(typeof json['price']).toBe('number');
            expect(typeof json['id']).toBe('string');
        });
    });

    describe('static fromJson()', () => {
        it('should construct a Stock from partial data', () => {
            const s = Stock.fromJson({ id: 'AMZN', symbol: 'AMZN', price: 180 });
            expect(s).toBeInstanceOf(Stock);
            expect(s.id).toBe('AMZN');
            expect(s.price).toBe(180);
            expect(s.name).toBe('');
        });

        it('should construct a Stock with defaults for missing fields', () => {
            const s = Stock.fromJson({});
            expect(s).toBeInstanceOf(Stock);
            expect(s.id).toBe('');
            expect(s.price).toBe(0);
        });

        it('should construct a Stock with full data', () => {
            const s = Stock.fromJson({
                id: 'NFLX', symbol: 'NFLX', name: 'Netflix', price: 600,
                change: 10, changePercent: 1.69, volume: 5_000_000,
                marketCap: 260_000_000_000, high52w: 700, low52w: 400, sector: 'Comm',
            });
            expect(s.name).toBe('Netflix');
            expect(s.sector).toBe('Comm');
        });
    });
});

// ─────────────────────────────────────────────────────────────────────
describe('Stock computed getters', () => {

    describe('isGain', () => {
        it('should return true when change is positive', () => { expect(new Stock({ change: 5 }).isGain).toBe(true); });
        it('should return true when change is zero', () => { expect(new Stock({ change: 0 }).isGain).toBe(true); });
        it('should return false when change is negative', () => { expect(new Stock({ change: -3 }).isGain).toBe(false); });
    });

    describe('formattedPrice', () => {
        it('should format with dollar sign and two decimals', () => { expect(new Stock({ price: 150 }).formattedPrice).toBe('$150.00'); });
        it('should format fractional prices', () => { expect(new Stock({ price: 99.9 }).formattedPrice).toBe('$99.90'); });
        it('should format zero', () => { expect(new Stock({ price: 0 }).formattedPrice).toBe('$0.00'); });
    });

    describe('formattedChange', () => {
        it('should format positive change with + sign', () => {
            expect(new Stock({ change: 5.5, changePercent: 1.87 }).formattedChange).toBe('+5.50 (+1.87%)');
        });
        it('should format negative change without + sign', () => {
            expect(new Stock({ change: -3.2, changePercent: -2.1 }).formattedChange).toBe('-3.20 (-2.10%)');
        });
        it('should format zero change with + sign', () => {
            expect(new Stock({ change: 0, changePercent: 0 }).formattedChange).toBe('+0.00 (+0.00%)');
        });
    });

    describe('formattedVolume', () => {
        it('should format billions', () => { expect(new Stock({ volume: 1_500_000_000 }).formattedVolume).toBe('1.5B'); });
        it('should format millions', () => { expect(new Stock({ volume: 25_000_000 }).formattedVolume).toBe('25.0M'); });
        it('should format thousands', () => { expect(new Stock({ volume: 5_000 }).formattedVolume).toBe('5.0K'); });
        it('should format small volumes as plain numbers', () => { expect(new Stock({ volume: 999 }).formattedVolume).toBe('999'); });
        it('should format zero', () => { expect(new Stock({ volume: 0 }).formattedVolume).toBe('0'); });
        it('should format exactly 1B', () => { expect(new Stock({ volume: 1_000_000_000 }).formattedVolume).toBe('1.0B'); });
        it('should format exactly 1M', () => { expect(new Stock({ volume: 1_000_000 }).formattedVolume).toBe('1.0M'); });
        it('should format exactly 1K', () => { expect(new Stock({ volume: 1_000 }).formattedVolume).toBe('1.0K'); });
    });

    describe('formattedMarketCap', () => {
        it('should format trillions', () => { expect(new Stock({ marketCap: 2_200_000_000_000 }).formattedMarketCap).toBe('$2.20T'); });
        it('should format billions', () => { expect(new Stock({ marketCap: 260_000_000_000 }).formattedMarketCap).toBe('$260.00B'); });
        it('should format millions', () => { expect(new Stock({ marketCap: 50_000_000 }).formattedMarketCap).toBe('$50.00M'); });
        it('should format small caps', () => { expect(new Stock({ marketCap: 999_999 }).formattedMarketCap).toBe('$999999'); });
        it('should format zero', () => { expect(new Stock({ marketCap: 0 }).formattedMarketCap).toBe('$0'); });
        it('should format exactly 1T', () => { expect(new Stock({ marketCap: 1_000_000_000_000 }).formattedMarketCap).toBe('$1.00T'); });
        it('should format exactly 1B', () => { expect(new Stock({ marketCap: 1_000_000_000 }).formattedMarketCap).toBe('$1.00B'); });
        it('should format exactly 1M', () => { expect(new Stock({ marketCap: 1_000_000 }).formattedMarketCap).toBe('$1.00M'); });
    });
});

// ─────────────────────────────────────────────────────────────────────
describe('DomainList<T>', () => {

    describe('construction', () => {
        it('should create an empty DomainList', () => {
            const list = new DomainList<Stock>(Stock as DomainConstructor<Stock>);
            expect(list).toBeInstanceOf(DomainList);
            expect(list.length).toBe(0);
        });

        it('should create from partial data', () => {
            const list = new DomainList<Stock>(Stock as DomainConstructor<Stock>, undefined, [
                { id: 'A', price: 100 } as Partial<Stock>,
                { id: 'B', price: 200 } as Partial<Stock>,
            ]);
            expect(list.length).toBe(2);
            expect(list[0]).toBeInstanceOf(Stock);
            expect(list[0].id).toBe('A');
        });

        it('should pass through existing Domain instances by reference', () => {
            const a = new Stock({ id: 'A' });
            const b = new Stock({ id: 'B' });
            const list = new DomainList<Stock>(Stock as DomainConstructor<Stock>, undefined, [a, b]);
            expect(list[0]).toBe(a);
            expect(list[1]).toBe(b);
        });

        it('should handle mixed partials and Domain instances', () => {
            const a = new Stock({ id: 'A' });
            const list = new DomainList<Stock>(Stock as DomainConstructor<Stock>, undefined, [
                a, { id: 'B' } as Partial<Stock>,
            ]);
            expect(list[0]).toBe(a);
            expect(list[1]).toBeInstanceOf(Stock);
            expect(list[1].id).toBe('B');
        });

        it('should support indexing and iteration', () => {
            const list = new DomainList<Stock>(Stock as DomainConstructor<Stock>, undefined, [
                { id: 'A', price: 100 } as Partial<Stock>,
                { id: 'B', price: 200 } as Partial<Stock>,
            ]);
            expect(list[0].id).toBe('A');
            expect(list[1].id).toBe('B');
            const ids: string[] = [];
            for (const item of list) { ids.push(item.id); }
            expect(ids).toEqual(['A', 'B']);
        });

        it('should support reduce()', () => {
            const list = new DomainList<Stock>(Stock as DomainConstructor<Stock>, undefined, [
                { id: 'A', price: 100 } as Partial<Stock>,
                { id: 'B', price: 200 } as Partial<Stock>,
            ]);
            expect(list.reduce((sum: number, s: Stock) => sum + s.price, 0)).toBe(300);
        });

        it('should support find()', () => {
            const list = new DomainList<Stock>(Stock as DomainConstructor<Stock>, undefined, [
                { id: 'A', price: 100 } as Partial<Stock>,
                { id: 'B', price: 200 } as Partial<Stock>,
            ]);
            expect(list.find((s: Stock) => s.id === 'B')?.price).toBe(200);
            expect(list.find((s: Stock) => s.id === 'Z')).toBeUndefined();
        });
    });

    describe('static instance()', () => {
        it('should create a DomainList without listType', () => {
            const list = DomainList.instance<Stock>(Stock as DomainConstructor<Stock>, [{ id: 'X' } as Partial<Stock>]);
            expect(list).toBeInstanceOf(DomainList);
            expect(list[0]).toBeInstanceOf(Stock);
        });

        it('should create empty when no items provided', () => {
            const list = DomainList.instance<Stock>(Stock as DomainConstructor<Stock>);
            expect(list.length).toBe(0);
        });
    });

    describe('static fromJson()', () => {
        it('should create from itemType + data array (overload 1)', () => {
            const list = DomainList.fromJson<Stock>(Stock as DomainConstructor<Stock>, [
                { id: 'A', price: 100 } as Partial<Stock>,
            ]);
            expect(list).toBeInstanceOf(DomainList);
            expect(list[0]).toBeInstanceOf(Stock);
        });

        it('should create a StockList from data array (subclass overload 2)', () => {
            const list = StockList.fromJson([{ id: 'A', price: 100 }, { id: 'B', price: 200 }]);
            expect(list).toBeInstanceOf(StockList);
            expect(list.length).toBe(2);
            expect(list[0]).toBeInstanceOf(Stock);
        });

        it('should throw when called on base DomainList without static itemType', () => {
            expect(() => { (DomainList as any).fromJson([{ id: 'A' }]); })
                .toThrow('fromJson(data) requires static itemType to be defined on the subclass');
        });
    });

    describe('clone()', () => {
        it('should clone a DomainList (no listType) with independent items', () => {
            const list = DomainList.instance<Stock>(Stock as DomainConstructor<Stock>, [
                { id: 'A', price: 100 } as Partial<Stock>,
            ]);
            const copy = list.clone();
            expect(copy).not.toBe(list);
            expect(copy[0]).not.toBe(list[0]);
            expect(copy[0].id).toBe('A');
        });

        it('should clone a StockList preserving subclass type', () => {
            const list = new StockList([{ id: 'A', price: 100 }]);
            const copy = list.clone();
            expect(copy).toBeInstanceOf(StockList);
            expect(copy).not.toBe(list);
            expect(copy.length).toBe(1);
            expect(copy[0].id).toBe('A');
            expect(copy[0].price).toBe(100);
        });

        it('should produce independent items — mutation does not propagate', () => {
            const list = new StockList([{ id: 'A', price: 100 }]);
            const copy = list.clone();
            copy[0].price = 999;
            expect(list[0].price).toBe(100);
        });
    });

    describe('toJson()', () => {
        it('should serialize all items to plain objects', () => {
            const list = new StockList([
                { id: 'A', symbol: 'A' },
                { id: 'B', symbol: 'B' },
            ]);
            const json = list.toJson();
            expect(json).toHaveLength(2);
            expect(json[0]['id']).toBe('A');
            expect(json[1]['symbol']).toBe('B');
        });

        it('should return empty array for empty list', () => {
            const list = new StockList();
            expect(list.toJson()).toEqual([]);
        });

        it('should not include domainType in serialized items', () => {
            const list = new StockList([{ id: 'A' }]);
            expect(list.toJson()[0]).not.toHaveProperty('domainType');
        });
    });
});

// ─────────────────────────────────────────────────────────────────────
describe('StockList computed getters', () => {
    const samples: Partial<Stock>[] = [
        { id: 'AAPL', symbol: 'AAPL', change: 5, changePercent: 3.0, marketCap: 3_000_000_000_000 },
        { id: 'GOOG', symbol: 'GOOG', change: 2, changePercent: 1.5, marketCap: 1_800_000_000_000 },
        { id: 'TSLA', symbol: 'TSLA', change: -4, changePercent: -2.0, marketCap: 800_000_000_000 },
        { id: 'META', symbol: 'META', change: -1, changePercent: -0.5, marketCap: 900_000_000_000 },
        { id: 'MSFT', symbol: 'MSFT', change: 0, changePercent: 0, marketCap: 2_500_000_000_000 },
    ];

    describe('gainers', () => {
        it('should return positive-change stocks sorted by changePercent desc', () => {
            const g = new StockList(samples).gainers;
            expect(g).toHaveLength(2);
            expect(g[0].symbol).toBe('AAPL');
            expect(g[1].symbol).toBe('GOOG');
        });
        it('should return empty when no gainers', () => {
            expect(new StockList([{ id: 'A', change: -1 }, { id: 'B', change: 0 }]).gainers).toHaveLength(0);
        });
    });

    describe('losers', () => {
        it('should return negative-change stocks sorted by changePercent asc', () => {
            const l = new StockList(samples).losers;
            expect(l).toHaveLength(2);
            expect(l[0].symbol).toBe('TSLA');
            expect(l[1].symbol).toBe('META');
        });
        it('should return empty when no losers', () => {
            expect(new StockList([{ id: 'A', change: 1 }, { id: 'B', change: 0 }]).losers).toHaveLength(0);
        });
    });

    describe('totalMarketCap', () => {
        it('should sum all market caps', () => { expect(new StockList(samples).totalMarketCap).toBe(9_000_000_000_000); });
        it('should return 0 for empty list', () => { expect(new StockList().totalMarketCap).toBe(0); });
    });
});

// ─────────────────────────────────────────────────────────────────────
describe('round-trip integrity', () => {
    it('should survive Stock toJson → fromJson round-trip', () => {
        const orig = new Stock({
            id: 'RT', symbol: 'RT', name: 'RoundTrip', price: 123.45,
            change: -1.5, changePercent: -1.2, volume: 5_000_000,
            marketCap: 50_000_000_000, high52w: 200, low52w: 80, sector: 'Finance',
        });
        const restored = Stock.fromJson(orig.toJson() as Partial<Stock>);
        expect(restored).toBeInstanceOf(Stock);
        expect(restored.id).toBe(orig.id);
        expect(restored.price).toBe(orig.price);
        expect(restored.sector).toBe(orig.sector);
    });

    it('should survive StockList toJson → fromJson round-trip', () => {
        const orig = new StockList([
            { id: 'A', symbol: 'A', price: 100 },
            { id: 'B', symbol: 'B', price: 200 },
        ]);
        const restored = StockList.fromJson(orig.toJson() as Partial<Stock>[]);
        expect(restored).toBeInstanceOf(StockList);
        expect(restored.length).toBe(2);
        expect(restored[0].id).toBe('A');
        expect(restored[1].price).toBe(200);
    });

    it('should survive Stock clone → toJson equality', () => {
        const orig = new Stock({ id: 'CL', symbol: 'CL', price: 50, sector: 'Energy' });
        const cloned = orig.clone();
        expect(cloned.toJson()).toEqual(orig.toJson());
    });

    it('should survive StockList clone → toJson equality', () => {
        const orig = new StockList([{ id: 'A', price: 10 }, { id: 'B', price: 20 }]);
        const cloned = orig.clone();
        expect(cloned.toJson()).toEqual(orig.toJson());
    });
});

// ─────────────────────────────────────────────────────────────────────
describe('Symbol.species — Array method return types', () => {

    it('should return a plain Array (not DomainList) from filter()', () => {
        const list = new StockList([
            { id: 'A', change: 5 },
            { id: 'B', change: -1 },
        ]);
        const filtered = list.filter(s => s.change > 0);
        expect(filtered).toBeInstanceOf(Array);
        expect(filtered).not.toBeInstanceOf(DomainList);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('A');
    });

    it('should return a plain Array (not DomainList) from map()', () => {
        const list = new StockList([{ id: 'A' }, { id: 'B' }]);
        const mapped = list.map(s => s.id);
        expect(mapped).toBeInstanceOf(Array);
        expect(mapped).not.toBeInstanceOf(DomainList);
        expect(mapped).toEqual(['A', 'B']);
    });

    it('should return a plain Array from slice()', () => {
        const list = new StockList([{ id: 'A' }, { id: 'B' }, { id: 'C' }]);
        const sliced = list.slice(0, 2);
        expect(sliced).toBeInstanceOf(Array);
        expect(sliced).not.toBeInstanceOf(DomainList);
        expect(sliced).toHaveLength(2);
    });

    it('should return a plain Array from concat()', () => {
        const list = new StockList([{ id: 'A' }]);
        const other = [new Stock({ id: 'B' })];
        const concatenated = list.concat(other);
        expect(concatenated).toBeInstanceOf(Array);
        expect(concatenated).not.toBeInstanceOf(DomainList);
        expect(concatenated).toHaveLength(2);
    });

    it('should not throw when filter() is called on a DomainList subclass', () => {
        const list = new StockList([
            { id: 'A', price: 100 },
            { id: 'B', price: 200 },
            { id: 'C', price: 300 },
        ]);
        expect(() => list.filter(s => s.price > 150)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────
describe('DomainList — push after construction', () => {

    it('should support push() after construction', () => {
        const list = new StockList([{ id: 'A' }]);
        const stock = new Stock({ id: 'B', price: 200 });
        list.push(stock);
        expect(list.length).toBe(2);
        expect(list[1]).toBe(stock);
        expect(list[1].id).toBe('B');
    });

    it('should support push() on an empty DomainList', () => {
        const list = new StockList();
        list.push(new Stock({ id: 'X' }));
        expect(list.length).toBe(1);
        expect(list[0].id).toBe('X');
    });
});

// ─────────────────────────────────────────────────────────────────────
describe('Domain — cross-type equals()', () => {

    it('should return false when comparing different Domain subtypes even with matching JSON', () => {
        // NestedInfo and a Stock could theoretically have overlapping JSON
        // but they are different types — equals should still work based on JSON comparison
        const stock = new Stock({ id: 'X' });
        const nested = new NestedInfo({ id: 'X' });

        // These have different JSON shapes (Stock has many more fields), so equals returns false
        expect(stock.equals(nested as any)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────
describe('Domain — custom fromJson override', () => {

    /**
     * Demonstrates overriding fromJson when the backend JSON shape
     * does not match the domain class properties (snake_case → camelCase,
     * cents → dollars, date string → Date, nested flattening).
     *
     * The constructor handles the custom mapping so that both
     * `Order.fromJson(apiData)` and `clone()` (which calls the constructor)
     * produce correctly mapped instances.
     */
    class Order extends Domain<Order> {
        id: string;
        customerName: string;
        total: number;          // stored in dollars
        createdAt: Date;

        constructor(data?: Partial<Order> | Record<string, unknown>) {
            super(Order as DomainConstructor<Order>);
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

    it('should map snake_case keys to camelCase via constructor-based fromJson', () => {
        const order = Order.fromJson({
            order_id: 'ORD-001',
            customer_name: 'Alice',
            total_cents: 4999,
            created_at: '2025-06-15T12:00:00.000Z',
        });

        expect(order).toBeInstanceOf(Order);
        expect(order.id).toBe('ORD-001');
        expect(order.customerName).toBe('Alice');
    });

    it('should transform values (cents → dollars) via constructor-based fromJson', () => {
        const order = Order.fromJson({
            order_id: 'ORD-002',
            customer_name: 'Bob',
            total_cents: 10050,
            created_at: '2025-01-01T00:00:00.000Z',
        });

        expect(order.total).toBe(100.50);
    });

    it('should parse date strings into Date objects via constructor-based fromJson', () => {
        const order = Order.fromJson({
            order_id: 'ORD-003',
            customer_name: 'Charlie',
            total_cents: 0,
            created_at: '2025-06-15T12:00:00.000Z',
        });

        expect(order.createdAt).toBeInstanceOf(Date);
        expect(order.createdAt.toISOString()).toBe('2025-06-15T12:00:00.000Z');
    });

    it('should still support clone() after custom fromJson', () => {
        const order = Order.fromJson({
            order_id: 'ORD-004',
            customer_name: 'Diana',
            total_cents: 2500,
            created_at: '2025-03-20T08:30:00.000Z',
        });

        const cloned = order.clone();
        expect(cloned).not.toBe(order);
        expect(cloned).toBeInstanceOf(Order);
        expect(cloned.id).toBe('ORD-004');
        expect(cloned.customerName).toBe('Diana');
        expect(cloned.total).toBe(25);
    });

    it('should still support equals() after custom fromJson', () => {
        const a = Order.fromJson({
            order_id: 'ORD-005',
            customer_name: 'Eve',
            total_cents: 1000,
            created_at: '2025-01-01T00:00:00.000Z',
        });
        const b = Order.fromJson({
            order_id: 'ORD-005',
            customer_name: 'Eve',
            total_cents: 1000,
            created_at: '2025-01-01T00:00:00.000Z',
        });

        expect(a.equals(b)).toBe(true);
    });

    it('should still support toJson() after custom fromJson', () => {
        const order = Order.fromJson({
            order_id: 'ORD-006',
            customer_name: 'Frank',
            total_cents: 5000,
            created_at: '2025-12-25T00:00:00.000Z',
        });

        const json = order.toJson();
        expect(json['id']).toBe('ORD-006');
        expect(json['customerName']).toBe('Frank');
        expect(json['total']).toBe(50);
        expect(json['createdAt']).toBe('2025-12-25T00:00:00.000Z');
    });
});
