// ── Web Worker: Generates random monthly time series data ────────────
// Produces data matching the Alpha Vantage TIME_SERIES_MONTHLY shape
// so it can be parsed by parseMonthlyResponse().

interface MonthlyEntry {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

interface AlphaVantageMonthlyShape {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Monthly Time Series': Record<string, MonthlyEntry>;
}

type WorkerCommand =
  | { type: 'generate'; symbol: string; months: number };

type WorkerMessage =
  | { type: 'data'; payload: AlphaVantageMonthlyShape };

// ── Price Generation ────────────────────────────────────────────────

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateMonthlyData(symbol: string, months: number): AlphaVantageMonthlyShape {
  const series: Record<string, MonthlyEntry> = {};

  // Start from a random base price between 50 and 500
  let close = 50 + Math.random() * 450;
  const volatility = 0.04 + Math.random() * 0.06; // 4-10% monthly volatility

  const now = new Date();

  for (let i = 0; i < months; i++) {
    // Walk backwards from current month
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // Use last day of month for the date key
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const dateKey = lastDay.toISOString().slice(0, 10);

    // Generate OHLCV from close price
    const change = volatility * gaussianRandom();
    const open = close / (1 + change); // derive open from close so close = open * (1 + change)
    const highExtra = Math.abs(gaussianRandom()) * volatility * close * 0.5;
    const lowExtra = Math.abs(gaussianRandom()) * volatility * close * 0.5;
    const high = Math.max(open, close) + highExtra;
    const low = Math.max(0.01, Math.min(open, close) - lowExtra);
    const volume = Math.floor(2_000_000 + Math.random() * 15_000_000);

    series[dateKey] = {
      '1. open': open.toFixed(4),
      '2. high': high.toFixed(4),
      '3. low': low.toFixed(4),
      '4. close': close.toFixed(4),
      '5. volume': volume.toString(),
    };

    // Next iteration: the previous month's close becomes a random walk step back
    close = open; // previous month's close is this month's open
  }

  const latestDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    'Meta Data': {
      '1. Information': 'Monthly Prices (open, high, low, close) and Volumes',
      '2. Symbol': symbol,
      '3. Last Refreshed': latestDate.toISOString().slice(0, 10),
      '4. Output Size': 'Full size',
      '5. Time Zone': 'US/Eastern',
    },
    'Monthly Time Series': series,
  };
}

// ── Message Handler ─────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;

  switch (command.type) {
    case 'generate': {
      const data = generateMonthlyData(command.symbol, command.months);
      const message: WorkerMessage = { type: 'data', payload: data };
      self.postMessage(message);
      break;
    }
  }
};

console.log('[Worker] Stock monthly data generator initialized');
