import { PALETTE, SEMANTIC } from '../../core/data/palette';
import { EnvelopeStatus } from '../../core/domain/budget';
import { formatPercent } from '../../core/domain/money';

/** Données d'affichage d'une enveloppe. */
export interface EnvelopeView extends EnvelopeStatus {
  id: string;
  name: string;
  icon: string;
  /** Couleur de la catégorie. */
  color: string;
  /** Couleur d'état : rouge en dépassement. */
  stateColor: string;
  percent: string;
}

export function toEnvelopeView(status: EnvelopeStatus): EnvelopeView {
  const color = status.group?.color ?? PALETTE.slate;
  return {
    ...status,
    id: status.envelope.id,
    name: status.group?.name ?? 'Catégorie supprimée',
    icon: status.group?.icon ?? 'more_horiz',
    color,
    stateColor: status.over ? SEMANTIC.expense : color,
    percent: Number.isFinite(status.consumed) ? formatPercent(status.consumed) : '—',
  };
}
