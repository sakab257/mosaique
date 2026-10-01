import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BudgetEnvelope } from '../../core/models';
import { LayoutService } from '../../core/services/layout.service';
import { MonthService } from '../../core/services/month.service';
import { BudgetStore } from '../../core/state/budget.store';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { ConfirmService } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Icon } from '../../shared/ui/icon/icon';
import { MonthSwitcher } from '../../shared/ui/month-switcher/month-switcher';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SheetService } from '../../shared/ui/sheet/sheet.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { BudgetTotalCard } from './budget-total-card';
import { EnvelopeCard } from './envelope-card';
import { EnvelopeFormData, EnvelopeFormSheet } from './envelope-form-sheet';
import { EnvelopeMosaic } from './envelope-mosaic';
import { EnvelopeView, toEnvelopeView } from './envelope-view';

@Component({
  selector: 'app-budget-page',
  imports: [
    PageHeader,
    MonthSwitcher,
    Card,
    EmptyState,
    Button,
    Icon,
    BudgetTotalCard,
    EnvelopeCard,
    EnvelopeMosaic,
  ],
  template: `
    <app-page-header title="Budget">
      <button type="button" appButton [disabled]="!canCreate()" (click)="openForm()">
        <app-icon name="add" [size]="18" />
        Enveloppe
      </button>
    </app-page-header>
    <app-month-switcher
      class="self-start"
      [month]="months.month()"
      (monthChange)="months.set($event)"
    />

    @if (envelopes().length) {
      <app-budget-total-card
        [summary]="budget.summary()"
        [envelopes]="envelopes()"
        [month]="months.month()"
      />

      @if (layout.isDesktop()) {
        <app-envelope-mosaic
          class="mt-2"
          [envelopes]="envelopes()"
          [summary]="budget.summary()"
          [canCreate]="canCreate()"
          (edit)="openForm($event.envelope)"
          (remove)="remove($event)"
          (create)="openForm()"
        />
      } @else {
        <ul class="flex flex-col gap-3">
          @for (envelope of envelopes(); track envelope.id) {
            <li>
              <app-envelope-card
                [envelope]="envelope"
                (edit)="openForm(envelope.envelope)"
                (remove)="remove(envelope)"
              />
            </li>
          }
        </ul>
        @if (canCreate()) {
          <button
            type="button"
            class="flex h-13 items-center justify-center gap-2 rounded-card border border-dashed border-line-dashed font-semibold text-primary-ink transition-colors hover:border-primary"
            (click)="openForm()"
          >
            <app-icon name="add" [size]="18" />
            Créer une enveloppe
          </button>
        }
      }
    } @else {
      <app-card padding="none" class="px-6 py-10">
        <app-empty-state
          icon="savings"
          title="Aucune enveloppe"
          description="Répartissez votre revenu mensuel en enveloppes par catégorie (logement, courses, loisirs…) : vous verrez en un coup d’œil ce qu’il vous reste à dépenser."
        >
          <button type="button" appButton class="h-11!" (click)="openForm()">
            <app-icon name="add" [size]="18" />
            Créer une enveloppe
          </button>
        </app-empty-state>
      </app-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
})
export default class BudgetPage {
  protected readonly months = inject(MonthService);
  protected readonly budget = inject(BudgetStore);
  protected readonly layout = inject(LayoutService);
  private readonly sheets = inject(SheetService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  protected readonly envelopes = computed(() =>
    this.budget.summary().envelopes.map(toEnvelopeView),
  );
  protected readonly canCreate = computed(() => this.budget.availableGroups().length > 0);

  protected openForm(envelope?: BudgetEnvelope): void {
    this.sheets.open<EnvelopeFormSheet, EnvelopeFormData>(EnvelopeFormSheet, {
      ariaLabel: envelope ? 'Modifier l’enveloppe' : 'Nouvelle enveloppe',
      data: { envelope },
    });
  }

  protected async remove(view: EnvelopeView): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Supprimer l’enveloppe ?',
      message: `L’enveloppe « ${view.name} » sera supprimée. Vos transactions ne sont pas modifiées.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;
    const removed = this.budget.remove(view.id);
    if (removed) {
      this.toasts.show('Enveloppe supprimée', {
        actionLabel: 'Annuler',
        action: () => this.budget.restore(removed),
      });
    }
  }
}
