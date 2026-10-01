import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName, toIconName } from '../icon/icons';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, { box: string; icon: number }> = {
  xs: { box: 'size-7 rounded-lg', icon: 14 },
  sm: { box: 'size-8 rounded-item', icon: 16 },
  md: { box: 'size-10 rounded-[14px]', icon: 18 },
  lg: { box: 'size-11 rounded-control', icon: 20 },
  xl: { box: 'size-15 rounded-[20px]', icon: 28 },
};

/** Pastille d'icône teintée à la couleur d'une catégorie ou d'un compte. */
@Component({
  selector: 'app-category-avatar',
  imports: [Icon],
  template: '<app-icon [name]="iconName()" [size]="dims().icon" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"tint inline-flex shrink-0 items-center justify-center " + dims().box',
    '[style.--tint]': 'color()',
    'aria-hidden': 'true',
  },
})
export class CategoryAvatar {
  /** Nom d'icône stocké dans les données ; repli sur « more_horiz » s'il est inconnu. */
  readonly icon = input.required<string>();
  readonly color = input.required<string>();
  readonly size = input<AvatarSize>('md');

  protected readonly iconName = computed<IconName>(() => toIconName(this.icon()));
  protected readonly dims = computed(() => SIZES[this.size()]);
}
