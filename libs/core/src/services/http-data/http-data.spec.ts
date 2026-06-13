import { TestBed } from '@angular/core/testing';
import { Injector, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HttpData, DataOptions, MutationOptions, GetOptions } from './http-data';

interface TestItem {
    id: number;
    name: string;
}

describe('HttpData', () => {
    let injector: Injector;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        injector = TestBed.inject(Injector);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    function createHttpData<T, TBody = unknown>(
        options: DataOptions<T, TBody>,
    ): HttpData<T, TBody> {
        return new HttpData<T, TBody>(injector, options);
    }

    /** Stabilize: flush all pending effects and microtasks */
    async function stabilize(): Promise<void> {
        TestBed.tick();
        await Promise.resolve();
        TestBed.tick();
        await Promise.resolve();
        TestBed.tick();
    }

    /** Load, stabilize, flush the HTTP response, and stabilize again */
    async function loadAndFlush<T>(data: HttpData<T>, url: string, response: Object | null, opts?: { status?: number; statusText?: string; headers?: Record<string, string> }): Promise<void> {
        data.load();
        await stabilize();
        const reqs = httpTesting.match(url);
        reqs.forEach(req => req.flush(response, opts));
        await stabilize();
    }

    // ---------------------------------------------------------------------------
    // Construction & lazy initialization
    // ---------------------------------------------------------------------------
    describe('construction and lazy initialization', () => {
        it('should create an instance', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data).toBeTruthy();
        });

        it('should not create the underlying resource on construction', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.resource).toBeNull();
        });

        it('should report isLoaded as false before load()', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.isLoaded()).toBe(false);
        });

        it('should report isLoaded as true after load()', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            expect(data.isLoaded()).toBe(true);
            await stabilize();
            httpTesting.match('/api/items/1').forEach(req => req.flush({}));
        });
    });

    // ---------------------------------------------------------------------------
    // Default state before load
    // ---------------------------------------------------------------------------
    describe('default state before load', () => {
        it('should return undefined value when no defaultValue is set', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.value()).toBeUndefined();
        });

        it('should return defaultValue when one is provided', () => {
            const defaultItem: TestItem = { id: 0, name: 'default' };
            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                defaultValue: defaultItem,
            });
            expect(data.value()).toEqual(defaultItem);
        });

        it('should report idle status before load', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.status()).toBe('idle');
            expect(data.isIdle()).toBe(true);
        });

        it('should report not loading before load', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.isLoading()).toBe(false);
            expect(data.isReloading()).toBe(false);
            expect(data.isPending()).toBe(false);
        });

        it('should report not success/error before load', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.isSuccess()).toBe(false);
            expect(data.isError()).toBe(false);
            expect(data.isLocal()).toBe(false);
        });

        it('should report no error before load', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.error()).toBeUndefined();
        });

        it('should report hasValue as false when no defaultValue', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.hasValue()).toBe(false);
        });

        it('should report hasValue as true when defaultValue is provided', () => {
            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                defaultValue: { id: 0, name: 'default' },
            });
            expect(data.hasValue()).toBe(true);
        });

        it('should return undefined headers before load', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.headers()).toBeUndefined();
        });

        it('should return undefined statusCode before load', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.statusCode()).toBeUndefined();
        });

        it('should return undefined progress before load', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.progress()).toBeUndefined();
        });
    });

    // ---------------------------------------------------------------------------
    // load()
    // ---------------------------------------------------------------------------
    describe('load()', () => {
        it('should create the resource on first load', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            expect(data.resource).not.toBeNull();
            await stabilize();
            httpTesting.match('/api/items/1').forEach(req => req.flush({}));
        });

        it('should make a GET request by default', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            await stabilize();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.method).toBe('GET');
            reqs.forEach(req => req.flush({ id: 1, name: 'test' }));
        });

        it('should resolve with the response data', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'Alpha' });

            expect(data.value()).toEqual({ id: 1, name: 'Alpha' });
            expect(data.isSuccess()).toBe(true);
            expect(data.status()).toBe('resolved');
        });

        it('should set error state on HTTP failure', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            await stabilize();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush('Not Found', { status: 404, statusText: 'Not Found' }));
            await stabilize();

            expect(data.isError()).toBe(true);
            expect(data.status()).toBe('error');
            expect(data.error()).toBeDefined();
        });

        it('should reload on subsequent load() calls', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'first' });

            expect(data.value()).toEqual({ id: 1, name: 'first' });

            // Second load should trigger reload
            data.load();
            await stabilize();
            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush({ id: 1, name: 'second' }));
            await stabilize();

            expect(data.value()).toEqual({ id: 1, name: 'second' });
        });
    });

    // ---------------------------------------------------------------------------
    // reload()
    // ---------------------------------------------------------------------------
    describe('reload()', () => {
        it('should be a no-op when resource has not been loaded', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.reload();
            expect(data.resource).toBeNull();
            expect(data.isLoaded()).toBe(false);
        });

        it('should reload an already loaded resource', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'first' });

            data.reload();
            await stabilize();
            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush({ id: 1, name: 'reloaded' }));
            await stabilize();

            expect(data.value()).toEqual({ id: 1, name: 'reloaded' });
        });
    });

    // ---------------------------------------------------------------------------
    // HTTP methods
    // ---------------------------------------------------------------------------
    describe('HTTP methods', () => {
        it('should use POST method when specified', async () => {
            const data = createHttpData<TestItem, { name: string }>({
                url: '/api/items',
                method: 'POST',
                body: { name: 'new item' },
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match('/api/items');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.method).toBe('POST');
            expect(reqs[0].request.body).toEqual({ name: 'new item' });
            reqs.forEach(req => req.flush({ id: 2, name: 'new item' }));
        });

        it('should use PUT method when specified', async () => {
            const data = createHttpData<TestItem, TestItem>({
                url: '/api/items/1',
                method: 'PUT',
                body: { id: 1, name: 'updated' },
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.method).toBe('PUT');
            reqs.forEach(req => req.flush({ id: 1, name: 'updated' }));
        });

        it('should use PATCH method when specified', async () => {
            const data = createHttpData<TestItem, Partial<TestItem>>({
                url: '/api/items/1',
                method: 'PATCH',
                body: { name: 'patched' },
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.method).toBe('PATCH');
            reqs.forEach(req => req.flush({ id: 1, name: 'patched' }));
        });

        it('should use DELETE method when specified', async () => {
            const data = createHttpData<void>({
                url: '/api/items/1',
                method: 'DELETE',
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.method).toBe('DELETE');
            reqs.forEach(req => req.flush(null));
        });
    });

    // ---------------------------------------------------------------------------
    // URL as function
    // ---------------------------------------------------------------------------
    describe('URL as function', () => {
        it('should support a function-based URL', async () => {
            const id = signal(1);
            const data = createHttpData<TestItem>({
                url: () => `/api/items/${id()}`,
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match(r => r.url.startsWith('/api/items/'));
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.url).toBe('/api/items/1');
            reqs.forEach(req => req.flush({ id: 1, name: 'item 1' }));
        });
    });

    // ---------------------------------------------------------------------------
    // Body as function
    // ---------------------------------------------------------------------------
    describe('body as function', () => {
        it('should support a function-based body', async () => {
            const bodyData = signal({ name: 'dynamic' });
            const data = createHttpData<TestItem, { name: string }>({
                url: '/api/items',
                method: 'POST',
                body: () => bodyData(),
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match('/api/items');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.body).toEqual({ name: 'dynamic' });
            reqs.forEach(req => req.flush({ id: 1, name: 'dynamic' }));
        });
    });

    // ---------------------------------------------------------------------------
    // Headers
    // ---------------------------------------------------------------------------
    describe('headers', () => {
        it('should send custom headers', async () => {
            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                headers: { 'X-Custom': 'test-value' },
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.headers.get('X-Custom')).toBe('test-value');
            reqs.forEach(req => req.flush({ id: 1, name: 'test' }));
        });

        it('should expose response headers after load', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            await stabilize();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush(
                { id: 1, name: 'test' },
                { headers: { 'X-Total-Count': '42' } },
            ));
            await stabilize();

            expect(data.headers()).toBeDefined();
            expect(data.headers()?.get('X-Total-Count')).toBe('42');
        });
    });

    // ---------------------------------------------------------------------------
    // Params
    // ---------------------------------------------------------------------------
    describe('params', () => {
        it('should convert number params to strings', async () => {
            const data = createHttpData<TestItem[]>({
                url: '/api/items',
                params: { page: 1, limit: 10 },
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match(r => r.url === '/api/items');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.params.get('page')).toBe('1');
            expect(reqs[0].request.params.get('limit')).toBe('10');
            reqs.forEach(req => req.flush([]));
        });

        it('should convert boolean params to strings', async () => {
            const data = createHttpData<TestItem[]>({
                url: '/api/items',
                params: { active: true },
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match(r => r.url === '/api/items');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.params.get('active')).toBe('true');
            reqs.forEach(req => req.flush([]));
        });

        it('should pass string params as-is', async () => {
            const data = createHttpData<TestItem[]>({
                url: '/api/items',
                params: { search: 'hello' },
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match(r => r.url === '/api/items');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.params.get('search')).toBe('hello');
            reqs.forEach(req => req.flush([]));
        });

        it('should handle array params', async () => {
            const data = createHttpData<TestItem[]>({
                url: '/api/items',
                params: { ids: [1, 2, 3] },
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match(r => r.url === '/api/items');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.params.getAll('ids')).toEqual(['1', '2', '3']);
            reqs.forEach(req => req.flush([]));
        });
    });

    // ---------------------------------------------------------------------------
    // parse option
    // ---------------------------------------------------------------------------
    describe('parse option', () => {
        it('should transform response data using parse function', async () => {
            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                parse: (raw: unknown) => {
                    const r = raw as { item_id: number; item_name: string };
                    return { id: r.item_id, name: r.item_name };
                },
            });
            data.load();
            await stabilize();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush({ item_id: 1, item_name: 'parsed' }));
            await stabilize();

            expect(data.value()).toEqual({ id: 1, name: 'parsed' });
        });
    });

    // ---------------------------------------------------------------------------
    // set()
    // ---------------------------------------------------------------------------
    describe('set()', () => {
        it('should create the resource if not loaded and set the value', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.resource).toBeNull();

            data.set({ id: 99, name: 'local' });

            expect(data.resource).not.toBeNull();
            expect(data.isLoaded()).toBe(true);

            // Clean up any pending requests from resource creation
            await stabilize();
            httpTesting.match('/api/items/1').forEach(req => req.flush({}));
        });

        it('should set value on an already loaded resource', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'original' });

            data.set({ id: 1, name: 'overridden' });
            await stabilize();

            expect(data.value()).toEqual({ id: 1, name: 'overridden' });
            expect(data.isLocal()).toBe(true);
            expect(data.status()).toBe('local');
        });
    });

    // ---------------------------------------------------------------------------
    // update()
    // ---------------------------------------------------------------------------
    describe('update()', () => {
        it('should create the resource if not loaded and update the value', async () => {
            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                defaultValue: { id: 0, name: 'default' },
            });
            expect(data.resource).toBeNull();

            data.update(current => current ? { ...current, name: 'updated' } : { id: 0, name: 'updated' });

            expect(data.resource).not.toBeNull();
            // Clean up
            await stabilize();
            httpTesting.match('/api/items/1').forEach(req => req.flush({}));
        });

        it('should update value on an already loaded resource', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'original' });

            data.update(current => current ? { ...current, name: 'modified' } : undefined);
            await stabilize();

            expect(data.value()).toEqual({ id: 1, name: 'modified' });
            expect(data.isLocal()).toBe(true);
        });
    });

    // ---------------------------------------------------------------------------
    // destroy()
    // ---------------------------------------------------------------------------
    describe('destroy()', () => {
        it('should be a no-op when resource has not been loaded', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(() => data.destroy()).not.toThrow();
            expect(data.resource).toBeNull();
        });

        it('should destroy the resource and reset to null', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'test' });

            expect(data.resource).not.toBeNull();
            expect(data.isLoaded()).toBe(true);

            data.destroy();

            expect(data.resource).toBeNull();
            expect(data.isLoaded()).toBe(false);
            expect(data.isIdle()).toBe(true);
        });

        it('should return to default state after destroy', async () => {
            const defaultItem: TestItem = { id: 0, name: 'default' };
            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                defaultValue: defaultItem,
            });
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'loaded' });

            data.destroy();

            expect(data.value()).toEqual(defaultItem);
            expect(data.isIdle()).toBe(true);
        });
    });

    // ---------------------------------------------------------------------------
    // cancel()
    // ---------------------------------------------------------------------------
    describe('cancel()', () => {
        it('should be a no-op when resource has not been loaded', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(() => data.cancel()).not.toThrow();
            expect(data.resource).toBeNull();
            expect(data.isLoaded()).toBe(false);
        });

        it('should be a no-op when resource is in resolved state', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'test' });

            expect(data.isSuccess()).toBe(true);

            data.cancel();

            // Should still be loaded — cancel is a no-op for non-pending states
            expect(data.resource).not.toBeNull();
            expect(data.isLoaded()).toBe(true);
            expect(data.value()).toEqual({ id: 1, name: 'test' });
        });

        it('should be a no-op when resource is in error state', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            await stabilize();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush('Not Found', { status: 404, statusText: 'Not Found' }));
            await stabilize();

            expect(data.isError()).toBe(true);

            data.cancel();

            // Should still be loaded — cancel is a no-op for non-pending states
            expect(data.resource).not.toBeNull();
            expect(data.isLoaded()).toBe(true);
        });

        it('should be a no-op when resource is in idle state after load', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'test' });

            data.set({ id: 1, name: 'local' });
            await stabilize();

            expect(data.isLocal()).toBe(true);

            data.cancel();

            // Should still be loaded — cancel is a no-op for non-pending states
            expect(data.resource).not.toBeNull();
            expect(data.isLoaded()).toBe(true);
            expect(data.value()).toEqual({ id: 1, name: 'local' });
        });

        it('should cancel a loading request and reset to initial state', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            await stabilize();

            // Verify it is loading
            expect(data.isLoaded()).toBe(true);

            data.cancel();

            // Discard the now-orphaned HTTP request so httpTesting.verify() passes
            httpTesting.match('/api/items/1');

            expect(data.resource).toBeNull();
            expect(data.isLoaded()).toBe(false);
            expect(data.isIdle()).toBe(true);
            expect(data.value()).toBeUndefined();
        });

        it('should return defaultValue after cancelling a loading request', async () => {
            const defaultItem: TestItem = { id: 0, name: 'default' };
            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                defaultValue: defaultItem,
            });
            data.load();
            await stabilize();

            data.cancel();

            // Discard the now-orphaned HTTP request so httpTesting.verify() passes
            httpTesting.match('/api/items/1');

            expect(data.value()).toEqual(defaultItem);
            expect(data.isIdle()).toBe(true);
        });

        it('should allow load() to be called again after cancel()', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });

            // First load
            data.load();
            await stabilize();

            // Cancel before response arrives
            data.cancel();

            // Discard the now-orphaned HTTP request so httpTesting.verify() passes
            httpTesting.match('/api/items/1');

            expect(data.isLoaded()).toBe(false);

            // Load again
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'after-cancel' });

            expect(data.value()).toEqual({ id: 1, name: 'after-cancel' });
            expect(data.isSuccess()).toBe(true);
        });
    });

    // ---------------------------------------------------------------------------
    // map()
    // ---------------------------------------------------------------------------
    describe('map()', () => {
        it('should return undefined when resource has no value', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            const mapped = data.map(item => item.name);
            expect(mapped()).toBeUndefined();
        });

        it('should transform the value when resource has data', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            const mapped = data.map(item => item.name);

            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'Alpha' });

            expect(mapped()).toBe('Alpha');
        });

        it('should reactively update when value changes', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            const mapped = data.map(item => item.name.toUpperCase());

            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'hello' });

            expect(mapped()).toBe('HELLO');

            data.set({ id: 1, name: 'world' });
            await stabilize();

            expect(mapped()).toBe('WORLD');
        });
    });

    // ---------------------------------------------------------------------------
    // getOrDefault()
    // ---------------------------------------------------------------------------
    describe('getOrDefault()', () => {
        it('should return the default when resource has no value', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            const fallback: TestItem = { id: -1, name: 'fallback' };
            const result = data.getOrDefault(fallback);
            expect(result()).toEqual(fallback);
        });

        it('should return the actual value when resource has data', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            const fallback: TestItem = { id: -1, name: 'fallback' };
            const result = data.getOrDefault(fallback);

            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'real' });

            expect(result()).toEqual({ id: 1, name: 'real' });
        });
    });

    // ---------------------------------------------------------------------------
    // statusCode
    // ---------------------------------------------------------------------------
    describe('statusCode', () => {
        it('should expose the HTTP status code after successful response', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            await stabilize();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush(
                { id: 1, name: 'test' },
                { status: 200, statusText: 'OK' },
            ));
            await stabilize();

            expect(data.statusCode()).toBe(200);
        });
    });

    // ---------------------------------------------------------------------------
    // resource getter
    // ---------------------------------------------------------------------------
    describe('resource getter', () => {
        it('should return null before load', () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            expect(data.resource).toBeNull();
        });

        it('should return the HttpResourceRef after load', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            expect(data.resource).not.toBeNull();
            expect(data.resource!.value).toBeDefined();
            expect(data.resource!.status).toBeDefined();
            // Clean up
            await stabilize();
            httpTesting.match('/api/items/1').forEach(req => req.flush({}));
        });
    });

    // ---------------------------------------------------------------------------
    // Full lifecycle
    // ---------------------------------------------------------------------------
    describe('full lifecycle', () => {
        it('should support load → set → reload → destroy cycle', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });

            // 1. Initial state
            expect(data.isIdle()).toBe(true);
            expect(data.isLoaded()).toBe(false);

            // 2. Load
            await loadAndFlush(data, '/api/items/1', { id: 1, name: 'loaded' });

            expect(data.value()).toEqual({ id: 1, name: 'loaded' });
            expect(data.isSuccess()).toBe(true);
            expect(data.isLoaded()).toBe(true);

            // 3. Set local value
            data.set({ id: 1, name: 'local' });
            await stabilize();

            expect(data.value()).toEqual({ id: 1, name: 'local' });
            expect(data.isLocal()).toBe(true);

            // 4. Reload
            data.reload();
            await stabilize();
            httpTesting.match('/api/items/1').forEach(req => req.flush({ id: 1, name: 'reloaded' }));
            await stabilize();

            expect(data.value()).toEqual({ id: 1, name: 'reloaded' });
            expect(data.isSuccess()).toBe(true);

            // 5. Destroy
            data.destroy();
            expect(data.isLoaded()).toBe(false);
            expect(data.isIdle()).toBe(true);
            expect(data.resource).toBeNull();
        });
    });

    // ---------------------------------------------------------------------------
    // Static factory methods
    // ---------------------------------------------------------------------------
    describe('static factory methods', () => {
        describe('HttpData.get()', () => {
            it('should create an HttpData with GET method', async () => {
                const data = HttpData.get<TestItem>(injector, {
                    url: '/api/items/1',
                });
                data.load();
                await stabilize();
                const reqs = httpTesting.match('/api/items/1');
                expect(reqs.length).toBeGreaterThan(0);
                expect(reqs[0].request.method).toBe('GET');
                reqs.forEach(req => req.flush({ id: 1, name: 'fetched' }));
            });

            it('should support all DataOptions except method and body', async () => {
                const data = HttpData.get<TestItem>(injector, {
                    url: '/api/items/1',
                    headers: { 'X-Custom': 'value' },
                    params: { version: 2 },
                    defaultValue: { id: 0, name: 'default' },
                });
                expect(data.value()).toEqual({ id: 0, name: 'default' });
                data.load();
                await stabilize();
                const reqs = httpTesting.match(r => r.url === '/api/items/1');
                expect(reqs[0].request.headers.get('X-Custom')).toBe('value');
                expect(reqs[0].request.params.get('version')).toBe('2');
                reqs.forEach(req => req.flush({ id: 1, name: 'fetched' }));
            });

            it('should support a function-based URL', async () => {
                const id = signal(42);
                const data = HttpData.get<TestItem>(injector, {
                    url: () => `/api/items/${id()}`,
                });
                data.load();
                await stabilize();
                const reqs = httpTesting.match(r => r.url.startsWith('/api/items/'));
                expect(reqs.length).toBeGreaterThan(0);
                expect(reqs[0].request.url).toBe('/api/items/42');
                reqs.forEach(req => req.flush({ id: 42, name: 'item 42' }));
            });

            it('should support parse option', async () => {
                const data = HttpData.get<TestItem>(injector, {
                    url: '/api/items/1',
                    parse: (raw: unknown) => {
                        const r = raw as { item_id: number; item_name: string };
                        return { id: r.item_id, name: r.item_name };
                    },
                });
                data.load();
                await stabilize();
                const reqs = httpTesting.match('/api/items/1');
                reqs.forEach(req => req.flush({ item_id: 1, item_name: 'parsed' }));
                await stabilize();

                expect(data.value()).toEqual({ id: 1, name: 'parsed' });
            });

            it('should support the full lifecycle via get()', async () => {
                const data = HttpData.get<TestItem>(injector, {
                    url: '/api/items/1',
                });

                // Lazy — not loaded yet
                expect(data.isLoaded()).toBe(false);
                expect(data.resource).toBeNull();

                // Load
                data.load();
                await stabilize();
                const reqs = httpTesting.match('/api/items/1');
                reqs.forEach(req => req.flush({ id: 1, name: 'lifecycle test' }));
                await stabilize();

                expect(data.value()).toEqual({ id: 1, name: 'lifecycle test' });
                expect(data.isSuccess()).toBe(true);

                // Set locally
                data.set({ id: 1, name: 'local override' });
                await stabilize();
                expect(data.value()).toEqual({ id: 1, name: 'local override' });
                expect(data.isLocal()).toBe(true);

                // Destroy
                data.destroy();
                expect(data.isLoaded()).toBe(false);
                expect(data.resource).toBeNull();
            });
        });

        describe('HttpData.post()', () => {
            it('should create an HttpData with POST method', async () => {
                const data = HttpData.post<TestItem, { name: string }>(injector, {
                    url: '/api/items',
                    body: { name: 'new item' },
                });
                data.load();
                await stabilize();
                const reqs = httpTesting.match('/api/items');
                expect(reqs.length).toBeGreaterThan(0);
                expect(reqs[0].request.method).toBe('POST');
                expect(reqs[0].request.body).toEqual({ name: 'new item' });
                reqs.forEach(req => req.flush({ id: 1, name: 'new item' }));
            });

            it('should support all DataOptions except method', async () => {
                const data = HttpData.post<TestItem, { name: string }>(injector, {
                    url: '/api/items',
                    body: { name: 'test' },
                    headers: { 'X-Custom': 'value' },
                    params: { version: 2 },
                    defaultValue: { id: 0, name: 'default' },
                });
                expect(data.value()).toEqual({ id: 0, name: 'default' });
                data.load();
                await stabilize();
                const reqs = httpTesting.match(r => r.url === '/api/items');
                expect(reqs[0].request.headers.get('X-Custom')).toBe('value');
                expect(reqs[0].request.params.get('version')).toBe('2');
                reqs.forEach(req => req.flush({ id: 1, name: 'created' }));
            });

            it('should support function-based body', async () => {
                const bodySignal = signal({ name: 'dynamic' });
                const data = HttpData.post<TestItem, { name: string }>(injector, {
                    url: '/api/items',
                    body: () => bodySignal(),
                });
                data.load();
                await stabilize();
                const reqs = httpTesting.match('/api/items');
                expect(reqs[0].request.body).toEqual({ name: 'dynamic' });
                reqs.forEach(req => req.flush({ id: 1, name: 'dynamic' }));
            });
        });

        describe('HttpData.put()', () => {
            it('should create an HttpData with PUT method', async () => {
                const data = HttpData.put<TestItem, TestItem>(injector, {
                    url: '/api/items/1',
                    body: { id: 1, name: 'updated' },
                });
                data.load();
                await stabilize();
                const reqs = httpTesting.match('/api/items/1');
                expect(reqs.length).toBeGreaterThan(0);
                expect(reqs[0].request.method).toBe('PUT');
                expect(reqs[0].request.body).toEqual({ id: 1, name: 'updated' });
                reqs.forEach(req => req.flush({ id: 1, name: 'updated' }));
            });
        });

        describe('HttpData.patch()', () => {
            it('should create an HttpData with PATCH method', async () => {
                const data = HttpData.patch<TestItem, Partial<TestItem>>(injector, {
                    url: '/api/items/1',
                    body: { name: 'patched' },
                });
                data.load();
                await stabilize();
                const reqs = httpTesting.match('/api/items/1');
                expect(reqs.length).toBeGreaterThan(0);
                expect(reqs[0].request.method).toBe('PATCH');
                expect(reqs[0].request.body).toEqual({ name: 'patched' });
                reqs.forEach(req => req.flush({ id: 1, name: 'patched' }));
            });
        });

        describe('factory methods produce fully functional HttpData', () => {
            it('should support the full lifecycle via post()', async () => {
                const data = HttpData.post<TestItem, { name: string }>(injector, {
                    url: '/api/items',
                    body: { name: 'lifecycle test' },
                });

                // Lazy — not loaded yet
                expect(data.isLoaded()).toBe(false);
                expect(data.resource).toBeNull();

                // Load
                data.load();
                await stabilize();
                const reqs = httpTesting.match('/api/items');
                reqs.forEach(req => req.flush({ id: 1, name: 'lifecycle test' }));
                await stabilize();

                expect(data.value()).toEqual({ id: 1, name: 'lifecycle test' });
                expect(data.isSuccess()).toBe(true);

                // Set locally
                data.set({ id: 1, name: 'local override' });
                await stabilize();
                expect(data.value()).toEqual({ id: 1, name: 'local override' });
                expect(data.isLocal()).toBe(true);

                // Destroy
                data.destroy();
                expect(data.isLoaded()).toBe(false);
                expect(data.resource).toBeNull();
            });
        });
    });

    // ---------------------------------------------------------------------------
    // delay option
    // ---------------------------------------------------------------------------
    describe('delay option', () => {
        it('should set status to loading immediately when delay is specified', () => {
            vi.useFakeTimers();

            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                delay: 500,
            });

            data.load();

            expect(data.status()).toBe('loading');
            expect(data.isLoading()).toBe(true);
            // Resource should NOT be created yet (still in delay period)
            expect(data.resource).toBeNull();

            // Clean up: cancel to clear the pending timer
            data.cancel();

            vi.useRealTimers();
        });

        it('should create the resource after the delay expires', async () => {
            vi.useFakeTimers();

            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                delay: 300,
            });

            data.load();

            // Before delay expires
            expect(data.resource).toBeNull();
            expect(data.isLoading()).toBe(true);

            // Advance past the delay
            vi.advanceTimersByTime(300);

            // Resource should now be created
            expect(data.resource).not.toBeNull();
            expect(data.isLoaded()).toBe(true);

            // Clean up
            await stabilize();
            httpTesting.match('/api/items/1').forEach(req => req.flush({}));

            vi.useRealTimers();
        });

        it('should clear the delay timer when cancel() is called during delay', () => {
            vi.useFakeTimers();

            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                delay: 500,
            });

            data.load();
            expect(data.isLoading()).toBe(true);
            expect(data.resource).toBeNull();

            // Cancel during the delay period
            data.cancel();

            expect(data.status()).toBe('idle');
            expect(data.isIdle()).toBe(true);
            expect(data.resource).toBeNull();

            // Advancing time should NOT create the resource
            vi.advanceTimersByTime(500);
            expect(data.resource).toBeNull();

            vi.useRealTimers();
        });

        it('should clear the delay timer when destroy() is called during delay', () => {
            vi.useFakeTimers();

            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                delay: 500,
            });

            data.load();
            expect(data.isLoading()).toBe(true);

            // Destroy during the delay period
            data.destroy();

            expect(data.status()).toBe('idle');
            expect(data.resource).toBeNull();

            // Advancing time should NOT create the resource
            vi.advanceTimersByTime(500);
            expect(data.resource).toBeNull();

            vi.useRealTimers();
        });

        it('should not use delay on subsequent load() calls (reload path)', async () => {
            vi.useFakeTimers();

            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                delay: 500,
            });

            // First load — goes through delay
            data.load();
            vi.advanceTimersByTime(500);

            // Clean up first request
            await stabilize();
            httpTesting.match('/api/items/1').forEach(req => req.flush({ id: 1, name: 'first' }));
            await stabilize();

            // Second load — resource already exists, should reload immediately (no delay)
            data.load();
            // Resource should still exist (reload, not re-create)
            expect(data.resource).not.toBeNull();

            await stabilize();
            httpTesting.match('/api/items/1').forEach(req => req.flush({ id: 1, name: 'second' }));
            await stabilize();

            expect(data.value()).toEqual({ id: 1, name: 'second' });

            vi.useRealTimers();
        });
    });

    // ---------------------------------------------------------------------------
    // convertParams — undefined params
    // ---------------------------------------------------------------------------
    describe('convertParams edge cases', () => {
        it('should not include params when params option is undefined', async () => {
            const data = createHttpData<TestItem>({
                url: '/api/items/1',
                // no params
            });
            data.load();
            await stabilize();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBeGreaterThan(0);
            expect(reqs[0].request.params.keys().length).toBe(0);
            reqs.forEach(req => req.flush({ id: 1, name: 'test' }));
        });
    });

    // ---------------------------------------------------------------------------
    // Error status code
    // ---------------------------------------------------------------------------
    describe('error status code', () => {
        it('should expose the HTTP status code after error response', async () => {
            const data = createHttpData<TestItem>({ url: '/api/items/1' });
            data.load();
            await stabilize();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' }));
            await stabilize();

            expect(data.isError()).toBe(true);
            expect(data.error()).toBeDefined();
        });
    });
});
