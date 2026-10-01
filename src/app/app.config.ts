import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { InstallService } from './core/services/install.service';
import { RecurrenceService } from './core/services/recurrence.service';
import { AppTitleStrategy } from './core/services/title-strategy';
import { AppUpdateService } from './layout/app-update.service';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
    provideAppInitializer(() => {
      // Transactions récurrentes dues : créées dès le démarrage, puis au retour au premier plan.
      inject(RecurrenceService).start();
      // PWA : proposition d'installation, stockage persistant, mises à jour.
      inject(InstallService).start();
      inject(AppUpdateService).start();
    }),
    // Service worker (build de production uniquement) : app disponible hors ligne.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
