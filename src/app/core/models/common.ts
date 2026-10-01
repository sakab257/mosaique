/** Identifiant opaque (UUID v4). */
export type Id = string;

/** Date calendaire locale, format `YYYY-MM-DD` (jamais convertie en UTC). */
export type IsoDate = string;

/** Date et heure locales, format `YYYY-MM-DDTHH:mm`. */
export type IsoDateTime = string;

/** Mois calendaire, format `YYYY-MM`. */
export type MonthKey = string;

/**
 * Montant en centimes d'euro (entier). Les montants de transactions et de règles sont
 * toujours positifs, le sens est porté par le `type` ; les soldes, eux, sont signés.
 */
export type Cents = number;

/** Couleur hexadécimale `#RRGGBB`. */
export type HexColor = string;
