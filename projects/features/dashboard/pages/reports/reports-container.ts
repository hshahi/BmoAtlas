import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-reports',
  template: `
    <div class="reports">
      <h2 class="reports__title">Reports</h2>
      <div class="card">
        <table class="reports__table">
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Type</th>
              <th>Generated</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Monthly Revenue Summary</td>
              <td>Financial</td>
              <td>2026-05-15</td>
              <td><span class="badge badge--gain">Complete</span></td>
            </tr>
            <tr>
              <td>User Acquisition Report</td>
              <td>Marketing</td>
              <td>2026-05-14</td>
              <td><span class="badge badge--gain">Complete</span></td>
            </tr>
            <tr>
              <td>Q2 Performance Analysis</td>
              <td>Operations</td>
              <td>2026-05-13</td>
              <td><span class="badge badge--loss">Pending</span></td>
            </tr>
            <tr>
              <td>Customer Satisfaction Survey</td>
              <td>Support</td>
              <td>2026-05-12</td>
              <td><span class="badge badge--gain">Complete</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .reports__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      margin-bottom: var(--space-lg);
    }
    .reports__table {
      width: 100%;
      text-align: left;
    }
    .reports__table th {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--color-text-secondary);
      padding: var(--space-sm) var(--space-md);
      border-bottom: 2px solid var(--color-border);
    }
    .reports__table td {
      font-size: var(--text-sm);
      padding: var(--space-sm) var(--space-md);
      border-bottom: 1px solid var(--color-border);
    }
    .reports__table tr:last-child td {
      border-bottom: none;
    }
    .reports__table tr:hover td {
      background: var(--color-bg-muted);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsContainer {}
