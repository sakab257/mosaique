import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { ToastService } from '../shared/ui/toast/toast.service';

/**
 * Mises à jour de la PWA : le service worker télécharge la nouvelle version en arrière-plan,
 * puis une notification propose de recharger. Vérification au retour au premier plan.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly toasts = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  start(): void {
    if (!this.updates.isEnabled) return;

    this.updates.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() =>
        this.toasts.show('Nouvelle version de Mosaïque disponible', {
          actionLabel: 'Recharger',
          action: () => void this.reload(),
          duration: Infinity,
        }),
      );

    // Cache incohérent (version supprimée du serveur…) : seul un rechargement répare.
    this.updates.unrecoverable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() =>
      this.toasts.show('L’application doit être rechargée pour continuer.', {
        actionLabel: 'Recharger',
        action: () => this.document.location.reload(),
        duration: Infinity,
      }),
    );

    const onVisibility = () => {
      if (this.document.visibilityState === 'visible') {
        this.updates.checkForUpdate().catch(() => {});
      }
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', onVisibility),
    );
  }

  private async reload(): Promise<void> {
    try {
      await this.updates.activateUpdate();
    } finally {
      this.document.location.reload();
    }
  }
}
