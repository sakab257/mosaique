import { BreakpointObserver, MediaMatcher } from '@angular/cdk/layout';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** Breakpoint desktop (Tailwind `lg`). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Mode d'affichage pour la logique TypeScript (sheet ou modale, balayage…).
 * La mise en page elle-même reste en CSS (`lg:`), sans dépendre de ce signal.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly isDesktop = toSignal(
    inject(BreakpointObserver)
      .observe(DESKTOP_QUERY)
      .pipe(map((state) => state.matches)),
    { initialValue: inject(MediaMatcher).matchMedia(DESKTOP_QUERY).matches },
  );
}
