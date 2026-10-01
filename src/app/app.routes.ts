import { Routes } from '@angular/router';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'accueil' },
      {
        path: 'accueil',
        title: 'Accueil',
        loadComponent: () => import('./features/home/home-page'),
      },
      {
        path: 'transactions',
        title: 'Transactions',
        loadComponent: () => import('./features/transactions/transactions-page'),
      },
      {
        path: 'budget',
        title: 'Budget',
        loadComponent: () => import('./features/budget/budget-page'),
      },
      {
        path: 'parametres',
        title: 'Paramètres',
        loadChildren: () => import('./features/settings/settings.routes'),
      },
    ],
  },
  { path: '**', redirectTo: 'accueil' },
];
