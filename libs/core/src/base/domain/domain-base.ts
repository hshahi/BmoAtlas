
export type DomainConstructor<T extends Domain<T>> = new(data?: Partial<T>) => T; 
export type DomainListConstructor<T extends Domain<T>, L extends DomainList<T>> = new (items?: Array<Partial<T> | T>) => L;


export abstract class Domain<T extends Domain<T>> {
    abstract id: string | number;

    constructor(protected readonly domainType?: DomainConstructor<T>) {}

    clone(): T {
        return new (this.domainType ?? (this.constructor as DomainConstructor<T>)) (this.toJson() as Partial<T>);
    }

    equals(other: T): boolean {
        if (!(other instanceof Domain)) return false;
        return JSON.stringify(this.toJson()) === JSON.stringify(other.toJson());
    }

    toJson(): Record<string, unknown> {

        const json: Record<string, unknown> = {};
        for (const key of Object.keys(this)) { 
            if (key === 'domainType') 
                continue;
            json[key] = this.serializeValue((this as Record<string, unknown>) [key]); 
        } 
        return json;
    }

    private serializeValue(value: unknown): unknown {
        if (value === null || value === undefined) 
            return value;

        if (value instanceof Domain) 
            return value.toJson();

        if (Array.isArray(value)) 
            return value.map(i => this.serializeValue(i));

        if (value instanceof Date) 
            return value.toISOString();

        if (typeof value === 'object') { 
            const obj: Record<string, unknown> = {};
            for (const key of Object.keys(value)) { 
                obj[key] = this.serializeValue((value as Record<string, unknown >) [key]); 
            } return obj; 
        }

        return value;
    }

    /**
     * Construct a new instance from partial data.
     *
     * The default implementation simply calls `new this(data)`, which works
     * when the constructor already handles all field mapping and defaults.
     *
     * When the incoming JSON shape does not match the domain class properties
     * (e.g. snake_case keys, values that need transformation), handle the
     * mapping in the **constructor** so that both `fromJson()` and `clone()`
     * work correctly:
     *
     * ```ts
     * class Order extends Domain<Order> {
     *   id: string;
     *   total: number;       // stored in dollars
     *   createdAt: Date;
     *
     *   constructor(data?: Partial<Order> | Record<string, unknown>) {
     *     super(Order);
     *     const d = (data ?? {}) as Record<string, unknown>;
     *     this.id        = (d['id'] ?? d['order_id'] ?? '') as string;
     *     this.total     = d['total_cents'] !== undefined
     *                        ? (d['total_cents'] as number) / 100
     *                        : (d['total'] as number) ?? 0;
     *     const rawDate  = d['createdAt'] ?? d['created_at'];
     *     this.createdAt = rawDate instanceof Date
     *                        ? rawDate
     *                        : new Date((rawDate as string) ?? 0);
     *   }
     * }
     *
     * // Usage with HttpClientData parse:
     * parse: (raw) => Order.fromJson(raw as Record<string, unknown>)
     * ```
     */
    static fromJson<T extends Domain<T>>(
        this: DomainConstructor<T>,
        data: Partial<T> | Record<string, unknown>): T {

        return new this(data as Partial<T>);
    }
}

export class DomainList<T extends Domain<T>> extends Array<T> {

    static override get [Symbol.species](): ArrayConstructor { return Array; }

    static readonly itemType?: DomainConstructor<any>;

    constructor(
        protected readonly itemType: DomainConstructor<T>, 
        protected readonly listType?: DomainListConstructor<T, any>, 
        items?: Array<Partial<T> | T>) {

        super();
        Object.setPrototypeOf(this, new.target.prototype);
        if (items) { 
            for (const item of items) { 
                this.push(item instanceof Domain ? item as T: new itemType(item)); 
            } 
        }
    }

    static instance<T extends Domain<T>>(
            itemType: DomainConstructor<T>, 
            items?: Array<Partial<T> | T>
        ): DomainList<T> { 
        return new DomainList(itemType, undefined, items); 
    }

    // DomainList.fromJson(type, data) OR DomainList.fromJson(data)
    static fromJson<T extends Domain<T>>(itemType: DomainConstructor<T>, data: Array<Partial<T>>): DomainList<T>;
    static fromJson<L extends DomainList<any>>(this: { new(items?: any[]): L; itemType: DomainConstructor<any> }, data: Array<Record<string, unknown>>): L;
    static fromJson(itemTypeOrData: DomainConstructor<any> | Array<any>, data?: Array<any>): DomainList<any> {
        if (Array.isArray(itemTypeOrData)) {
            const ListClass = this as unknown as {
                new(items?: Array<any>): DomainList<any>; 
                itemType?: DomainConstructor<any>;
            };

            if (ListClass.itemType && this !== DomainList) {
                return new ListClass(itemTypeOrData);
            }

            throw new Error('fromJson(data) requires static itemType to be defined on the subclass'); 
        }

        return new DomainList(itemTypeOrData, undefined, data);

    }

    clone(): this { 
        const clonedItems = this.map(i => i.clone()); 
         if(this.listType) {
             return new this.listType(clonedItems) as this;
         }
       
        return new DomainList(this.itemType, this.listType, clonedItems) as this; 
    }

    toJson(): Record<string, unknown>[] { 
        return this.map(i => i.toJson()); 
    }

}
