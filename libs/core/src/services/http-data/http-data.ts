
import { Injector, ResourceStatus, runInInjectionContext, Signal, computed, signal } from '@angular/core'; 
import { HttpHeaders, HttpProgressEvent, httpResource, HttpResourceRef } from '@angular/common/http';

export type HttpMethod = 'GET'| 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface DataOptions<T, TBody = unknown> {
    url: string | (() => string);
    method?: HttpMethod;
    headers?: Record<string, string | ReadonlyArray<string>>;
    params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
    body?: TBody | (() => TBody);
    defaultValue?: T;
    parse?: (response: unknown) => T;
    reportProgress?: boolean;
    /** Delay in milliseconds before the HTTP resource is created. The status transitions to 'loading' immediately. */
    delay?: number;
}

export type MutationOptions<T, TBody> = Omit<DataOptions<T, TBody>, 'method'> & {
    body: TBody | (() => TBody);
};

export type GetOptions<T> = Omit<DataOptions<T>, 'method' | 'body'>;

export class HttpData<T, TBody = unknown> {

    static get<T>(injector: Injector, options: GetOptions<T>): HttpData<T> {
        return new HttpData<T>(injector, { ...options, method: 'GET' });
    }

    static post<T, TBody>(injector: Injector, options: MutationOptions<T, TBody>): HttpData<T, TBody> {
        return new HttpData<T, TBody>(injector, { ...options, method: 'POST' });
    }

    static put<T, TBody>(injector: Injector, options: MutationOptions<T, TBody>): HttpData<T, TBody> {
        return new HttpData<T, TBody>(injector, { ...options, method: 'PUT' });
    }

    static patch<T, TBody>(injector: Injector, options: MutationOptions<T, TBody>): HttpData<T, TBody> {
        return new HttpData<T, TBody>(injector, { ...options, method: 'PATCH' });
    }

    private readonly _resource = signal<HttpResourceRef<T | undefined> | null>(null);
    private readonly _delayedStatus = signal<ResourceStatus | null>(null);
    private _delayTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly _defaultValue: T | undefined;
    private readonly _data: Signal<T | undefined>; 
    private readonly _error: Signal<unknown>; 
    private readonly _status: Signal<ResourceStatus>; 
    private readonly _isIdle: Signal <boolean>; 
    private readonly _isLoading: Signal <boolean>; 
    private readonly _isReloading: Signal <boolean>; 
    private readonly _isPending: Signal <boolean>; 
    private readonly _isSuccess: Signal<boolean>; 
    private readonly _isError: Signal<boolean>;
    private readonly _isLocal: Signal <boolean>; 
    private readonly _hasValue: Signal <boolean>;
    private readonly _isLoaded: Signal <boolean>;
    private readonly _headers: Signal<HttpHeaders | undefined>;
    private readonly _statusCode: Signal<number | undefined>;
    private readonly _progress: Signal<HttpProgressEvent | undefined>;

    constructor(
        private readonly injector: Injector, 
        private readonly options: DataOptions<T, TBody>) { 
           
        this._defaultValue = options.defaultValue;
        this._data =        computed (() => this._resource()?.value() ?? this._defaultValue); 
        this._error =       computed (() => this._resource()?.error() ?? undefined);
        this._status =      computed (() => this._delayedStatus() ?? this._resource()?.status() ?? 'idle' as ResourceStatus);
        this._isIdle =      computed (() => { const s = this._status(); return s === 'idle'; });
        this._isLoading =   computed (() => { const s = this._status(); return s === 'loading'; });
        this._isReloading = computed (() => { const r = this._resource(); return r ? r.status() === 'reloading' : false; }); 
        this._isPending =   computed (() => { const r = this._resource(); return r ? (r.status() === 'loading' || r.status() === 'reloading') : false; }); 
        this._isSuccess =   computed (() => { const r = this._resource(); return r ? r.status() === 'resolved' : false; }); 
        this._isError =     computed (() => { const r = this._resource(); return r ? r.status() === 'error' : false; }); 
        this._isLocal =     computed (() => { const r = this._resource(); return r ? r.status() === 'local' : false; }); 
        this._hasValue =    computed (() => { const r = this._resource(); return r ? r.hasValue() : this._defaultValue !== undefined; }); 
        this._isLoaded =    computed (() => this._resource() !== null);
        this._headers =     computed (() => this._resource()?.headers());
        this._statusCode =  computed (() => this._resource()?.statusCode());
        this._progress =    computed (() => this._resource()?.progress());
    }

