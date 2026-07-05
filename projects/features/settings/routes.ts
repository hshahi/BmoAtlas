import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'general', pathMatch: 'full' },
  {
    path: 'general',
    loadComponent: () => import('./pages/general/general').then(m => m.GeneralSettings),
    data: { breadcrumb: 'General' },
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileSettings),
    data: { breadcrumb: 'Profile' },
  },
];
