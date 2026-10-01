import { Pipe, PipeTransform } from '@angular/core';
import { SignDisplay, formatMoney, formatPercent } from '../../core/domain/money';
import { Cents } from '../../core/models';

/** `{{ cents | money }}` → « 1 234,56 € » ; `{{ cents | money: 'always' }}` → « +35,00 € ». */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(cents: Cents | null | undefined, sign: SignDisplay = 'auto'): string {
    return cents == null ? '' : formatMoney(cents, sign);
  }
}

/** `{{ 0.19 | ratioPercent }}` → « 19 % ». */
@Pipe({ name: 'ratioPercent' })
export class RatioPercentPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value == null ? '' : formatPercent(value);
  }
}