    get value():      Signal<T | undefined> { return this._data; }
    get error():      Signal<unknown> { return this._error; }
    get status():     Signal<ResourceStatus> { return this._status; }
    get isIdle():     Signal<boolean> { return this._isIdle; }
    get isLoading():  Signal<boolean> { return this._isLoading; }
    get isReloading(): Signal<boolean> { return this._isReloading; }
    get isPending():  Signal<boolean> { return this._isPending; }
    get isSuccess():  Signal<boolean> { return this._isSuccess; }
    get isError():    Signal<boolean> { return this._isError; }
    get isLocal():    Signal<boolean> { return this._isLocal; }
    get hasValue():   Signal<boolean> { return this._hasValue; }
    get isLoaded():   Signal<boolean> { return this._isLoaded; }
    get headers():    Signal<HttpHeaders | undefined> { return this._headers; }
    get statusCode(): Signal<number | undefined> { return this._statusCode; }
    get progress():   Signal<HttpProgressEvent | undefined> { return this._progress; }

    
    reload(): void { 
        const res = this._resource();
        if (res) {
            res.reload();
        }
    }

    set(value: T): void { 
       let res = this._resource();
        if(!res) {
            res = this.createResource();
            this._resource.set(res);
        } 
        res.set(value);
    }

    update(updateFn: (current: T | undefined) => T | undefined): void { 
        let res = this._resource();
        if(!res) {
            res = this.createResource();
            this._resource.set(res);
        } 
        res.update(updateFn);
    }

    cancel(): void {
        this.clearDelayTimer();
        const res = this._resource();
        if (!res) return;

        const status = res.status();
        if (status !== 'loading' && status !== 'reloading') return;

        res.destroy();
        this._resource.set(null);
    }

    destroy(): void {
        this.clearDelayTimer();
        const res = this._resource();
        if (res) {
            res.destroy();
            this._resource.set(null);
        }
    }

   get resource(): HttpResourceRef<T | undefined> | null {
      return this._resource();
   }

    map<U> (mapFn: (data: T) => U): Signal<U | undefined> { 
      return computed(() => {
        const val = this._resource()?.value();
            return val != undefined ? mapFn(val): undefined;
        });
    }

    getOrDefault(defaultValue: T): Signal<T> {
        return computed(() => this._resource()?.value() ?? defaultValue);
    }

    load(): void {
        const res = this._resource();
        if(!res) {
            const delayMs = this.options.delay;
            if (delayMs) {
                this._delayedStatus.set('loading');
                this.clearDelayTimer();
                this._delayTimer = setTimeout(() => {
                    this._delayTimer = null;
                    this._delayedStatus.set(null);
                    this._resource.set(this.createResource());
                }, delayMs);
            } else {
                this._resource.set(this.createResource());
            }
        } else {
            res.reload();
        }
    }

    private clearDelayTimer(): void {
        if (this._delayTimer !== null) {
            clearTimeout(this._delayTimer);
            this._delayTimer = null;
            this._delayedStatus.set(null);
        }
    }

   
    private createResource(): HttpResourceRef<T | undefined> {
        return runInInjectionContext(this.injector, () => {
            const { url, method, headers, params, body, defaultValue, parse, reportProgress} = this.options;

            return httpResource<T>(() => ({ 
                url: typeof url === 'function'? url(): url, 
                method: method ?? 'GET', 
                headers, 
                params: this.convertParams(params), 
                body: body && typeof body === 'function' ? (body as () => TBody) (): body,
                reportProgress }), { 
                    defaultValue, 
                    parse 
            });
        });
    }


    private convertParams (
        params: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>> | undefined
    ): Record<string, string | ReadonlyArray<string>> | undefined { 

        if (!params) 
            return undefined;

        const result: Record<string, string | ReadonlyArray<string>> = {};
        for (const key in params) { 
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                const val = params[key];
                if (Array.isArray(val)) {
                    result[key] = val.map(v => String(v));
                } else {
                    result[key] = String(val); 
                }
            }
        }
        return result;
    }
}
