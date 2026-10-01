import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** Largeur de l'action révélée (px). */
const ACTION_WIDTH = 76;
/** Déplacement minimal avant de décider du sens du geste (px). */
const SLOP = 8;

/**
 * Ligne à balayer vers la gauche pour révéler une action destructive (mobile).
 * Le défilement vertical reste natif (`touch-action: pan-y`). Un clic qui suit un
 * balayage est neutralisé ; un clic sur une ligne ouverte la referme.
 */
@Component({
  selector: 'app-swipe-row',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-0.5 bg-expense text-2xs font-semibold text-bg"
      [style.width.px]="actionWidth"
      [attr.tabindex]="open() ? 0 : -1"
      [attr.aria-hidden]="!open()"
      (click)="action.emit()"
    >
      <app-icon name="delete" [size]="20" />
      {{ actionLabel() }}
    </button>
    <div
      #content
      class="relative touch-pan-y bg-surface"
      [class.transition-transform]="!dragging()"
      [class.duration-200]="!dragging()"
      [style.transform]="'translateX(' + offset() + 'px)'"
      (pointerdown)="onDown($event)"
      (pointermove)="onMove($event)"
      (pointerup)="onUp()"
      (pointercancel)="onUp()"
    >
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block overflow-hidden' },
})
export class SwipeRow {
  readonly open = model(false);
  readonly actionLabel = input('Supprimer');
  readonly action = output();

  protected readonly actionWidth = ACTION_WIDTH;
  protected readonly dragging = signal(false);
  private readonly dragOffset = signal<number | null>(null);

  private start: { x: number; y: number; base: number; pointerId: number } | null = null;
  private axis: 'x' | 'y' | null = null;
  private swallowClick = false;

  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  constructor() {
    // Phase de capture : neutralise le clic avant qu'il n'atteigne le contenu projeté.
    const listener = (event: MouseEvent) => this.onClickCapture(event);
    afterNextRender(() => this.content().nativeElement.addEventListener('click', listener, true));
    inject(DestroyRef).onDestroy(() =>
      this.content().nativeElement.removeEventListener('click', listener, true),
    );
  }

  protected readonly offset = computed(
    () => this.dragOffset() ?? (this.open() ? -ACTION_WIDTH : 0),
  );

  protected onDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.start = {
      x: event.clientX,
      y: event.clientY,
      base: this.open() ? -ACTION_WIDTH : 0,
      pointerId: event.pointerId,
    };
    this.axis = null;
  }

  protected onMove(event: PointerEvent): void {
    if (!this.start) return;
    const dx = event.clientX - this.start.x;
    const dy = event.clientY - this.start.y;
    if (!this.axis) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      this.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (this.axis === 'x') {
        try {
          (event.currentTarget as HTMLElement).setPointerCapture(this.start.pointerId);
        } catch {
          // Pointeur déjà relâché : le geste continue sans capture.
        }
        this.dragging.set(true);
      }
    }
    if (this.axis === 'x') {
      this.dragOffset.set(Math.min(0, Math.max(-ACTION_WIDTH, this.start.base + dx)));
    }
  }

  protected onUp(): void {
    if (this.axis === 'x') {
      this.open.set((this.dragOffset() ?? 0) < -ACTION_WIDTH / 2);
      this.swallowClick = true;
    }
    this.start = null;
    this.axis = null;
    this.dragging.set(false);
    this.dragOffset.set(null);
  }

  private onClickCapture(event: MouseEvent): void {
    if (this.swallowClick || this.open()) {
      event.stopPropagation();
      event.preventDefault();
      if (!this.swallowClick) this.open.set(false);
    }
    this.swallowClick = false;
  }
}
