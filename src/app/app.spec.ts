import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { NOW } from './core/services/clock.service';
import { AppTitleStrategy } from './core/services/title-strategy';
import { BROWSER_STORAGE } from './core/storage/storage.service';
import { MemoryStorage } from './core/testing/memory-storage';

registerLocaleData(localeFr);

describe('Navigation', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: BROWSER_STORAGE, useValue: new MemoryStorage() },
        { provide: NOW, useValue: () => new Date(2026, 7, 28, 10, 0) },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  const heading = () =>
    harness.routeNativeElement?.closest('app-shell')?.querySelector('h1')?.textContent?.trim();

  it('redirige la racine vers /accueil', async () => {
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/accueil');
    expect(heading()).toBe('Accueil');
    expect(TestBed.inject(Title).getTitle()).toBe('Accueil · Mosaïque');
  });

  it.each([
    ['/transactions', 'Transactions'],
    ['/budget', 'Budget'],
    ['/parametres', 'Paramètres'],
    ['/parametres/categories', 'Catégories'],
    ['/parametres/comptes', 'Comptes'],
    ['/parametres/recurrentes', 'Transactions récurrentes'],
  ])('%s affiche « %s »', async (url, title) => {
    await harness.navigateByUrl(url);
    expect(heading()).toBe(title);
  });

  it('affiche le mois courant, puis le mois porté par l’URL', async () => {
    await harness.navigateByUrl('/accueil');
    const label = () =>
      harness.routeNativeElement
        ?.querySelector('app-month-switcher [aria-live]')
        ?.textContent?.trim();
    expect(label()).toBe('Août 2026');
    await harness.navigateByUrl('/accueil?mois=2026-03');
    expect(label()).toBe('Mars 2026');
  });

  it('expose une navigation principale accessible', async () => {
    await harness.navigateByUrl('/budget');
    const shell = harness.routeNativeElement!.closest('app-shell')!;
    const current = shell.querySelectorAll('nav a[aria-current="page"]');
    // Libellé accessible : le texte des icônes (aria-hidden) est exclu.
    const accessibleText = (el: Element) =>
      [...el.childNodes]
        .filter((n) => !(n instanceof Element && n.getAttribute('aria-hidden') === 'true'))
        .map((n) => n.textContent)
        .join('')
        .trim();
    expect([...current].map(accessibleText)).toEqual(['Budget', 'Budget']);
    expect(shell.querySelector('button[aria-label="Nouvelle transaction"]')).not.toBeNull();
  });
});
