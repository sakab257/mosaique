import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Garde-fou : un <form> sans gestion de l'envoi est soumis par le navigateur, ce qui
 * recharge la page et perd la saisie. L'app n'utilise pas les formulaires « template »
 * d'Angular (FormsModule) : `(ngSubmit)` n'existe donc qu'avec `[formGroup]`.
 * Les formulaires gérés par signaux utilisent `(submit)` avec `event.preventDefault()`.
 */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|html)$/.test(name) && !name.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('garde-fou des formulaires', () => {
  const root = resolve(process.cwd(), 'src/app');
  const files = sources(root).map((path) => ({
    path: relative(root, path),
    content: readFileSync(path, 'utf8'),
  }));

  it('chaque <form> intercepte son envoi', () => {
    const offenders = files
      .filter(({ content }) => /<form[\s>]/.test(content))
      .filter(({ content }) => {
        const reactive = content.includes('[formGroup]') && content.includes('(ngSubmit)');
        const native = /\(submit\)="[^"]*\$event/.test(content);
        return !reactive && !native;
      })
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('(ngSubmit) n’est utilisé qu’avec [formGroup]', () => {
    const offenders = files
      .filter(({ content }) => content.includes('(ngSubmit)') && !content.includes('[formGroup]'))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('les gestionnaires (submit) bloquent l’envoi natif', () => {
    const offenders = files
      .filter(
        ({ content }) => /\(submit\)="/.test(content) && !content.includes('preventDefault()'),
      )
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
