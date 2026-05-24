import { Injectable } from '@angular/core';
import { Observable, Subject, take } from 'rxjs';
import { delay as rxDelay, map } from 'rxjs/operators';
import { StockData, parseMonthlyResponse } from '../models/stock.models';

interface WorkerDataMessage {
  type: 'data';
  payload: unknown;
}

/**
 * Inline worker source code.
 * Embedded as a string so it can be created via Blob URL,
 * avoiding cross-origin issues in Module Federation setups.
 */
const WORKER_SOURCE = `
function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateMonthlyData(symbol, months) {
  const series = {};
  let close = 50 + Math.random() * 450;
  const volatility = 0.04 + Math.random() * 0.06;
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const dateKey = lastDay.toISOString().slice(0, 10);

    const change = volatility * gaussianRandom();
    const open = close / (1 + change);
    const highExtra = Math.abs(gaussianRandom()) * volatility * close * 0.5;
    const lowExtra = Math.abs(gaussianRandom()) * volatility * close * 0.5;
    const high = Math.max(open, close) + highExtra;
    const low = Math.max(0.01, Math.min(open, close) - lowExtra);
    const volume = Math.floor(2000000 + Math.random() * 15000000);

    series[dateKey] = {
      '1. open': open.toFixed(4),
      '2. high': high.toFixed(4),
      '3. low': low.toFixed(4),
      '4. close': close.toFixed(4),
      '5. volume': volume.toString(),
    };

    close = open;
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

self.onmessage = function(event) {
  const command = event.data;
  if (command.type === 'generate') {
    const data = generateMonthlyData(command.symbol, command.months);
    self.postMessage({ type: 'data', payload: data });
  }
};
`;

/**
 * Service that generates random monthly stock data via an inline Web Worker.
 * Used as a fallback when the Alpha Vantage API is rate-limited or unavailable.
 *
 * The worker runs on a separate thread and is created from a Blob URL
 * to avoid cross-origin restrictions in Module Federation setups.
 *
 * Usage:
 *   this.dataStreamService.generateLocalData('TSCO.LON').subscribe(data => {
 *     this.stockData.set(data);
 *   });
 */
@Injectable({ providedIn: 'root' })
export class DataStreamService {

  private worker: Worker | null = null;
  private blobUrl: string | null = null;
  private readonly workerMessage$ = new Subject<WorkerDataMessage>();

  /**
   * Generate random monthly stock data for the given symbol.
   * Returns a one-shot Observable that emits parsed StockData, then completes.
   */
  /**
   * Generate random monthly stock data for the given symbol.
   * Returns a one-shot Observable that emits parsed StockData, then completes.
   * Includes a minimum delay so the loading spinner is visible.
   */
  generateLocalData(symbol: string, months = 24): Observable<StockData> {
    this.ensureWorker();

    this.worker!.postMessage({ type: 'generate', symbol, months });

    return this.workerMessage$.pipe(
      take(1),
      map(msg => parseMonthlyResponse(msg.payload)),
      rxDelay(600),
    );
  }

  /**
   * Terminate the worker and clean up resources.
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }

  private ensureWorker(): void {
    if (this.worker) return;

    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
    this.blobUrl = URL.createObjectURL(blob);

    this.worker = new Worker(this.blobUrl);

    this.worker.onmessage = (event: MessageEvent<WorkerDataMessage>) => {
      this.workerMessage$.next(event.data);
    };

    this.worker.onerror = (error) => {
      console.error('[DataStreamService] Worker error:', error);
    };
  }
}
