import { Injectable } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Production-only UX deterrent: disables the default context menu and blocks common
 * keyboard shortcuts that open DevTools or view source.
 *
 * This does not prevent inspection (browser menus, extensions, remote debugging, or
 * disabled JavaScript). Real protection belongs on the server.
 *
 * Testing: `ng serve` uses development by default (`environment.production` is false).
 * Use `ng serve --configuration=production` to verify this behavior locally.
 */
@Injectable({
  providedIn: 'root',
})
export class BrowserHardeningService {
  init(appDestroy$: Observable<void>): void {
    if (!environment.production) {
      return;
    }

    fromEvent(document, 'contextmenu', { capture: true })
      .pipe(takeUntil(appDestroy$))
      .subscribe((ev: Event) => {
        ev.preventDefault();
      });

    fromEvent<KeyboardEvent>(document, 'keydown', { capture: true })
      .pipe(
        takeUntil(appDestroy$),
        filter((ev) => !this.isEditableActiveElement() && this.isDevtoolsKeyCombo(ev))
      )
      .subscribe((ev) => {
        ev.preventDefault();
      });
  }

  private isEditableActiveElement(): boolean {
    const el = document.activeElement;
    if (!el || !(el instanceof HTMLElement)) {
      return false;
    }
    if (el.isContentEditable) {
      return true;
    }
    const tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') {
      return true;
    }
    if (tag === 'INPUT') {
      const t = (el as HTMLInputElement).type;
      return (
        !t ||
        t === 'text' ||
        t === 'search' ||
        t === 'email' ||
        t === 'password' ||
        t === 'tel' ||
        t === 'url' ||
        t === 'number'
      );
    }
    return false;
  }

  private isDevtoolsKeyCombo(ev: KeyboardEvent): boolean {
    const lower = ev.key.toLowerCase();

    if (ev.key === 'F12') {
      return true;
    }

    if ((ev.ctrlKey || ev.metaKey) && lower === 'u') {
      return true;
    }

    const letter = lower === 'i' || lower === 'j' || lower === 'c';
    if (letter && ev.shiftKey && (ev.ctrlKey || ev.metaKey)) {
      return true;
    }

    if (letter && ev.altKey && ev.metaKey) {
      return true;
    }

    return false;
  }
}
