import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconButton } from '../button/button';
import { Icon } from '../icon/icon';
import { ToastService } from './toast.service';

/** Zone d'affichage des notifications (au-dessus de la barre basse sur mobile). */
@Component({
  selector: 'app-toast-outlet',
  imports: [Icon, IconButton],
  template: `
    @for (toast of toasts.toasts(); track toast.id) {
      <div
        class="pointer-events-auto flex w-full max-w-md animate-pop-in items-center gap-3 rounded-field border border-line-stronger bg-surface-3 py-2 pr-2 pl-4 shadow-2xl shadow-black/50"
      >
        <span class="min-w-0 flex-1 text-sm">{{ toast.message }}</span>
        @if (toast.actionLabel) {
          <button
            type="button"
            class="h-9 rounded-item px-3 text-sm font-semibold text-primary-soft hover:bg-surface-4 hover:text-primary-ink"
            (click)="toasts.runAction(toast)"
          >
            {{ toast.actionLabel }}
          </button>
        }
        <button
          type="button"
          appIconButton="Fermer la notification"
          size="lg"
          (click)="toasts.dismiss(toast.id)"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'pointer-events-none fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-4 bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+0.75rem)] lg:bottom-6 lg:left-auto lg:right-6 lg:items-end',
    role: 'status',
    'aria-live': 'polite',
  },
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}
