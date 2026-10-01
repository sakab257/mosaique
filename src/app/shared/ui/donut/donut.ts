import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { Chart, ChartConfiguration } from 'chart.js';
import { SEMANTIC } from '../../../core/data/palette';
import { formatMoney, formatPercent, ratio } from '../../../core/domain/money';

export interface DonutSegment {
  id: string;
  label: string;
  /** Valeur en centimes. */
  value: number;
  color: string;
}

type DoughnutChart = Chart<'doughnut', number[], string>;

let chartJs: Promise<typeof import('./doughnut-chart')> | undefined;

/**
 * Chart.js est chargé à la demande (chunk séparé) et réduit au strict nécessaire pour un
 * donut : il ne pèse pas sur le chargement initial de l'app.
 */
function loadChartJs(): Promise<typeof import('./doughnut-chart')> {
  chartJs ??= import('./doughnut-chart');
  return chartJs;
}

/** Anneau de répartition (Chart.js). Le contenu projeté s'affiche au centre. */
@Component({
  selector: 'app-donut',
  template: `
    <canvas #canvas role="img" [attr.aria-label]="description()"></canvas>
    <div
      class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
    >
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block shrink-0',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class Donut {
  readonly segments = input.required<readonly DonutSegment[]>();
  readonly size = input(136);
  readonly thickness = input(14);
  /** Intitulé de la description accessible, suivi du détail des segments. */
  readonly label = input('Répartition');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly chart = signal<DoughnutChart | null>(null);
  private destroyed = false;

  private readonly total = computed(() => this.segments().reduce((sum, s) => sum + s.value, 0));

  protected readonly description = computed(() => {
    const total = this.total();
    if (total === 0) return `${this.label()} : aucune donnée.`;
    const parts = this.segments()
      .filter((s) => s.value > 0)
      .map((s) => `${s.label} ${formatMoney(s.value)} (${formatPercent(ratio(s.value, total))})`);
    return `${this.label()} : ${parts.join(', ')}.`;
  });

  constructor() {
    afterNextRender(() => void this.createChart());

    effect(() => {
      const chart = this.chart();
      const segments = this.segments();
      if (chart) {
        this.applyData(chart, segments);
        chart.update();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.chart()?.destroy();
    });
  }

  private async createChart(): Promise<void> {
    const { Chart } = await loadChartJs();
    const canvas = this.canvas().nativeElement;
    if (this.destroyed || !canvas.getContext('2d')) {
      return; // composant détruit pendant le chargement, ou canvas indisponible (tests)
    }
    const chart = new Chart(canvas, this.config()) as DoughnutChart;
    this.applyData(chart, this.segments());
    chart.update('none');
    this.chart.set(chart);
  }

  private applyData(chart: DoughnutChart, segments: readonly DonutSegment[]): void {
    const empty = this.total() === 0;
    const visible = segments.filter((s) => s.value > 0);
    chart.data.labels = empty ? [''] : visible.map((s) => s.label);
    const dataset = chart.data.datasets[0];
    dataset.data = empty ? [1] : visible.map((s) => s.value);
    dataset.backgroundColor = empty ? [SEMANTIC.track] : visible.map((s) => s.color);
    dataset.spacing = visible.length > 1 ? 4 : 0;
    dataset.borderRadius = empty || visible.length === 1 ? 0 : 999;
    chart.options.plugins!.tooltip!.enabled = !empty;
    chart.options.events = empty
      ? []
      : ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'];
  }

  private config(): ChartConfiguration<'doughnut', number[], string> {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cutout = `${Math.round(100 - (this.thickness() / (this.size() / 2)) * 100)}%`;
    return {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{ data: [], borderWidth: 0, borderRadius: 999, hoverOffset: 3 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout,
        layout: { padding: 3 },
        animation: reduceMotion ? false : { duration: 500, easing: 'easeOutCubic' },
        plugins: {
          tooltip: {
            backgroundColor: '#1C1D23',
            borderColor: '#2F3039',
            borderWidth: 1,
            titleColor: '#F4F4F6',
            bodyColor: '#C9CAD1',
            padding: 10,
            cornerRadius: 10,
            boxWidth: 8,
            boxHeight: 8,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              title: (items) => items[0]?.label ?? '',
              label: (item) =>
                ` ${formatMoney(item.parsed)} · ${formatPercent(ratio(item.parsed, this.total()))}`,
            },
          },
        },
      },
    };
  }
}
