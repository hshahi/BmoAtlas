import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-analytics',
  template: `
    <div class="analytics">
      <h2 class="analytics__title">Analytics</h2>
      <div class="analytics__grid">
        <div class="card analytics__chart">
          <h3>Traffic Sources</h3>
          <div class="analytics__placeholder">
            <p>📊 Chart placeholder — integrate your preferred charting library</p>
          </div>
          <ul class="analytics__legend">
            <li><span class="analytics__dot" style="background: var(--color-primary)"></span> Direct — 45%</li>
            <li><span class="analytics__dot" style="background: var(--color-success)"></span> Organic — 30%</li>
            <li><span class="analytics__dot" style="background: var(--color-warning)"></span> Referral — 15%</li>
            <li><span class="analytics__dot" style="background: var(--color-info)"></span> Social — 10%</li>
          </ul>
        </div>
        <div class="card analytics__chart">
          <h3>User Activity</h3>
          <div class="analytics__placeholder">
            <p>📈 Time series chart placeholder</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      margin-bottom: var(--space-lg);
    }
    .analytics__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: var(--space-md);
    }
    .analytics__chart h3 {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      margin-bottom: var(--space-md);
    }
    .analytics__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      background: var(--color-bg-muted);
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      margin-bottom: var(--space-md);
    }
    .analytics__legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-md);
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    .analytics__legend li {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }
    .analytics__dot {
      width: 10px;
      height: 10px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsContainer {}
