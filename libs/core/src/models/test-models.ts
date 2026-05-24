import { Domain, DomainConstructor, DomainList, DomainListConstructor } from '../base/domain/domain-base';

/**
 * Test domain model used by domain-base.spec.ts.
 * Mirrors the Stock model from AngularStockTicker for test compatibility.
 */
export class Stock extends Domain<Stock> {
    id: string;
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number;
    high52w: number;
    low52w: number;
    sector: string;

    constructor(data?: Partial<Stock>) {
        super(Stock as DomainConstructor<Stock>);
        this.id = data?.id ?? '';
        this.symbol = data?.symbol ?? '';
        this.name = data?.name ?? '';
        this.price = data?.price ?? 0;
        this.change = data?.change ?? 0;
        this.changePercent = data?.changePercent ?? 0;
        this.volume = data?.volume ?? 0;
        this.marketCap = data?.marketCap ?? 0;
        this.high52w = data?.high52w ?? 0;
        this.low52w = data?.low52w ?? 0;
        this.sector = data?.sector ?? '';
    }

    get isGain(): boolean {
        return this.change >= 0;
    }

    get formattedPrice(): string {
        return `$${this.price.toFixed(2)}`;
    }

    get formattedChange(): string {
        const sign = this.change >= 0 ? '+' : '';
        return `${sign}${this.change.toFixed(2)} (${sign}${this.changePercent.toFixed(2)}%)`;
    }

    get formattedVolume(): string {
        if (this.volume >= 1_000_000_000) return `${(this.volume / 1_000_000_000).toFixed(1)}B`;
        if (this.volume >= 1_000_000) return `${(this.volume / 1_000_000).toFixed(1)}M`;
        if (this.volume >= 1_000) return `${(this.volume / 1_000).toFixed(1)}K`;
        return `${this.volume}`;
    }

    get formattedMarketCap(): string {
        if (this.marketCap >= 1_000_000_000_000) return `$${(this.marketCap / 1_000_000_000_000).toFixed(2)}T`;
        if (this.marketCap >= 1_000_000_000) return `$${(this.marketCap / 1_000_000_000).toFixed(2)}B`;
        if (this.marketCap >= 1_000_000) return `$${(this.marketCap / 1_000_000).toFixed(2)}M`;
        return `$${this.marketCap}`;
    }
}

export class StockList extends DomainList<Stock> {
    static override readonly itemType = Stock as DomainConstructor<Stock>;

    constructor(items?: Array<Partial<Stock> | Stock>) {
        super(
            Stock as DomainConstructor<Stock>,
            StockList as unknown as DomainListConstructor<Stock, StockList>,
            items,
        );
    }

    get gainers(): Stock[] {
        return this.filter(s => s.change > 0).sort((a, b) => b.changePercent - a.changePercent);
    }

    get losers(): Stock[] {
        return this.filter(s => s.change < 0).sort((a, b) => a.changePercent - b.changePercent);
    }

    get totalMarketCap(): number {
        return this.reduce((sum, s) => sum + s.marketCap, 0);
    }
}
