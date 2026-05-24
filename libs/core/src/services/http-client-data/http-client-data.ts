
import { Injector, Signal, WritableSignal, computed, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subscription, delay as rxDelay } from 'rxjs';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpClientDataStatus = 'idle' | 'loading' | 'reloading' | 'resolved' | 'error' | 'local';

export interface DataOptions<T, TBody = unknown> {
    url: string | (() => string);
    method?: HttpMethod;
    headers?: Record<string, string | ReadonlyArray<string>>;
    params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
    body?: TBody | (() => TBody);
    defaultValue?: T;
    parse?: (response: unknown) => T;
    /** Delay in milliseconds before the HTTP request is dispatched. The status transitions to 'loading' immediately. */
    delay?: number;
}

export type MutationOptions<T, TBody> = Omit<DataOptions<T, TBody>, 'method'> & {
    body: TBody | (() => TBody);
};

export class HttpClientData<T, TBody = unknown> {

    static post<T, TBody>(injector: Injector, options: MutationOptions<T, TBody>): HttpClientData<T, TBody> {
        return new HttpClientData<T, TBody>(injector, { ...options, method: 'POST' });
    }

    static put<T, TBody>(injector: Injector, options: MutationOptions<T, TBody>): HttpClientData<T, TBody> {
        return new HttpClientData<T, TBody>(injector, { ...options, method: 'PUT' });
    }

    static patch<T, TBody>(injector: Injector, options: MutationOptions<T, TBody>): HttpClientData<T, TBody> {
        return new HttpClientData<T, TBody>(injector, { ...options, method: 'PATCH' });
    }

    private readonly _http: HttpClient;
    private readonly _defaultValue: T | undefined;
    private readonly _value: WritableSignal<T | undefined>;
    private readonly _error: WritableSignal<unknown>;
    private readonly _status: WritableSignal<HttpClientDataStatus>;
    private readonly _headers: WritableSignal<HttpHeaders | undefined>;
    private readonly _statusCode: WritableSignal<number | undefined>;
    private readonly _isLoaded: WritableSignal<boolean>;

    private readonly _isIdle: Signal<boolean>;
    private readonly _isLoading: Signal<boolean>;
    private readonly _isReloading: Signal<boolean>;
    private readonly _isPending: Signal<boolean>;
    private readonly _isSuccess: Signal<boolean>;
    private readonly _isError: Signal<boolean>;
    private readonly _isLocal: Signal<boolean>;
    private readonly _hasValue: Signal<boolean>;

    private _subscription: Subscription | null = null;

    constructor(
        private readonly injector: Injector,
        private readonly options: DataOptions<T, TBody>) {

        this._http = this.injector.get(HttpClient);
        this._defaultValue = options.defaultValue;

        this._value =      signal<T | undefined>(this._defaultValue);
        this._error =      signal<unknown>(undefined);
        this._status =     signal<HttpClientDataStatus>('idle');
        this._headers =    signal<HttpHeaders | undefined>(undefined);
        this._statusCode = signal<number | undefined>(undefined);
        this._isLoaded =   signal<boolean>(false);

        this._isIdle =      computed(() => this._status() === 'idle');
        this._isLoading =   computed(() => this._status() === 'loading');
        this._isReloading = computed(() => this._status() === 'reloading');
        this._isPending =   computed(() => { const s = this._status(); return s === 'loading' || s === 'reloading'; });
        this._isSuccess =   computed(() => this._status() === 'resolved');
        this._isError =     computed(() => this._status() === 'error');
        this._isLocal =     computed(() => this._status() === 'local');
        this._hasValue =    computed(() => this._value() !== undefined);
    }

    get value():       Signal<T | undefined> { return this._value; }
    get error():       Signal<unknown> { return this._error; }
    get status():      Signal<HttpClientDataStatus> { return this._status; }
    get isIdle():      Signal<boolean> { return this._isIdle; }
    get isLoading():   Signal<boolean> { return this._isLoading; }
    get isReloading(): Signal<boolean> { return this._isReloading; }
    get isPending():   Signal<boolean> { return this._isPending; }
    get isSuccess():   Signal<boolean> { return this._isSuccess; }
    get isError():     Signal<boolean> { return this._isError; }
    get isLocal():     Signal<boolean> { return this._isLocal; }
    get hasValue():    Signal<boolean> { return this._hasValue; }
    get isLoaded():    Signal<boolean> { return this._isLoaded; }
    get headers():     Signal<HttpHeaders | undefined> { return this._headers; }
    get statusCode():  Signal<number | undefined> { return this._statusCode; }

    load(): void {
        const wasLoaded = this._isLoaded();
        this._isLoaded.set(true);
        this._status.set(wasLoaded ? 'reloading' : 'loading');
        this.executeRequest();
    }

