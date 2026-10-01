import { TestBed } from '@angular/core/testing';
import { createDefaultData } from '../data/defaults';
import { AppStore } from '../state/app-store';
import { MemoryStorage } from '../testing/memory-storage';
import { BROWSER_STORAGE, STORAGE_KEY, StorageService } from './storage.service';

describe('StorageService', () => {
  let storage: MemoryStorage;

  function setup(): StorageService {
    TestBed.configureTestingModule({
      providers: [{ provide: BROWSER_STORAGE, useValue: storage }],
    });
    return TestBed.inject(StorageService);
  }

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('renvoie null quand rien n’est enregistré', () => {
    expect(setup().load()).toBeNull();
  });

  it('enregistre sous la clé "app:v1" et relit à l’identique', () => {
    const service = setup();
    const data = createDefaultData();
    data.settings.monthlyIncomeReference = 280000;
    service.save(data);
    expect(storage.keys()).toEqual([STORAGE_KEY]);
    expect(service.load()).toEqual(data);
  });

  it('conserve une copie de secours d’un document corrompu', () => {
    storage.setItem(STORAGE_KEY, '{pas du json');
    const service = setup();
    expect(service.load()).toBeNull();
    const backup = storage.keys().find((k) => k.startsWith(`${STORAGE_KEY}:backup:`));
    expect(backup).toBeDefined();
    expect(storage.getItem(backup!)).toBe('{pas du json');
    expect(service.lastError()).toContain('JSON invalide');
  });

  it('ne charge pas des données d’une version future', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...createDefaultData(), schemaVersion: 99 }));
    const service = setup();
    expect(service.load()).toBeNull();
    expect(service.lastError()).toContain('version plus récente');
  });

  it('signale un quota dépassé sans lever d’exception', () => {
    const service = setup();
    storage.failNextWrite = true;
    expect(() => service.save(createDefaultData())).not.toThrow();
    expect(service.lastError()).toContain('Espace de stockage insuffisant');
  });
});

describe('AppStore', () => {
  it('démarre sur les données par défaut puis persiste chaque changement', () => {
    const storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [{ provide: BROWSER_STORAGE, useValue: storage }],
    });
    const store = TestBed.inject(AppStore);

    expect(store.accounts().map((a) => a.name)).toEqual(['Cash', 'Carte bancaire', 'Banque']);
    expect(store.groups()).toHaveLength(9);

    store.update((d) => ({ ...d, settings: { ...d.settings, monthlyIncomeReference: 250000 } }));
    TestBed.tick();

    const saved = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(saved.settings.monthlyIncomeReference).toBe(250000);
  });

  it('recharge l’état enregistré', () => {
    const storage = new MemoryStorage();
    const data = createDefaultData();
    data.accounts[0].initialBalance = 20000;
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    TestBed.configureTestingModule({
      providers: [{ provide: BROWSER_STORAGE, useValue: storage }],
    });
    expect(TestBed.inject(AppStore).accounts()[0].initialBalance).toBe(20000);
  });
});
