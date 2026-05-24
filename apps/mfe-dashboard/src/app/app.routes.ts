import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  {
    path: 'overview',
    loadComponent: () => import('./pages/overview/overview-container').then(m => m.OverviewContainer),
    data: { breadcrumb: 'Overview' },
  },
  {
    path: 'analytics',
    loadComponent: () => import('./pages/analytics/analytics-container').then(m => m.AnalyticsContainer),
    data: { breadcrumb: 'Analytics' },
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports-container').then(m => m.ReportsContainer),
    data: { breadcrumb: 'Reports' },
  },
];
