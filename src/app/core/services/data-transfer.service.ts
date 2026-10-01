import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { createSampleData } from '../data/sample-data';
import { AppData } from '../models';
import { AppStore } from '../state/app-store';
import { backupFileName, parseBackup, serializeBackup } from '../storage/backup';
import { ClockService } from './clock.service';
import { RecurrenceService } from './recurrence.service';

/** Export / import JSON, données d'exemple et réinitialisation. */
@Injectable({ providedIn: 'root' })
export class DataTransferService {
  private readonly app = inject(AppStore);
  private readonly clock = inject(ClockService);
  private readonly recurrence = inject(RecurrenceService);
  private readonly document = inject(DOCUMENT);

  /** Télécharge une sauvegarde complète au format JSON. */
  exportFile(): void {
    const json = serializeBackup(this.app.data(), new Date().toISOString());
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = backupFileName(this.clock.today());
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /** Lit et valide un fichier de sauvegarde, sans l'appliquer. */
  async readFile(file: File): Promise<AppData> {
    return parseBackup(await file.text());
  }

  /** Remplace toutes les données, puis rattrape les échéances récurrentes. */
  replace(data: AppData): void {
    this.app.replace(data);
    this.recurrence.run();
  }

  loadSample(): void {
    this.replace(createSampleData(this.clock.today()));
  }

  reset(): void {
    this.app.reset();
  }
}
