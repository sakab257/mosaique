import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NOW } from '../services/clock.service';
import { BROWSER_STORAGE } from '../storage/storage.service';
import { MemoryStorage } from './memory-storage';

registerLocaleData(localeFr);

/** Monte un composant de sheet avec stockage en mémoire, date figée et DialogRef simulé. */
export async function openSheet<T>(component: Type<T>, data: unknown = {}) {
  const close = vi.fn();
  const storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: BROWSER_STORAGE, useValue: storage },
      { provide: NOW, useValue: () => new Date(2026, 9, 3, 12, 0) },
      { provide: LOCALE_ID, useValue: 'fr-FR' },
      { provide: DialogRef, useValue: { close } },
      { provide: DIALOG_DATA, useValue: data },
    ],
  });
  const fixture: ComponentFixture<T> = TestBed.createComponent(component);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    el,
    close,
    storage,
    text: () => (el.textContent ?? '').replace(/[  ]/g, ' '),
    async type(input: HTMLInputElement, value: string) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    },
    async click(label: string) {
      const button = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
        b.textContent?.trim().includes(label),
      );
      if (!button) throw new Error(`Bouton introuvable : ${label}`);
      button.click();
      await fixture.whenStable();
    },
    /**
     * Soumet le formulaire comme le navigateur (événement annulable) et renvoie `true` si
     * l'envoi natif a bien été bloqué — sinon la page serait rechargée.
     */
    async submit(): Promise<boolean> {
      const event = new Event('submit', { cancelable: true, bubbles: true });
      el.querySelector('form')!.dispatchEvent(event);
      await fixture.whenStable();
      return event.defaultPrevented;
    },
  };
}
