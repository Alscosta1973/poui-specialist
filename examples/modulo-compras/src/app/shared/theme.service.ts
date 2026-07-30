import { inject, Injectable, signal } from '@angular/core';
import { PoThemeService, PoThemeTypeEnum } from '@po-ui/ng-components';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly po = inject(PoThemeService);
  private readonly KEY = 'po_theme';

  readonly theme = signal<'light' | 'dark'>(
    (localStorage.getItem(this.KEY) as 'light' | 'dark') ?? this.systemDefault()
  );

  constructor() {
    this.apply(this.theme());
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', e => {
        if (!localStorage.getItem(this.KEY)) this.apply(e.matches ? 'dark' : 'light');
      });
  }

  toggle(): void {
    this.apply(this.theme() === 'light' ? 'dark' : 'light');
    localStorage.setItem(this.KEY, this.theme());
  }

  private apply(t: 'light' | 'dark'): void {
    this.po.changeCurrentThemeType(t === 'dark' ? PoThemeTypeEnum.dark : PoThemeTypeEnum.light);
    this.theme.set(t);
  }

  private systemDefault(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
