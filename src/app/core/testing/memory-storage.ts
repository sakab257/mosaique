/** Implémentation en mémoire de l'API Storage, pour les tests. */
export class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  /** Simule un quota dépassé sur la prochaine écriture. */
  failNextWrite = false;

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    }
    this.items.set(key, value);
  }

  keys(): string[] {
    return [...this.items.keys()];
  }
}
