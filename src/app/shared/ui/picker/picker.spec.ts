import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Picker, PickerOption } from './picker';

@Component({
  imports: [Picker],
  template: `<app-picker
    label="Catégorie"
    placeholder="Choisir"
    [options]="options()"
    [(value)]="value"
  />`,
})
class Host {
  readonly options = signal<PickerOption[]>([{ value: 'grp-revenus', label: 'Revenus' }]);
  readonly value = signal<string | null>(null);
}

describe('Picker (sélecteur natif)', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector('select')!;
    return { fixture, host: fixture.componentInstance, select };
  }

  it('sans valeur, l’option d’attente est réellement sélectionnée (pas la première catégorie)', async () => {
    const { select } = await setup();
    expect(select.selectedIndex).toBe(0);
    expect(select.value).toBe('');
    expect(select.options[0].textContent?.trim()).toBe('Choisir');
  });

  it('la seule catégorie proposée peut être choisie', async () => {
    const { fixture, host, select } = await setup();
    // Ce que fait le menu natif quand l'utilisateur touche « Revenus ».
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(host.value()).toBe('grp-revenus');
    expect(select.value).toBe('grp-revenus');
  });

  it('revient sur l’option d’attente quand la valeur est effacée', async () => {
    const { fixture, host, select } = await setup();
    host.value.set('grp-revenus');
    await fixture.whenStable();
    expect(select.value).toBe('grp-revenus');
    host.value.set(null);
    await fixture.whenStable();
    expect(select.selectedIndex).toBe(0);
  });
});
