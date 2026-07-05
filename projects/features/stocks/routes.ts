import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'summary', pathMatch: 'full' },
  {
    path: 'summary',
    loadComponent: () => import('./pages/summary/summary-container').then(m => m.SummaryContainer),
    data: { breadcrumb: 'Summary' },
  },
  {
    path: 'breakdown',
    loadComponent: () => import('./pages/breakdown/breakdown-container').then(m => m.BreakdownContainer),
    data: { breadcrumb: 'Breakdown' },
  },
];
