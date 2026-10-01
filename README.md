# Mosaïque

Suivi de budget et de dépenses personnel — mobile-first, responsive desktop, en français et en euros.
Aucune authentification ni backend : toutes les données restent dans le navigateur.

## Démarrer

```bash
npm install
npm start          # ng serve → http://localhost:4200
npm test           # tests unitaires (Vitest)
npm run build      # build de production dans dist/
npm run serve:prod # build + serveur local http://localhost:8080 (service worker actif)
```

Pour essayer l'app rapidement : **Paramètres › Charger des données d’exemple**.

## Stack

- Angular 21 : composants standalone, `OnPush`, sans zone.js, Signals (`signal`, `computed`, `effect`),
  contrôle de flux `@if` / `@for`, routes chargées à la demande.
- Tailwind CSS v4 : les design tokens (couleurs, rayons, typographie) sont dans le bloc `@theme`
  de [src/styles.css](src/styles.css).
- Angular CDK : bottom sheet / modale (`Dialog`), menus ⋮ (`Menu`), breakpoint desktop.
- Chart.js pour le donut, chargé à la demande et réduit au strict nécessaire.
- Polices auto-hébergées (aucun appel à un tiers) : Inter et Material Symbols Rounded en
  sous-ensemble (~16 Ko), dans [src/fonts](src/fonts).
- PWA : service worker Angular, manifeste, installation, fonctionnement hors ligne.

## Architecture

```
src/app/
  core/
    models/     Types du domaine (Account, Transaction, RecurringRule…)
    domain/     Fonctions pures et testées : soldes, budget, statistiques, récurrences, dates, montants
    storage/    Persistance localStorage versionnée (clé "app:v1"), migrations, validation, sauvegarde JSON
    state/      AppStore (un signal unique, persisté) et stores de domaine (computed + mutations)
    services/   Horloge, mois sélectionné, génération des récurrences, export / import
    data/       Données par défaut, palette, jeu d'exemple
  shared/       Composants UI (carte, bouton, chip, sheet, donut…) et pipes (money, dateLabel)
  layout/       Coquille responsive : sidebar ≥ 1024 px, barre basse en dessous
  features/     home · transactions · budget · settings
```

## Conventions

- **Montants** : en centimes entiers, toujours positifs ; le sens vient du type
  (dépense / revenu / virement). Affichage via le pipe `money` (`1 234,56 €`).
- **Dates** : chaînes locales `AAAA-MM-JJ` (et `AAAA-MM-JJTHH:mm`), jamais converties en UTC.
- **Mois affiché** : porté par l'URL (`?mois=2026-08`), partagé entre Accueil, Transactions et Budget.
- **Récurrences** : les échéances dues sont créées automatiquement au démarrage et au retour au
  premier plan (idempotent, clé règle + date d'occurrence). Les échéances futures ne sont jamais
  stockées. Supprimer une transaction générée ajoute sa date aux `skippedDates` de la règle.
- **Schéma de données** : toute évolution incrémente `CURRENT_SCHEMA_VERSION` et ajoute une migration
  dans [migrations.ts](src/app/core/storage/migrations.ts).
- **Icônes** : une nouvelle icône s'ajoute dans [icons.ts](src/app/shared/ui/icon/icons.ts),
  puis `npm run fonts` régénère la police (un test vérifie la cohérence des deux).

## Application installable (PWA)

- **Hors ligne** : le service worker ([ngsw-config.json](ngsw-config.json)) met en cache l'app,
  ses polices et ses icônes dès la première visite ; toutes les routes s'ouvrent sans réseau.
  Il n'est actif qu'en production (`npm run serve:prod` pour le tester en local).
- **Installation** : bouton « Installer l'application » dans Paramètres (Chrome, Edge, Android) ;
  sur iPhone, Safari › Partager › « Sur l'écran d'accueil ». Raccourcis du manifeste :
  Nouvelle transaction (`/transactions?ajout=1`), Transactions, Budget.
- **Mises à jour** : la nouvelle version est téléchargée en arrière-plan, puis une notification
  propose de recharger.
- **Données** : l'app demande un stockage persistant pour éviter l'effacement automatique par le
  navigateur ; les données restent propres à l'appareil, d'où l'export JSON régulier.
- **Icônes de l'app** : générées depuis [public/logo.svg](public/logo.svg) par `npm run icons`
  (Chrome requis, `CHROME_PATH` pour un autre emplacement).

### Hébergement

- HTTPS obligatoire (sauf `localhost`).
- Toute URL sans extension doit renvoyer `index.html` (routes de l'app).
- Ne pas mettre en cache HTTP longue durée `index.html`, `ngsw.json` et `ngsw-worker.js` ;
  les fichiers hachés (`*.js`, `*.css`, `media/*`) peuvent l'être.
