import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { LayoutService } from '../../../core/services/layout.service';

export interface SheetConfig<D> {
  /** Nom accessible de la boîte de dialogue (en général son titre). */
  ariaLabel: string;
  data?: D;
  /** Largeur de la modale desktop. */
  width?: string;
}

/**
 * Ouvre un composant en bottom sheet (mobile) ou en modale centrée (desktop).
 * S'appuie sur le Dialog du CDK : piège du focus, Échap, retour du focus, aria-modal,
 * fermeture à la navigation.
 */
@Injectable({ providedIn: 'root' })
export class SheetService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly layout = inject(LayoutService);

  open<C, D = unknown, R = unknown>(
    component: ComponentType<C>,
    config: SheetConfig<D>,
  ): DialogRef<R, C> {
    const desktop = this.layout.isDesktop();
    const position = this.overlay.position().global().centerHorizontally();
    return this.dialog.open<R, D, C>(component, {
      data: config.data,
      ariaLabel: config.ariaLabel,
      ariaModal: true,
      hasBackdrop: true,
      backdropClass: 'sheet-backdrop',
      panelClass: ['sheet-panel', desktop ? 'sheet-panel--center' : 'sheet-panel--bottom'],
      positionStrategy: desktop ? position.centerVertically() : position.bottom('0'),
      width: desktop ? (config.width ?? '540px') : '100%',
      maxWidth: desktop ? 'calc(100vw - 32px)' : '100%',
      maxHeight: desktop ? '90dvh' : '93dvh',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      closeOnNavigation: true,
    });
  }
}
