import { TestBed } from '@angular/core/testing';
import { Injector, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject, throwError, of } from 'rxjs';

import { HttpClientData, DataOptions, MutationOptions, GetOptions } from './http-client-data';

interface TestItem {
    id: number;
    name: string;
}

describe('HttpClientData', () => {
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

    function createHttpClientData<T, TBody = unknown>(
        options: DataOptions<T, TBody>,
    ): HttpClientData<T, TBody> {
        return new HttpClientData<T, TBody>(injector, options);
    }

    /** Load, flush the HTTP response */
    function loadAndFlush<T>(data: HttpClientData<T>, url: string, response: Object | null, opts?: { status?: number; statusText?: string; headers?: Record<string, string> }): void {
        data.load();
        const reqs = httpTesting.match(url);
        reqs.forEach(req => req.flush(response, opts));
    }

    // ---------------------------------------------------------------------------
    // Construction & lazy initialization
    // ---------------------------------------------------------------------------
    describe('construction and lazy initialization', () => {
        it('should create an instance', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data).toBeTruthy();
        });

        it('should report isLoaded as false before load()', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.isLoaded()).toBe(false);
        });

        it('should report isLoaded as true after load()', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();
            expect(data.isLoaded()).toBe(true);
            httpTesting.match('/api/items/1').forEach(req => req.flush({}));
        });
    });

    // ---------------------------------------------------------------------------
    // Default state before load
    // ---------------------------------------------------------------------------
    describe('default state before load', () => {
        it('should return undefined value when no defaultValue is set', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.value()).toBeUndefined();
        });

        it('should return defaultValue when one is provided', () => {
            const defaultItem: TestItem = { id: 0, name: 'default' };
            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                defaultValue: defaultItem,
            });
            expect(data.value()).toEqual(defaultItem);
        });

        it('should report idle status before load', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.status()).toBe('idle');
            expect(data.isIdle()).toBe(true);
        });

        it('should report not loading before load', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.isLoading()).toBe(false);
            expect(data.isReloading()).toBe(false);
            expect(data.isPending()).toBe(false);
        });

        it('should report not success/error before load', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.isSuccess()).toBe(false);
            expect(data.isError()).toBe(false);
            expect(data.isLocal()).toBe(false);
        });

        it('should report no error before load', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.error()).toBeUndefined();
        });

        it('should report hasValue as false when no defaultValue', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.hasValue()).toBe(false);
        });

        it('should report hasValue as true when defaultValue is provided', () => {
            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                defaultValue: { id: 0, name: 'default' },
            });
            expect(data.hasValue()).toBe(true);
        });

        it('should return undefined headers before load', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.headers()).toBeUndefined();
        });

        it('should return undefined statusCode before load', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.statusCode()).toBeUndefined();
        });
    });

    // ---------------------------------------------------------------------------
    // load()
    // ---------------------------------------------------------------------------
    describe('load()', () => {
        it('should set isLoaded to true on first load', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();
            expect(data.isLoaded()).toBe(true);
            httpTesting.match('/api/items/1').forEach(req => req.flush({}));
        });

        it('should make a GET request by default', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.method).toBe('GET');
            reqs.forEach(req => req.flush({ id: 1, name: 'test' }));
        });

        it('should resolve with the response data', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'Alpha' });

            expect(data.value()).toEqual({ id: 1, name: 'Alpha' });
            expect(data.isSuccess()).toBe(true);
            expect(data.status()).toBe('resolved');
        });

        it('should set error state on HTTP failure', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush('Not Found', { status: 404, statusText: 'Not Found' }));

            expect(data.isError()).toBe(true);
            expect(data.status()).toBe('error');
            expect(data.error()).toBeDefined();
        });

        it('should set loading status during request', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();

            expect(data.isLoading()).toBe(true);
            expect(data.isPending()).toBe(true);
            expect(data.status()).toBe('loading');

            httpTesting.match('/api/items/1').forEach(req => req.flush({ id: 1, name: 'test' }));
        });

        it('should set reloading status on subsequent load() calls', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'first' });

            expect(data.value()).toEqual({ id: 1, name: 'first' });

            // Second load should trigger reloading
            data.load();
            expect(data.isReloading()).toBe(true);
            expect(data.isPending()).toBe(true);
            expect(data.status()).toBe('reloading');

            httpTesting.match('/api/items/1').forEach(req => req.flush({ id: 1, name: 'second' }));

            expect(data.value()).toEqual({ id: 1, name: 'second' });
        });
    });

    // ---------------------------------------------------------------------------
    // reload()
    // ---------------------------------------------------------------------------
    describe('reload()', () => {
        it('should be a no-op when resource has not been loaded', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.reload();
            expect(data.isLoaded()).toBe(false);
        });

        it('should reload an already loaded resource', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'first' });

            data.reload();
            expect(data.isReloading()).toBe(true);

            httpTesting.match('/api/items/1').forEach(req => req.flush({ id: 1, name: 'reloaded' }));

            expect(data.value()).toEqual({ id: 1, name: 'reloaded' });
        });
    });

    // ---------------------------------------------------------------------------
    // HTTP methods
    // ---------------------------------------------------------------------------
    describe('HTTP methods', () => {
        it('should use POST method when specified', () => {
            const data = createHttpClientData<TestItem, { name: string }>({
                url: '/api/items',
                method: 'POST',
                body: { name: 'new item' },
            });
            data.load();
            const reqs = httpTesting.match('/api/items');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.method).toBe('POST');
            expect(reqs[0].request.body).toEqual({ name: 'new item' });
            reqs.forEach(req => req.flush({ id: 2, name: 'new item' }));
        });

        it('should use PUT method when specified', () => {
            const data = createHttpClientData<TestItem, TestItem>({
                url: '/api/items/1',
                method: 'PUT',
                body: { id: 1, name: 'updated' },
            });
            data.load();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.method).toBe('PUT');
            reqs.forEach(req => req.flush({ id: 1, name: 'updated' }));
        });

        it('should use PATCH method when specified', () => {
            const data = createHttpClientData<TestItem, Partial<TestItem>>({
                url: '/api/items/1',
                method: 'PATCH',
                body: { name: 'patched' },
            });
            data.load();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.method).toBe('PATCH');
            reqs.forEach(req => req.flush({ id: 1, name: 'patched' }));
        });

        it('should use DELETE method when specified', () => {
            const data = createHttpClientData<void>({
                url: '/api/items/1',
                method: 'DELETE',
            });
            data.load();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.method).toBe('DELETE');
            reqs.forEach(req => req.flush(null));
        });
    });

    // ---------------------------------------------------------------------------
    // URL as function
    // ---------------------------------------------------------------------------
    describe('URL as function', () => {
        it('should support a function-based URL', () => {
            const id = signal(1);
            const data = createHttpClientData<TestItem>({
                url: () => `/api/items/${id()}`,
            });
            data.load();
            const reqs = httpTesting.match(r => r.url.startsWith('/api/items/'));
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.url).toBe('/api/items/1');
            reqs.forEach(req => req.flush({ id: 1, name: 'item 1' }));
        });
    });

    // ---------------------------------------------------------------------------
    // Body as function
    // ---------------------------------------------------------------------------
    describe('body as function', () => {
        it('should support a function-based body', () => {
            const bodyData = signal({ name: 'dynamic' });
            const data = createHttpClientData<TestItem, { name: string }>({
                url: '/api/items',
                method: 'POST',
                body: () => bodyData(),
            });
            data.load();
            const reqs = httpTesting.match('/api/items');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.body).toEqual({ name: 'dynamic' });
            reqs.forEach(req => req.flush({ id: 1, name: 'dynamic' }));
        });
    });

    // ---------------------------------------------------------------------------
    // Headers
    // ---------------------------------------------------------------------------
    describe('headers', () => {
        it('should send custom headers', () => {
            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                headers: { 'X-Custom': 'test-value' },
            });
            data.load();
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.headers.get('X-Custom')).toBe('test-value');
            reqs.forEach(req => req.flush({ id: 1, name: 'test' }));
        });

        it('should expose response headers after load', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush(
                { id: 1, name: 'test' },
                { headers: { 'X-Total-Count': '42' } },
            ));

            expect(data.headers()).toBeDefined();
            expect(data.headers()?.get('X-Total-Count')).toBe('42');
        });
    });

    // ---------------------------------------------------------------------------
    // Params
    // ---------------------------------------------------------------------------
    describe('params', () => {
        it('should convert number params to strings', () => {
            const data = createHttpClientData<TestItem[]>({
                url: '/api/items',
                params: { page: 1, limit: 10 },
            });
            data.load();
            const reqs = httpTesting.match(r => r.url === '/api/items');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.params.get('page')).toBe('1');
            expect(reqs[0].request.params.get('limit')).toBe('10');
            reqs.forEach(req => req.flush([]));
        });

        it('should convert boolean params to strings', () => {
            const data = createHttpClientData<TestItem[]>({
                url: '/api/items',
                params: { active: true },
            });
            data.load();
            const reqs = httpTesting.match(r => r.url === '/api/items');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.params.get('active')).toBe('true');
            reqs.forEach(req => req.flush([]));
        });

        it('should pass string params as-is', () => {
            const data = createHttpClientData<TestItem[]>({
                url: '/api/items',
                params: { search: 'hello' },
            });
            data.load();
            const reqs = httpTesting.match(r => r.url === '/api/items');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.params.get('search')).toBe('hello');
            reqs.forEach(req => req.flush([]));
        });

        it('should handle array params', () => {
            const data = createHttpClientData<TestItem[]>({
                url: '/api/items',
                params: { ids: [1, 2, 3] },
            });
            data.load();
            const reqs = httpTesting.match(r => r.url === '/api/items');
            expect(reqs.length).toBe(1);
            expect(reqs[0].request.params.getAll('ids')).toEqual(['1', '2', '3']);
            reqs.forEach(req => req.flush([]));
        });
    });

    // ---------------------------------------------------------------------------
    // parse option
    // ---------------------------------------------------------------------------
    describe('parse option', () => {
        it('should transform response data using parse function', () => {
            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                parse: (raw: unknown) => {
                    const r = raw as { item_id: number; item_name: string };
                    return { id: r.item_id, name: r.item_name };
                },
            });
            loadAndFlush(data, '/api/items/1', { item_id: 1, item_name: 'parsed' });

            expect(data.value()).toEqual({ id: 1, name: 'parsed' });
        });
    });

    // ---------------------------------------------------------------------------
    // set()
    // ---------------------------------------------------------------------------
    describe('set()', () => {
        it('should set isLoaded to true and set the value', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.isLoaded()).toBe(false);

            data.set({ id: 99, name: 'local' });

            expect(data.isLoaded()).toBe(true);
            expect(data.value()).toEqual({ id: 99, name: 'local' });
            expect(data.isLocal()).toBe(true);
            expect(data.status()).toBe('local');
        });

        it('should set value on an already loaded resource', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'original' });

            data.set({ id: 1, name: 'overridden' });

            expect(data.value()).toEqual({ id: 1, name: 'overridden' });
            expect(data.isLocal()).toBe(true);
            expect(data.status()).toBe('local');
        });
    });

    // ---------------------------------------------------------------------------
    // update()
    // ---------------------------------------------------------------------------
    describe('update()', () => {
        it('should set isLoaded to true and update the value', () => {
            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                defaultValue: { id: 0, name: 'default' },
            });
            expect(data.isLoaded()).toBe(false);

            data.update(current => current ? { ...current, name: 'updated' } : { id: 0, name: 'updated' });

            expect(data.isLoaded()).toBe(true);
            expect(data.value()).toEqual({ id: 0, name: 'updated' });
            expect(data.isLocal()).toBe(true);
        });

        it('should update value on an already loaded resource', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'original' });

            data.update(current => current ? { ...current, name: 'modified' } : undefined);

            expect(data.value()).toEqual({ id: 1, name: 'modified' });
            expect(data.isLocal()).toBe(true);
        });
    });

    // ---------------------------------------------------------------------------
    // destroy()
    // ---------------------------------------------------------------------------
    describe('destroy()', () => {
        it('should be a no-op when resource has not been loaded', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(() => data.destroy()).not.toThrow();
            expect(data.isLoaded()).toBe(false);
        });

        it('should destroy and reset to initial state', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'test' });

            expect(data.isLoaded()).toBe(true);

            data.destroy();

            expect(data.isLoaded()).toBe(false);
            expect(data.isIdle()).toBe(true);
            expect(data.value()).toBeUndefined();
        });

        it('should return to default state after destroy', () => {
            const defaultItem: TestItem = { id: 0, name: 'default' };
            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                defaultValue: defaultItem,
            });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'loaded' });

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
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(() => data.cancel()).not.toThrow();
            expect(data.isLoaded()).toBe(false);
        });

        it('should be a no-op when resource is in resolved state', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'test' });

            expect(data.isSuccess()).toBe(true);

            data.cancel();

            expect(data.isLoaded()).toBe(true);
            expect(data.value()).toEqual({ id: 1, name: 'test' });
        });

        it('should be a no-op when resource is in error state', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush('Not Found', { status: 404, statusText: 'Not Found' }));

            expect(data.isError()).toBe(true);

            data.cancel();

            expect(data.isLoaded()).toBe(true);
        });

        it('should be a no-op when resource is in local state', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'test' });

            data.set({ id: 1, name: 'local' });

            expect(data.isLocal()).toBe(true);

            data.cancel();

            expect(data.isLoaded()).toBe(true);
            expect(data.value()).toEqual({ id: 1, name: 'local' });
        });

        it('should cancel a loading request and reset to initial state', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();

            expect(data.isLoaded()).toBe(true);
            expect(data.isLoading()).toBe(true);

            data.cancel();

            // Discard the now-orphaned HTTP request so httpTesting.verify() passes
            httpTesting.match('/api/items/1');

            expect(data.isLoaded()).toBe(false);
            expect(data.isIdle()).toBe(true);
            expect(data.value()).toBeUndefined();
        });

        it('should return defaultValue after cancelling a loading request', () => {
            const defaultItem: TestItem = { id: 0, name: 'default' };
            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                defaultValue: defaultItem,
            });
            data.load();

            data.cancel();

            // Discard the now-orphaned HTTP request so httpTesting.verify() passes
            httpTesting.match('/api/items/1');

            expect(data.value()).toEqual(defaultItem);
            expect(data.isIdle()).toBe(true);
        });

        it('should allow load() to be called again after cancel()', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });

            // First load
            data.load();

            // Cancel before response arrives
            data.cancel();

            // Discard the now-orphaned HTTP request so httpTesting.verify() passes
            httpTesting.match('/api/items/1');

            expect(data.isLoaded()).toBe(false);

            // Load again
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'after-cancel' });

            expect(data.value()).toEqual({ id: 1, name: 'after-cancel' });
            expect(data.isSuccess()).toBe(true);
        });
    });

    // ---------------------------------------------------------------------------
    // map()
    // ---------------------------------------------------------------------------
    describe('map()', () => {
        it('should return undefined when resource has no value', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            const mapped = data.map(item => item.name);
            expect(mapped()).toBeUndefined();
        });

        it('should transform the value when resource has data', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            const mapped = data.map(item => item.name);

            loadAndFlush(data, '/api/items/1', { id: 1, name: 'Alpha' });

            expect(mapped()).toBe('Alpha');
        });

        it('should reactively update when value changes', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            const mapped = data.map(item => item.name.toUpperCase());

            loadAndFlush(data, '/api/items/1', { id: 1, name: 'hello' });

            expect(mapped()).toBe('HELLO');

            data.set({ id: 1, name: 'world' });

            expect(mapped()).toBe('WORLD');
        });
    });

    // ---------------------------------------------------------------------------
    // getOrDefault()
    // ---------------------------------------------------------------------------
    describe('getOrDefault()', () => {
        it('should return the default when resource has no value', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            const fallback: TestItem = { id: -1, name: 'fallback' };
            const result = data.getOrDefault(fallback);
            expect(result()).toEqual(fallback);
        });

        it('should return the actual value when resource has data', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            const fallback: TestItem = { id: -1, name: 'fallback' };
            const result = data.getOrDefault(fallback);

            loadAndFlush(data, '/api/items/1', { id: 1, name: 'real' });

            expect(result()).toEqual({ id: 1, name: 'real' });
        });
    });

    // ---------------------------------------------------------------------------
    // statusCode
    // ---------------------------------------------------------------------------
    describe('statusCode', () => {
        it('should expose the HTTP status code after successful response', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush(
                { id: 1, name: 'test' },
                { status: 200, statusText: 'OK' },
            ));

            expect(data.statusCode()).toBe(200);
        });

        it('should expose the HTTP status code after error response', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush('Not Found', { status: 404, statusText: 'Not Found' }));

            expect(data.statusCode()).toBe(404);
        });
    });

    // ---------------------------------------------------------------------------
    // Full lifecycle
    // ---------------------------------------------------------------------------
    describe('full lifecycle', () => {
        it('should support load -> set -> reload -> destroy cycle', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });

            // 1. Initial state
            expect(data.isIdle()).toBe(true);
            expect(data.isLoaded()).toBe(false);

            // 2. Load
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'loaded' });

            expect(data.value()).toEqual({ id: 1, name: 'loaded' });
            expect(data.isSuccess()).toBe(true);
            expect(data.isLoaded()).toBe(true);

            // 3. Set local value
            data.set({ id: 1, name: 'local' });

            expect(data.value()).toEqual({ id: 1, name: 'local' });
            expect(data.isLocal()).toBe(true);

            // 4. Reload
            data.reload();
            httpTesting.match('/api/items/1').forEach(req => req.flush({ id: 1, name: 'reloaded' }));

            expect(data.value()).toEqual({ id: 1, name: 'reloaded' });
            expect(data.isSuccess()).toBe(true);

            // 5. Destroy
            data.destroy();
            expect(data.isLoaded()).toBe(false);
            expect(data.isIdle()).toBe(true);
        });
    });

    // ---------------------------------------------------------------------------
    // Static factory methods
    // ---------------------------------------------------------------------------
    describe('static factory methods', () => {
        describe('HttpClientData.get()', () => {
            it('should create an HttpClientData with GET method', () => {
                const data = HttpClientData.get<TestItem>(injector, {
                    url: '/api/items/1',
                });
                data.load();
                const reqs = httpTesting.match('/api/items/1');
                expect(reqs.length).toBe(1);
                expect(reqs[0].request.method).toBe('GET');
                reqs.forEach(req => req.flush({ id: 1, name: 'fetched' }));
            });

            it('should support all DataOptions except method and body', () => {
                const data = HttpClientData.get<TestItem>(injector, {
                    url: '/api/items/1',
                    headers: { 'X-Custom': 'value' },
                    params: { version: 2 },
                    defaultValue: { id: 0, name: 'default' },
                });
                expect(data.value()).toEqual({ id: 0, name: 'default' });
                data.load();
                const reqs = httpTesting.match(r => r.url === '/api/items/1');
                expect(reqs[0].request.headers.get('X-Custom')).toBe('value');
                expect(reqs[0].request.params.get('version')).toBe('2');
                reqs.forEach(req => req.flush({ id: 1, name: 'fetched' }));
            });

            it('should support a function-based URL', () => {
                const id = signal(42);
                const data = HttpClientData.get<TestItem>(injector, {
                    url: () => `/api/items/${id()}`,
                });
                data.load();
                const reqs = httpTesting.match(r => r.url.startsWith('/api/items/'));
                expect(reqs.length).toBe(1);
                expect(reqs[0].request.url).toBe('/api/items/42');
                reqs.forEach(req => req.flush({ id: 42, name: 'item 42' }));
            });

            it('should support parse option', () => {
                const data = HttpClientData.get<TestItem>(injector, {
                    url: '/api/items/1',
                    parse: (raw: unknown) => {
                        const r = raw as { item_id: number; item_name: string };
                        return { id: r.item_id, name: r.item_name };
                    },
                });
                data.load();
                const reqs = httpTesting.match('/api/items/1');
                reqs.forEach(req => req.flush({ item_id: 1, item_name: 'parsed' }));

                expect(data.value()).toEqual({ id: 1, name: 'parsed' });
            });

            it('should support the full lifecycle via get()', () => {
                const data = HttpClientData.get<TestItem>(injector, {
                    url: '/api/items/1',
                });

                // Lazy — not loaded yet
                expect(data.isLoaded()).toBe(false);

                // Load
                data.load();
                const reqs = httpTesting.match('/api/items/1');
                reqs.forEach(req => req.flush({ id: 1, name: 'lifecycle test' }));

                expect(data.value()).toEqual({ id: 1, name: 'lifecycle test' });
                expect(data.isSuccess()).toBe(true);

                // Set locally
                data.set({ id: 1, name: 'local override' });
                expect(data.value()).toEqual({ id: 1, name: 'local override' });
                expect(data.isLocal()).toBe(true);

                // Reload
                data.reload();
                httpTesting.match('/api/items/1').forEach(req => req.flush({ id: 1, name: 'reloaded' }));
                expect(data.value()).toEqual({ id: 1, name: 'reloaded' });

                // Destroy
                data.destroy();
                expect(data.isLoaded()).toBe(false);
            });
        });

        describe('HttpClientData.post()', () => {
            it('should create an HttpClientData with POST method', () => {
                const data = HttpClientData.post<TestItem, { name: string }>(injector, {
                    url: '/api/items',
                    body: { name: 'new item' },
                });
                data.load();
                const reqs = httpTesting.match('/api/items');
                expect(reqs.length).toBe(1);
                expect(reqs[0].request.method).toBe('POST');
                expect(reqs[0].request.body).toEqual({ name: 'new item' });
                reqs.forEach(req => req.flush({ id: 1, name: 'new item' }));
            });

            it('should support all DataOptions except method', () => {
                const data = HttpClientData.post<TestItem, { name: string }>(injector, {
                    url: '/api/items',
                    body: { name: 'test' },
                    headers: { 'X-Custom': 'value' },
                    params: { version: 2 },
                    defaultValue: { id: 0, name: 'default' },
                });
                expect(data.value()).toEqual({ id: 0, name: 'default' });
                data.load();
                const reqs = httpTesting.match(r => r.url === '/api/items');
                expect(reqs[0].request.headers.get('X-Custom')).toBe('value');
                expect(reqs[0].request.params.get('version')).toBe('2');
                reqs.forEach(req => req.flush({ id: 1, name: 'created' }));
            });

            it('should support function-based body', () => {
                const bodySignal = signal({ name: 'dynamic' });
                const data = HttpClientData.post<TestItem, { name: string }>(injector, {
                    url: '/api/items',
                    body: () => bodySignal(),
                });
                data.load();
                const reqs = httpTesting.match('/api/items');
                expect(reqs[0].request.body).toEqual({ name: 'dynamic' });
                reqs.forEach(req => req.flush({ id: 1, name: 'dynamic' }));
            });
        });

        describe('HttpClientData.put()', () => {
            it('should create an HttpClientData with PUT method', () => {
                const data = HttpClientData.put<TestItem, TestItem>(injector, {
                    url: '/api/items/1',
                    body: { id: 1, name: 'updated' },
                });
                data.load();
                const reqs = httpTesting.match('/api/items/1');
                expect(reqs.length).toBe(1);
                expect(reqs[0].request.method).toBe('PUT');
                expect(reqs[0].request.body).toEqual({ id: 1, name: 'updated' });
                reqs.forEach(req => req.flush({ id: 1, name: 'updated' }));
            });
        });

        describe('HttpClientData.patch()', () => {
            it('should create an HttpClientData with PATCH method', () => {
                const data = HttpClientData.patch<TestItem, Partial<TestItem>>(injector, {
                    url: '/api/items/1',
                    body: { name: 'patched' },
                });
                data.load();
                const reqs = httpTesting.match('/api/items/1');
                expect(reqs.length).toBe(1);
                expect(reqs[0].request.method).toBe('PATCH');
                expect(reqs[0].request.body).toEqual({ name: 'patched' });
                reqs.forEach(req => req.flush({ id: 1, name: 'patched' }));
            });
        });

        describe('factory methods produce fully functional HttpClientData', () => {
            it('should support the full lifecycle via post()', () => {
                const data = HttpClientData.post<TestItem, { name: string }>(injector, {
                    url: '/api/items',
                    body: { name: 'lifecycle test' },
                });

                // Lazy — not loaded yet
                expect(data.isLoaded()).toBe(false);

                // Load
                data.load();
                const reqs = httpTesting.match('/api/items');
                reqs.forEach(req => req.flush({ id: 1, name: 'lifecycle test' }));

                expect(data.value()).toEqual({ id: 1, name: 'lifecycle test' });
                expect(data.isSuccess()).toBe(true);

                // Set locally
                data.set({ id: 1, name: 'local override' });
                expect(data.value()).toEqual({ id: 1, name: 'local override' });
                expect(data.isLocal()).toBe(true);

                // Destroy
                data.destroy();
                expect(data.isLoaded()).toBe(false);
            });
        });
    });

    // ---------------------------------------------------------------------------
    // loadFrom()
    // ---------------------------------------------------------------------------
    describe('loadFrom()', () => {
        it('should set status to loading immediately', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            const source$ = new Subject<TestItem>();

            data.loadFrom(source$);

            expect(data.isLoaded()).toBe(true);
            expect(data.isLoading()).toBe(true);
            expect(data.status()).toBe('loading');

            source$.complete();
        });

        it('should set status to reloading when value already exists', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            loadAndFlush(data, '/api/items/1', { id: 1, name: 'original' });

            expect(data.isSuccess()).toBe(true);

            const source$ = new Subject<TestItem>();
            data.loadFrom(source$);

            expect(data.isReloading()).toBe(true);
            expect(data.status()).toBe('reloading');

            source$.complete();
        });

        it('should resolve with the emitted value', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            const source$ = new Subject<TestItem>();

            data.loadFrom(source$);
            source$.next({ id: 99, name: 'from-observable' });

            expect(data.value()).toEqual({ id: 99, name: 'from-observable' });
            expect(data.isSuccess()).toBe(true);
            expect(data.status()).toBe('resolved');
            expect(data.error()).toBeUndefined();

            source$.complete();
        });

        it('should set error state when the observable errors', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            const error = new Error('Observable failed');

            data.loadFrom(throwError(() => error));

            expect(data.isError()).toBe(true);
            expect(data.status()).toBe('error');
            expect(data.error()).toBe(error);
        });

        it('should abort any previous in-flight HTTP request', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });

            // Start an HTTP load
            data.load();
            expect(data.isLoading()).toBe(true);

            // Now loadFrom — should abort the HTTP request
            const source$ = new Subject<TestItem>();
            data.loadFrom(source$);

            // Discard the orphaned HTTP request
            httpTesting.match('/api/items/1');

            source$.next({ id: 1, name: 'from-source' });
            expect(data.value()).toEqual({ id: 1, name: 'from-source' });

            source$.complete();
        });

        it('should set isLoaded to true', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            expect(data.isLoaded()).toBe(false);

            data.loadFrom(of({ id: 1, name: 'instant' }));

            expect(data.isLoaded()).toBe(true);
        });
    });

    // ---------------------------------------------------------------------------
    // parse error handling
    // ---------------------------------------------------------------------------
    describe('parse error handling', () => {
        it('should set error state when parse function throws', () => {
            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                parse: () => {
                    throw new Error('Parse failed');
                },
            });
            data.load();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush({ id: 1, name: 'raw' }));

            expect(data.isError()).toBe(true);
            expect(data.status()).toBe('error');
            expect(data.error()).toBeInstanceOf(Error);
            expect((data.error() as Error).message).toBe('Parse failed');
        });

        it('should still set statusCode when parse throws', () => {
            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                parse: () => {
                    throw new Error('Parse failed');
                },
            });
            data.load();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush({ id: 1, name: 'raw' }, { status: 200, statusText: 'OK' }));

            expect(data.statusCode()).toBe(200);
        });
    });

    // ---------------------------------------------------------------------------
    // Request abort on re-load
    // ---------------------------------------------------------------------------
    describe('request abort on re-load', () => {
        it('should abort the previous request when load() is called again', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });

            // First load
            data.load();
            expect(data.isLoading()).toBe(true);

            // Second load — should abort the first
            data.load();
            expect(data.isReloading()).toBe(true);

            // Only the second request should be pending
            const reqs = httpTesting.match('/api/items/1');
            // The first was cancelled, so we should have at most 2 (one cancelled, one active)
            // Flush all remaining
            reqs.forEach(req => {
                if (!req.cancelled) {
                    req.flush({ id: 1, name: 'second' });
                }
            });

            expect(data.value()).toEqual({ id: 1, name: 'second' });
        });
    });

    // ---------------------------------------------------------------------------
    // set() and update() clear error state
    // ---------------------------------------------------------------------------
    describe('set() and update() clear error state', () => {
        it('should clear error state when set() is called after an error', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush('Error', { status: 500, statusText: 'Server Error' }));

            expect(data.isError()).toBe(true);
            expect(data.error()).toBeDefined();

            data.set({ id: 1, name: 'recovered' });

            expect(data.isLocal()).toBe(true);
            expect(data.error()).toBeUndefined();
            expect(data.value()).toEqual({ id: 1, name: 'recovered' });
        });

        it('should clear error state when update() is called after an error', () => {
            const data = createHttpClientData<TestItem>({ url: '/api/items/1' });
            data.load();

            const reqs = httpTesting.match('/api/items/1');
            reqs.forEach(req => req.flush('Error', { status: 500, statusText: 'Server Error' }));

            expect(data.isError()).toBe(true);

            data.update(() => ({ id: 1, name: 'recovered' }));

            expect(data.isLocal()).toBe(true);
            expect(data.error()).toBeUndefined();
            expect(data.value()).toEqual({ id: 1, name: 'recovered' });
        });
    });

    // ---------------------------------------------------------------------------
    // delay option
    // ---------------------------------------------------------------------------
    describe('delay option', () => {
        it('should set status to loading immediately when delay is specified', () => {
            vi.useFakeTimers();

            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                delay: 500,
            });

            data.load();

            expect(data.isLoading()).toBe(true);
            expect(data.status()).toBe('loading');

            // Clean up — advance timer and flush
            vi.advanceTimersByTime(500);
            httpTesting.match('/api/items/1').forEach(req => req.flush({ id: 1, name: 'delayed' }));

            vi.useRealTimers();
        });

        it('should delay the actual HTTP request', () => {
            vi.useFakeTimers();

            const data = createHttpClientData<TestItem>({
                url: '/api/items/1',
                delay: 300,
            });

            data.load();

            // Before delay — request should have been made but response delayed via RxJS delay
            // The HTTP request is dispatched immediately but the response is delayed
            const reqs = httpTesting.match('/api/items/1');
            expect(reqs.length).toBe(1);

            // Flush the response
            reqs.forEach(req => req.flush({ id: 1, name: 'delayed' }));

            // Before delay expires, value should not be set yet
            expect(data.isLoading()).toBe(true);

            // Advance past the delay
            vi.advanceTimersByTime(300);

            expect(data.isSuccess()).toBe(true);
            expect(data.value()).toEqual({ id: 1, name: 'delayed' });

            vi.useRealTimers();
        });
    });
});