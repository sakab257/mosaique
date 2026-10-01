import { IconName } from '../shared/ui/icon/icons';

export interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/accueil', label: 'Accueil', icon: 'grid_view' },
  { path: '/transactions', label: 'Transactions', icon: 'swap_horiz' },
  { path: '/budget', label: 'Budget', icon: 'savings' },
  { path: '/parametres', label: 'Paramètres', icon: 'settings' },
];
