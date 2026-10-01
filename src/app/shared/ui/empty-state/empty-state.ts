import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** État vide : pastille d'icône, titre, explication et actions projetées. */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  template: `
    <div
      class="flex items-center justify-center rounded-[20px] bg-primary/16 text-primary-soft"
      [class]="size() === 'lg' ? 'size-14' : 'size-12 rounded-[14px]!'"
      aria-hidden="true"
    >
      <app-icon [name]="icon()" [size]="size() === 'lg' ? 26 : 22" />
    </div>
    <h2 class="font-semibold" [class]="size() === 'lg' ? 'mt-1 text-xl' : 'text-[1.0625rem]'">
      {{ title() }}
    </h2>
    @if (description()) {
      <p class="max-w-[26.25rem] leading-normal text-pretty text-muted">{{ description() }}</p>
    }
    <div class="mt-2 flex flex-wrap gap-2 empty:hidden"><ng-content /></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-start gap-3' },
})
export class EmptyState {
  readonly icon = input.required<IconName>();
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly size = input<'md' | 'lg'>('lg');
}
