import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/** Événement Chromium d'installation (non typé par lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Installation de la PWA : bouton natif sur Chromium (`beforeinstallprompt`), consigne
 * manuelle sur iOS (Partager › Sur l'écran d'accueil). Demande aussi au navigateur de
 * ne pas effacer les données locales (stockage persistant).
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly destroyRef = inject(DestroyRef);
  private readonly deferred = signal<BeforeInstallPromptEvent | null>(null);

  /** L'app tourne déjà en mode application (écran d'accueil, fenêtre dédiée). */
  readonly standalone = signal(this.detectStandalone());
  /** Le navigateur propose une installation en un clic. */
  readonly canPrompt = computed(() => !!this.deferred() && !this.standalone());
  /** Safari iOS / iPadOS : installation manuelle uniquement. */
  readonly needsIosHint = computed(() => this.isIos() && !this.standalone());
  /** Le navigateur garantit de ne pas effacer les données (null : inconnu). */
  readonly persisted = signal<boolean | null>(null);

  start(): void {
    const win = this.window;
    if (!win) return;
    const onPrompt = (event: Event) => {
      event.preventDefault(); // le bouton « Installer » de l'app prend le relais
      this.deferred.set(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      this.deferred.set(null);
      this.standalone.set(true);
    };
    win.addEventListener('beforeinstallprompt', onPrompt);
    win.addEventListener('appinstalled', onInstalled);
    this.destroyRef.onDestroy(() => {
      win.removeEventListener('beforeinstallprompt', onPrompt);
      win.removeEventListener('appinstalled', onInstalled);
    });
    void this.requestPersistence();
  }

  /** Ouvre la fenêtre d'installation du navigateur ; `true` si l'utilisateur accepte. */
  async install(): Promise<boolean> {
    const event = this.deferred();
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    this.deferred.set(null);
    return outcome === 'accepted';
  }

  private async requestPersistence(): Promise<void> {
    const storage = this.window?.navigator.storage;
    if (!storage?.persist) return;
    try {
      this.persisted.set((await storage.persisted()) || (await storage.persist()));
    } catch {
      this.persisted.set(false);
    }
  }

  private detectStandalone(): boolean {
    const win = this.window;
    if (!win) return false;
    return (
      win.matchMedia?.('(display-mode: standalone)').matches ||
      (win.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  private isIos(): boolean {
    const nav = this.window?.navigator;
    if (!nav) return false;
    return (
      /iphone|ipad|ipod/i.test(nav.userAgent) ||
      (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
    );
  }
}
