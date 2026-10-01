import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  action?: () => void;
}

export interface ToastOptions {
  actionLabel?: string;
  action?: () => void;
  /** Durée d'affichage en ms (6 s par défaut, laisse le temps d'annuler ; `Infinity` : jusqu'à fermeture). */
  duration?: number;
}

/** Notifications éphémères, avec action optionnelle (« Annuler »). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly state = signal<Toast[]>([]);

  readonly toasts = this.state.asReadonly();

  show(message: string, options: ToastOptions = {}): number {
    const id = this.nextId++;
    const toast: Toast = { id, message, actionLabel: options.actionLabel, action: options.action };
    // Une seule notification à la fois : la plus récente remplace les autres.
    this.state().forEach((t) => this.dismiss(t.id));
    this.state.set([toast]);
    const duration = options.duration ?? 6000;
    if (Number.isFinite(duration)) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    }
    return id;
  }

  runAction(toast: Toast): void {
    toast.action?.();
    this.dismiss(toast.id);
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.state.update((list) => list.filter((t) => t.id !== id));
  }
}
