import { Pipe, PipeTransform } from '@angular/core';
import { IconName, toIconName } from './icons';

/** `<app-icon [name]="group.icon | iconName" />` pour une icône stockée dans les données. */
@Pipe({ name: 'iconName' })
export class IconNamePipe implements PipeTransform {
  transform(value: string | null | undefined): IconName {
    return toIconName(value);
  }
}