    reload(): void {
        if (!this._isLoaded()) return;
        this._status.set('reloading');
        this.executeRequest();
    }

    /**
     * Load data from an external Observable source.
     * Sets status to 'loading' immediately, then resolves or errors
     * based on the Observable's emissions — same lifecycle as load().
     */
    loadFrom(source$: Observable<T>): void {
        this.abortRequest();
        const hasExistingValue = this._value() !== undefined;
        this._isLoaded.set(true);
        this._status.set(hasExistingValue ? 'reloading' : 'loading');

        this._subscription = source$.subscribe({
            next: (value: T) => {
                this._value.set(value);
                this._error.set(undefined);
                this._status.set('resolved');
            },
            error: (err: unknown) => {
                this._error.set(err);
                this._status.set('error');
            },
        });
    }

    set(value: T): void {
        this._isLoaded.set(true);
        this._value.set(value);
        this._status.set('local');
        this._error.set(undefined);
    }

    update(updateFn: (current: T | undefined) => T | undefined): void {
        this._isLoaded.set(true);
        this._value.set(updateFn(this._value()));
        this._status.set('local');
        this._error.set(undefined);
    }

    cancel(): void {
        if (!this._isLoaded()) return;

        const status = this._status();
        if (status !== 'loading' && status !== 'reloading') return;

        this.abortRequest();
        this.resetState();
    }

    destroy(): void {
        if (!this._isLoaded()) return;
        this.abortRequest();
        this.resetState();
    }

    map<U>(mapFn: (data: T) => U): Signal<U | undefined> {
        return computed(() => {
            const val = this._value();
            return val !== undefined ? mapFn(val) : undefined;
        });
    }

    getOrDefault(defaultValue: T): Signal<T> {
        return computed(() => this._value() ?? defaultValue);
    }

    private executeRequest(): void {
        this.abortRequest();

        const { url, method, headers, params, body, parse, delay: delayMs } = this.options;
        const resolvedUrl = typeof url === 'function' ? url() : url;
        const resolvedMethod = method ?? 'GET';
        const resolvedBody = body && typeof body === 'function' ? (body as () => TBody)() : body;

        const httpHeaders = headers ? new HttpHeaders(headers as Record<string, string | string[]>) : undefined;
        const httpParams = this.buildParams(params);

        const requestOptions: {
            headers?: HttpHeaders;
            params?: HttpParams;
            observe: 'response';
            body?: TBody;
        } = {
            observe: 'response' as const,
            ...(httpHeaders && { headers: httpHeaders }),
            ...(httpParams && { params: httpParams }),
        };

        let request$;
        switch (resolvedMethod) {
            case 'GET':
                request$ = this._http.get<unknown>(resolvedUrl, requestOptions);
                break;
            case 'POST':
                request$ = this._http.post<unknown>(resolvedUrl, resolvedBody ?? null, requestOptions);
                break;
            case 'PUT':
                request$ = this._http.put<unknown>(resolvedUrl, resolvedBody ?? null, requestOptions);
                break;
            case 'PATCH':
                request$ = this._http.patch<unknown>(resolvedUrl, resolvedBody ?? null, requestOptions);
                break;
            case 'DELETE':
                request$ = this._http.delete<unknown>(resolvedUrl, requestOptions);
                break;
        }

        const source$ = delayMs ? request$.pipe(rxDelay(delayMs)) : request$;

        this._subscription = source$.subscribe({
            next: (response: HttpResponse<unknown>) => {
                try {
                    const rawBody = response.body;
                    const parsed = parse ? parse(rawBody) : rawBody as T;
                    this._value.set(parsed);
                    this._headers.set(response.headers);
                    this._statusCode.set(response.status);
                    this._error.set(undefined);
                    this._status.set('resolved');
                } catch (parseError) {
                    this._error.set(parseError);
                    this._statusCode.set(response.status);
                    this._status.set('error');
                }
            },
            error: (err: HttpErrorResponse) => {
                this._error.set(err);
                this._statusCode.set(err.status);
                this._status.set('error');
            },
        });
    }

    private abortRequest(): void {
        if (this._subscription) {
            this._subscription.unsubscribe();
            this._subscription = null;
        }
    }

    private resetState(): void {
        this._value.set(this._defaultValue);
        this._error.set(undefined);
        this._status.set('idle');
        this._headers.set(undefined);
        this._statusCode.set(undefined);
        this._isLoaded.set(false);
    }

    private buildParams(
        params: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>> | undefined
    ): HttpParams | undefined {
        if (!params) return undefined;

        let httpParams = new HttpParams();
        for (const key in params) {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                const val = params[key];
                if (Array.isArray(val)) {
                    for (const item of val) {
                        httpParams = httpParams.append(key, String(item));
                    }
                } else {
                    httpParams = httpParams.set(key, String(val));
                }
            }
        }
        return httpParams;
    }
}
