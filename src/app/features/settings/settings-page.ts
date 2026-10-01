import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { formatMoney } from '../../core/domain/money';
import { DataTransferService } from '../../core/services/data-transfer.service';
import { InstallService } from '../../core/services/install.service';
import { AppStore } from '../../core/state/app-store';
import { Icon } from '../../shared/ui/icon/icon';
import { IconName } from '../../shared/ui/icon/icons';
import { ConfirmService } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SheetService } from '../../shared/ui/sheet/sheet.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { IncomeSheet } from './income-sheet';

type Action = 'income' | 'export' | 'import' | 'sample' | 'reset' | 'install';

interface SettingsRow {
  icon: IconName;
  label: string;
  sub: string;
  /** Lien vers une sous-page… */
  path?: string;
  /** …ou action. */
  action?: Action;
  value?: string;
  tag?: string;
  trail?: IconName | null;
  danger?: boolean;
}

interface SettingsGroup {
  id: string;
  title: string;
  rows: SettingsRow[];
}

@Component({
  selector: 'app-settings-page',
  imports: [NgTemplateOutlet, RouterLink, PageHeader, Icon],
  template: `
    <app-page-header title="Paramètres" />
    <div
      class="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] items-start gap-x-4 gap-y-5"
    >
      @for (group of groups(); track group.id) {
        <section class="flex flex-col gap-2" [attr.aria-labelledby]="'settings-' + group.id">
          <h2
            [id]="'settings-' + group.id"
            class="px-1 text-xs font-medium tracking-wide text-muted"
          >
            {{ group.title }}
          </h2>
          <ul class="flex flex-col gap-px overflow-hidden rounded-card border border-line bg-line">
            @for (row of group.rows; track row.label) {
              <li>
                <ng-template #content>
                  <span
                    class="flex size-9 shrink-0 items-center justify-center rounded-item"
                    [class]="row.danger ? 'bg-expense/12 text-expense' : 'bg-surface-3 text-ink-3'"
                  >
                    <app-icon [name]="row.icon" [size]="18" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block font-medium" [class.text-expense]="row.danger">{{
                      row.label
                    }}</span>
                    <span class="mt-0.5 block text-xs text-muted">{{ row.sub }}</span>
                  </span>
                  @if (row.value) {
                    <span class="text-caption font-semibold whitespace-nowrap">{{
                      row.value
                    }}</span>
                  }
                  @if (row.tag) {
                    <span
                      class="flex h-5.5 items-center gap-1 rounded-full bg-surface-4 px-2 text-2xs text-muted"
                    >
                      <app-icon name="lock" [size]="12" />
                      {{ row.tag }}
                    </span>
                  }
                  @if (row.trail) {
                    <app-icon [name]="row.trail" [size]="18" class="text-ghost" />
                  }
                </ng-template>
                @if (row.path) {
                  <a [routerLink]="row.path" [class]="rowClass">
                    <ng-container *ngTemplateOutlet="content" />
                  </a>
                } @else if (row.action) {
                  <button type="button" [class]="rowClass + ' text-left'" (click)="run(row.action)">
                    <ng-container *ngTemplateOutlet="content" />
                  </button>
                } @else {
                  <div [class]="rowClass + ' cursor-default hover:bg-surface!'">
                    <ng-container *ngTemplateOutlet="content" />
                  </div>
                }
              </li>
            }
          </ul>
        </section>
      }
    </div>
    <input
      #fileInput
      type="file"
      accept="application/json,.json"
      class="hidden"
      tabindex="-1"
      aria-hidden="true"
      (change)="importFile(fileInput)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
})
export default class SettingsPage {
  private readonly app = inject(AppStore);
  private readonly transfer = inject(DataTransferService);
  private readonly sheets = inject(SheetService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly installer = inject(InstallService);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly rowClass =
    'flex w-full items-center gap-3 bg-surface px-3.5 py-3 transition-colors hover:bg-surface-hover focus-visible:-outline-offset-2';

  protected readonly groups = computed<SettingsGroup[]>(() => {
    const data = this.app.data();
    const rules = data.rules;
    const income = data.settings.monthlyIncomeReference;
    return [
      {
        id: 'organisation',
        title: 'Organisation',
        rows: [
          {
            icon: 'sell',
            label: 'Catégories',
            sub: `${data.groups.length} groupes · ${data.subcategories.length} sous-catégories`,
            path: 'categories',
            trail: 'chevron_right',
          },
          {
            icon: 'account_balance_wallet',
            label: 'Comptes',
            sub: data.accounts.map((a) => a.name).join(', ') || 'Aucun compte',
            path: 'comptes',
            trail: 'chevron_right',
          },
          {
            icon: 'autorenew',
            label: 'Transactions récurrentes',
            sub: rules.length
              ? `${rules.length} règle${rules.length > 1 ? 's' : ''} · ${rules.filter((r) => r.active).length} active${rules.filter((r) => r.active).length > 1 ? 's' : ''}`
              : 'Aucune règle',
            path: 'recurrentes',
            trail: 'chevron_right',
          },
        ],
      },
      {
        id: 'budget',
        title: 'Budget',
        rows: [
          {
            icon: 'payments',
            label: 'Revenu mensuel de référence',
            sub:
              income !== undefined
                ? 'Base du calcul des % par enveloppe'
                : 'Non défini : revenus réels du mois',
            value: income !== undefined ? formatMoney(income) : undefined,
            action: 'income',
            trail: 'edit',
          },
          {
            icon: 'euro',
            label: 'Devise',
            sub: 'Modifiable dans une prochaine version',
            value: 'Euro (€)',
            tag: 'Figée',
            trail: null,
          },
        ],
      },
      {
        id: 'application',
        title: 'Application',
        rows: this.applicationRows(),
      },
      {
        id: 'donnees',
        title: 'Données',
        rows: [
          {
            icon: 'download',
            label: 'Exporter les données',
            sub: 'Sauvegarde JSON complète, récurrences incluses',
            action: 'export',
            trail: 'chevron_right',
          },
          {
            icon: 'upload',
            label: 'Importer des données',
            sub: 'Depuis une sauvegarde JSON',
            action: 'import',
            trail: 'chevron_right',
          },
          {
            icon: 'dataset',
            label: 'Charger des données d’exemple',
            sub: 'Trois mois de transactions, budgets et récurrences',
            action: 'sample',
            trail: 'chevron_right',
          },
          {
            icon: 'restart_alt',
            label: 'Réinitialiser les données',
            sub: 'Efface transactions, budgets et réglages',
            action: 'reset',
            danger: true,
            trail: null,
          },
        ],
      },
    ];
  });

  protected async run(action: Action): Promise<void> {
    switch (action) {
      case 'install':
        if (await this.installer.install()) this.toasts.show('Mosaïque est installée');
        break;
      case 'income':
        this.sheets.open(IncomeSheet, { ariaLabel: 'Revenu mensuel de référence', width: '440px' });
        break;
      case 'export':
        this.transfer.exportFile();
        this.toasts.show('Sauvegarde téléchargée');
        break;
      case 'import':
        this.fileInput().nativeElement.click();
        break;
      case 'sample':
        if (
          await this.confirm.ask({
            title: 'Charger des données d’exemple ?',
            message:
              'Trois mois de transactions, des enveloppes et des récurrences remplaceront vos données actuelles. Exportez-les d’abord si vous souhaitez les conserver.',
            confirmLabel: 'Charger l’exemple',
            tone: this.isEmpty() ? 'primary' : 'danger',
          })
        ) {
          this.transfer.loadSample();
          this.toasts.show('Données d’exemple chargées');
        }
        break;
      case 'reset':
        if (
          await this.confirm.ask({
            title: 'Réinitialiser les données ?',
            message:
              'Toutes vos transactions, récurrences, enveloppes et réglages seront définitivement effacés. Les comptes et catégories par défaut seront restaurés.',
            confirmLabel: 'Tout effacer',
            tone: 'danger',
          })
        ) {
          this.transfer.reset();
          this.toasts.show('Données réinitialisées');
        }
        break;
    }
  }

  protected async importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const data = await this.transfer.readFile(file);
      const confirmed = await this.confirm.ask({
        title: 'Importer cette sauvegarde ?',
        message: `${data.transactions.length} transactions, ${data.rules.length} récurrences, ${data.envelopes.length} enveloppes et ${data.accounts.length} comptes remplaceront vos données actuelles.`,
        confirmLabel: 'Importer',
        tone: 'danger',
      });
      if (!confirmed) return;
      this.transfer.replace(data);
      this.toasts.show('Données importées');
    } catch (error) {
      this.toasts.show(
        `Import impossible : ${error instanceof Error ? error.message : 'fichier illisible.'}`,
      );
    }
  }

  /** Installation (bouton natif ou consigne iOS) et statut hors ligne / stockage. */
  private applicationRows(): SettingsRow[] {
    const persisted = this.installer.persisted();
    const storage =
      persisted === true
        ? 'Stockage persistant accordé par le navigateur'
        : 'Données sur cet appareil : exportez-les régulièrement';
    if (this.installer.standalone()) {
      return [
        {
          icon: 'offline_pin',
          label: 'Application installée',
          sub: `Fonctionne hors ligne · ${storage}`,
          trail: null,
        },
      ];
    }
    const rows: SettingsRow[] = [];
    if (this.installer.canPrompt()) {
      rows.push({
        icon: 'install_mobile',
        label: 'Installer l’application',
        sub: 'Sur l’écran d’accueil ou le bureau, utilisable hors ligne',
        action: 'install',
        trail: 'chevron_right',
      });
    } else if (this.installer.needsIosHint()) {
      rows.push({
        icon: 'ios_share',
        label: 'Installer sur l’iPhone',
        sub: 'Dans Safari : Partager, puis « Sur l’écran d’accueil »',
        trail: null,
      });
    }
    rows.push({ icon: 'offline_pin', label: 'Disponible hors ligne', sub: storage, trail: null });
    return rows;
  }

  private isEmpty(): boolean {
    const data = this.app.data();
    return !data.transactions.length && !data.rules.length && !data.envelopes.length;
  }
}
