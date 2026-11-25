import { Role } from './types';

export type RouteId =
  | 'dashboard'
  | 'batches'
  | 'printing'
  | 'products'
  | 'templates'
  | 'company'
  | 'audit'
  | 'reports'
  | 'backup';

export interface AppRouteConfig {
  id: RouteId;
  path: string;
  title: string;
  roles: Role[];
}

export const APP_ROUTES: Record<RouteId, AppRouteConfig> = {
  dashboard: {
    id: 'dashboard',
    path: '/dashboard',
    title: 'Dashboard',
    roles: ['SuperAdmin', 'Admin', 'Supervisor', 'Operator'],
  },
  batches: {
    id: 'batches',
    path: '/batches',
    title: 'Batch & Drums',
    roles: ['SuperAdmin', 'Admin', 'Supervisor', 'Operator'],
  },
  printing: {
    id: 'printing',
    path: '/printing',
    title: 'Label Printing',
    roles: ['SuperAdmin', 'Supervisor', 'Operator'],
  },
  products: {
    id: 'products',
    path: '/products',
    title: 'Product Master',
    roles: ['SuperAdmin', 'Admin', 'Supervisor', 'Operator'],
  },
  templates: {
    id: 'templates',
    path: '/templates',
    title: 'Label Templates',
    roles: ['SuperAdmin', 'Admin', 'Supervisor'],
  },
  company: {
    id: 'company',
    path: '/company',
    title: 'Company & GS1',
    roles: ['SuperAdmin', 'Admin'],
  },
  audit: {
    id: 'audit',
    path: '/audit',
    title: 'Audit Trail',
    roles: ['SuperAdmin', 'Admin', 'Supervisor'],
  },
  reports: {
    id: 'reports',
    path: '/reports',
    title: 'Reports',
    roles: ['SuperAdmin', 'Admin', 'Supervisor'],
  },
  backup: {
    id: 'backup',
    path: '/backup',
    title: 'Licensing & Backup',
    roles: ['SuperAdmin', 'Admin'],
  },
};

/** Resolve a tab/route ID to its URL path, falling back to /dashboard. */
export function getRouteForTab(tab: string): string {
  const route = APP_ROUTES[tab as RouteId];
  return route ? route.path : APP_ROUTES.dashboard.path;
}

/** Resolve a URL pathname back to a RouteId for sidebar/tab highlighting. */
export function getTabFromPath(pathname: string): RouteId {
  const normalized = pathname.replace(/\/+$/, '') || '/dashboard';
  const match = Object.values(APP_ROUTES).find(
    (route) => normalized === route.path || normalized.startsWith(`${route.path}/`)
  );
  return match ? match.id : 'dashboard';
}
