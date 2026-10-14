import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

/** Les pages sont chargées à la demande (lazy loading) pour alléger le premier chargement. */
export const routes: Routes = [
  {
    path: 'connexion',
    canActivate: [guestGuard],
    title: 'Connexion · Kontwa Console',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'commandes' },
      {
        path: 'commandes',
        title: 'Commandes · Kontwa Console',
        loadComponent: () => import('./features/orders/orders-page.component').then((m) => m.OrdersPageComponent),
      },
      {
        path: 'commandes/:id',
        title: 'Commande · Kontwa Console',
        loadComponent: () => import('./features/orders/order-detail.component').then((m) => m.OrderDetailComponent),
      },
      {
        path: 'catalogue',
        title: 'Catalogue · Kontwa Console',
        loadComponent: () => import('./features/catalog/catalog-page.component').then((m) => m.CatalogPageComponent),
      },
      {
        path: 'statistiques',
        title: 'Statistiques · Kontwa Console',
        loadComponent: () => import('./features/stats/stats-page.component').then((m) => m.StatsPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
