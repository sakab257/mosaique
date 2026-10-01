/**
 * Material Symbols Rounded utilisés par l'app.
 *
 * La police est auto-hébergée en sous-ensemble (src/fonts) : seules ces icônes y figurent.
 * Après tout ajout, relancer `npm run fonts` (le test icons.spec.ts vérifie la cohérence).
 */
export const UI_ICONS = [
  'account_balance',
  'account_balance_wallet',
  'add',
  'arrow_forward',
  'autorenew',
  'calendar_today',
  'check',
  'chevron_left',
  'chevron_right',
  'close',
  'credit_card',
  'dataset',
  'delete',
  'download',
  'eco',
  'edit',
  'edit_note',
  'error',
  'euro',
  'expand_less',
  'expand_more',
  'grid_view',
  'info',
  'install_mobile',
  'ios_share',
  'layers',
  'lock',
  'more_vert',
  'offline_pin',
  'pause',
  'play_arrow',
  'receipt_long',
  'restart_alt',
  'savings',
  'schedule',
  'search',
  'sell',
  'settings',
  'swap_horiz',
  'swap_vert',
  'upload',
  'warning',
] as const;

/** Icônes proposées dans le sélecteur des catégories / sous-catégories. */
export const CATEGORY_ICONS = [
  'bakery_dining',
  'bolt',
  'card_giftcard',
  'celebration',
  'chair',
  'checkroom',
  'child_care',
  'confirmation_number',
  'devices',
  'directions_bus',
  'directions_car',
  'fitness_center',
  'flight',
  'health_and_safety',
  'home',
  'key',
  'local_bar',
  'local_cafe',
  'local_gas_station',
  'local_pharmacy',
  'local_taxi',
  'medical_services',
  'menu_book',
  'more_horiz',
  'movie',
  'music_note',
  'palette',
  'payments',
  'pets',
  'photo_camera',
  'receipt_long',
  'redeem',
  'restaurant',
  'savings',
  'school',
  'shield',
  'shopping_bag',
  'shopping_cart',
  'smartphone',
  'spa',
  'sports_esports',
  'sports_soccer',
  'subscriptions',
  'train',
  'volunteer_activism',
  'water_drop',
  'wifi',
  'work',
] as const;

export type UiIconName = (typeof UI_ICONS)[number];
export type CategoryIconName = (typeof CATEGORY_ICONS)[number];
export type IconName = UiIconName | CategoryIconName;

/** Liste triée et dédoublonnée, telle qu'attendue par le paramètre `icon_names` de Google Fonts. */
export const ALL_ICON_NAMES: readonly IconName[] = [
  ...new Set<IconName>([...UI_ICONS, ...CATEGORY_ICONS]),
].sort();

const known = new Set<string>(ALL_ICON_NAMES);
export function isIconName(value: string): value is IconName {
  return known.has(value);
}

/** Nom d'icône issu des données (catégories) : repli sur `fallback` s'il est inconnu. */
export function toIconName(
  value: string | null | undefined,
  fallback: IconName = 'more_horiz',
): IconName {
  return value && isIconName(value) ? value : fallback;
}

/** Libellés accessibles des icônes du sélecteur de catégories. */
export const CATEGORY_ICON_LABELS: Record<CategoryIconName, string> = {
  bakery_dining: 'Boulangerie',
  bolt: 'Énergie',
  card_giftcard: 'Carte cadeau',
  celebration: 'Fête',
  chair: 'Mobilier',
  checkroom: 'Vêtements',
  child_care: 'Enfants',
  confirmation_number: 'Billet',
  devices: 'Appareils',
  directions_bus: 'Bus',
  directions_car: 'Voiture',
  fitness_center: 'Sport',
  flight: 'Avion',
  health_and_safety: 'Mutuelle',
  home: 'Maison',
  key: 'Clé',
  local_bar: 'Bar',
  local_cafe: 'Café',
  local_gas_station: 'Carburant',
  local_pharmacy: 'Pharmacie',
  local_taxi: 'Taxi',
  medical_services: 'Santé',
  menu_book: 'Livres',
  more_horiz: 'Divers',
  movie: 'Cinéma',
  music_note: 'Musique',
  palette: 'Loisirs créatifs',
  payments: 'Paiements',
  pets: 'Animaux',
  photo_camera: 'Photo',
  receipt_long: 'Factures',
  redeem: 'Cadeau',
  restaurant: 'Restaurant',
  savings: 'Épargne',
  school: 'École',
  shield: 'Assurance',
  shopping_bag: 'Shopping',
  shopping_cart: 'Courses',
  smartphone: 'Téléphone',
  spa: 'Bien-être',
  sports_esports: 'Jeux vidéo',
  sports_soccer: 'Football',
  subscriptions: 'Abonnements',
  train: 'Train',
  volunteer_activism: 'Dons',
  water_drop: 'Eau',
  wifi: 'Internet',
  work: 'Travail',
};
