import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./settings-page') },
  {
    path: 'categories',
    title: 'Catégories',
    loadComponent: () => import('./categories/categories-page'),
  },
  { path: 'comptes', title: 'Comptes', loadComponent: () => import('./accounts/accounts-page') },
  {
    path: 'recurrentes',
    title: 'Transactions récurrentes',
    loadComponent: () => import('./recurring/recurring-page'),
  },
] satisfies Routes;
