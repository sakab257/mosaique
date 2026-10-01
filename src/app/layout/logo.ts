import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Logogramme (public/logo.svg) + nom de l'application. */
@Component({
  selector: 'app-logo',
  template: `
    <img src="logo.svg" alt="" width="36" height="26" class="h-[26px] w-auto" />
    <span class="text-lg font-semibold tracking-tight">Mosaïque</span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center gap-2.5' },
})
export class Logo {}
