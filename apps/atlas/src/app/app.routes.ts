import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Home' },
  },

  // ── Search (page discovery) ─────────────────────────────
  {
    path: 'search',
    data: { breadcrumb: 'Search' },
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/search/search-page').then(m => m.SearchPage),
      },
      {
        path: 'detail/:pageId',
        loadComponent: () => import('./pages/search/page-detail').then(m => m.PageDetail),
        data: { breadcrumb: 'Page Detail' },
      },
    ],
  },

  // ── Front Office (area with 2 MFE apps) ──────────────────
  {
    path: 'front-office',
    loadComponent: () => import('./pages/area-shell/area-shell').then(m => m.AreaShell),
    data: { breadcrumb: 'Front Office' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () =>
          loadRemoteModule('mfe-dashboard', './routes').then(m => m.routes),
        data: { breadcrumb: 'Dashboard' },
      },
      {
        path: 'settings',
        loadChildren: () =>
          loadRemoteModule('mfe-settings', './routes').then(m => m.routes),
        data: { breadcrumb: 'Settings' },
      },
      {
        path: 'stocks',
        loadChildren: () =>
          loadRemoteModule('mfe-stocks', './routes').then(m => m.routes),
        data: { breadcrumb: 'Stocks' },
      },
    ],
  },

  // ── Placeholder routes for other menu areas ───────────────
  {
    path: 'schedule',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Schedule' },
  },
  {
    path: 'cmart',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'CMART' },
  },
  {
    path: 'fca-reporting',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'FCA Reporting' },
  },
  {
    path: 'regulatory-reporting',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Regulatory Reporting' },
  },
  {
    path: 'internal-bmo-reporting',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Internal BMO Reporting' },
  },
  {
    path: 'liquidity-risk',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Liquidity Risk' },
  },
  {
    path: 'operations',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Operations' },
  },
  {
    path: 'cash-rec',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Cash Rec' },
  },
  {
    path: 'audit',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Audit' },
  },
  {
    path: 'platform-data',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Platform Data' },
  },
  {
    path: 'reconciliation',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Reconciliation' },
  },
  {
    path: 'adenza',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Adenza' },
  },
  {
    path: 'statistics',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Statistics' },
  },
  {
    path: 'counterparty',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Counterparty' },
  },
  {
    path: 'securities',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'Securities' },
  },
  {
    path: 'ifpr',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    data: { breadcrumb: 'IFPR' },
  },
  { path: '**', redirectTo: 'home' },
];
