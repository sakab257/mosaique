import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Tant que la police d'icônes n'est pas chargée, les ligatures (« delete », « add »…)
// seraient affichées en texte brut : elles restent masquées jusqu'au chargement.
document.fonts
  ?.load('24px "Material Symbols Rounded"')
  .finally(() => document.documentElement.classList.add('icons-ready'));

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
