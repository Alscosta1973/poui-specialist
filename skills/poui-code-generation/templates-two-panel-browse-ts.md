# Template: two-panel-browse — TypeScript component

> Sub-file of `templates-two-panel-browse.md`. Load this file when generating `.component.ts`.
> Load `templates-two-panel-browse-html.md` for `.component.html` and `.component.scss`.

---

## {{kebab-name}}.component.ts

```typescript
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  PoButtonModule,
  PoFieldModule,
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{LeftModel}}, {{RightModel}}, {{ConfirmRequest}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [CommonModule, FormsModule, PoPageModule, PoTableModule, PoButtonModule, PoFieldModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit {
  private readonly service      = inject({{ServiceClass}});
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  // ── Filter fields (adjust to your domain)
  filtro1 = '';
  filtro2 = '';
  filtro3 = '';

  // ── State
  readonly loading      = signal(false);
  readonly leftItems    = signal<{{LeftModel}}[]>([]);
  readonly rightItems   = signal<{{RightModel}}[]>([]);
  readonly selectedLeft = signal<{{LeftModel}} | null>(null);
  readonly selectedRight= signal<{{RightModel}} | null>(null);

  // ── Keyboard navigation
  readonly cursorLeft   = signal<number>(-1);
  readonly cursorRight  = signal<number>(-1);
  readonly activeBrowse = signal<'left' | 'right'>('left');

  // ── Dynamic height (no page scroll)
  // OFFSET = sum of all fixed-height elements outside the browse:
  //   PO shell (~232px) + header (~90px) + browse-title (~30px) + footer (~50px) = ~402px
  // Add ~36px when a contextual status bar is visible.
  private readonly _winH = signal(window.innerHeight);
  readonly browseHeight = computed(() =>
    Math.max(180, this._winH() - (this.selectedLeft() ? 438 : 402))
  );

  // ── Column definitions
  // IMPORTANT: sum of all p-width values + 41px (checkbox) must equal panel width.
  // Panel width = (viewport - sidebar - page-padding - gap) / 2
  // For 1366px viewport: (1366 - 280 - 32 - 4) / 2 = 525px → panel ≈ 520px
  // Data columns budget: 520 - 41 = 479px
  readonly colunasLeft: PoTableColumn[] = [
    // TODO: adjust widths so they sum to (panel_width - 41)
    { property: 'status',   label: 'St.',    width: '28px', type: 'columnTemplate' },
    { property: 'data',     label: 'Data',   width: '84px', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'titulo',   label: 'Título', width: '60px' },
    { property: 'pedido',   label: 'Pedido', width: '70px' },
    { property: 'parcela',  label: 'Par.',   width: '38px' },
    { property: 'valor',    label: 'Valor',  width: '72px', type: 'columnTemplate' },
    { property: 'taxa',     label: 'Taxa',   width: '64px', type: 'columnTemplate' },
    { property: 'liquido',  label: 'Líq.',   width: '63px', type: 'columnTemplate' },
    // Total data: 28+84+60+70+38+72+64+63 = 479 → with checkbox 41 = 520px ✓
  ];

  readonly colunasRight: PoTableColumn[] = [
    // TODO: adjust widths so they sum to (panel_width - 41)
    { property: 'status',   label: 'St.',    width: '28px', type: 'columnTemplate' },
    { property: 'pedido',   label: 'Pedido', width: '70px' },
    { property: 'emissao',  label: 'Emissão',width: '84px', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'titulo',   label: 'Título', width: '58px' },
    { property: 'parcela',  label: 'Par.',   width: '38px' },
    { property: 'valor',    label: 'Valor',  width: '72px', type: 'columnTemplate' },
    { property: 'taxa',     label: 'Taxa',   width: '64px', type: 'columnTemplate' },
    { property: 'liquido',  label: 'Líq.',   width: '65px', type: 'columnTemplate' },
    // Total data: 28+70+84+58+38+72+64+65 = 479 → with checkbox 41 = 520px ✓
  ];

  ngOnInit(): void {
    this.carregar();
  }

  ngAfterViewInit(): void {
    this._winH.set(window.innerHeight);
  }

  @HostListener('window:resize')
  onResize(): void { this._winH.set(window.innerHeight); }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (event.key === 'Tab') {
      event.preventDefault();
      this.activeBrowse.set(this.activeBrowse() === 'left' ? 'right' : 'left');
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;

    if (this.activeBrowse() === 'left') {
      this._moverCursorLeft(delta);
    } else {
      this._moverCursorRight(delta);
    }
  }

  onPanelLeftClick(): void  { this.activeBrowse.set('left'); }
  onPanelRightClick(): void { this.activeBrowse.set('right'); }

  private _moverCursorLeft(delta: number): void {
    const its  = this.leftItems();
    if (!its.length) return;
    const cur  = this.cursorLeft();
    const next = cur < 0 ? 0 : Math.max(0, Math.min(its.length - 1, cur + delta));
    if (next === cur && cur >= 0) return;
    this.cursorLeft.set(next);
    setTimeout(() => this._highlightRow('left', next), 50);
  }

  private _moverCursorRight(delta: number): void {
    const its  = this.rightItems();
    if (!its.length) return;
    const cur  = this.cursorRight();
    const next = cur < 0 ? 0 : Math.max(0, Math.min(its.length - 1, cur + delta));
    if (next === cur && cur >= 0) return;
    this.cursorRight.set(next);
    setTimeout(() => this._highlightRow('right', next), 50);
  }

  private _highlightRow(side: 'left' | 'right', idx: number): void {
    const sel = side === 'left' ? '.browse-panel-left' : '.browse-panel-right';
    document.querySelectorAll(`${sel} .row-ativa`).forEach(el => el.classList.remove('row-ativa'));
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>(`${sel} table tbody tr`);
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  // Walks up from the row to find the real scrollable ancestor.
  // Callers MUST use setTimeout(..., 50) — NOT 0ms — so PO-UI's change detection
  // has completed and getBoundingClientRect() returns correct values.
  private _scrollRowIntoView(row: HTMLElement): void {
    let container: HTMLElement | null = row.parentElement;
    while (container && container !== document.documentElement) {
      const s = window.getComputedStyle(container);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && container.scrollHeight > container.clientHeight) break;
      container = container.parentElement;
    }
    if (!container || container === document.documentElement) return;
    const thead     = container.querySelector('thead') as HTMLElement | null;
    const theadH    = thead ? thead.offsetHeight : 0;
    const cRect     = container.getBoundingClientRect();
    const rRect     = row.getBoundingClientRect();
    const rowTop    = rRect.top - cRect.top + container.scrollTop;
    const rowBottom = rowTop + row.offsetHeight;
    const visTop    = container.scrollTop + theadH;
    const visBot    = container.scrollTop + container.clientHeight;
    if (rowTop    < visTop)  container.scrollTop = Math.max(0, rowTop - theadH);
    else if (rowBottom > visBot) container.scrollTop = rowBottom - container.clientHeight;
  }

  carregar(): void {
    if (!this.filtro1) {
      this.notification.warning('Informe os filtros para carregar.');
      return;
    }
    this.loading.set(true);
    this.selectedLeft.set(null);
    this.selectedRight.set(null);
    forkJoin({
      left:  this.service.carregarEsquerda(this.filtro1, this.filtro2, this.filtro3),
      right: this.service.carregarDireita(this.filtro1, this.filtro2, this.filtro3),
    })
    .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ left, right }) => {
        this.leftItems.set(left);
        this.rightItems.set(right);
        this.cdr.markForCheck();
      },
      error: () => this.notification.error('Erro ao carregar dados.'),
    });
  }

  confirmar(): void {
    const left  = this.selectedLeft();
    const right = this.selectedRight();
    if (!left || !right) {
      this.notification.warning('Selecione um registro em cada painel para confirmar.');
      return;
    }
    const req: {{ConfirmRequest}} = { leftId: left['id'], rightId: right['id'] };
    this.loading.set(true);
    this.service.confirmar(req)
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success('Operação confirmada com sucesso.');
          // Mark both rows as processed in place (status '2' = done, adjust per domain)
          this.leftItems.update(rows =>
            rows.map(r => r['id'] === left['id']  ? { ...r, status: '2', $selected: false } : r)
          );
          this.rightItems.update(rows =>
            rows.map(r => r['id'] === right['id'] ? { ...r, status: '2', $selected: false } : r)
          );
          this.selectedLeft.set(null);
          this.selectedRight.set(null);
          this.cdr.markForCheck();
        },
        error: () => this.notification.error('Erro ao confirmar operação.'),
      });
  }

  cancelar(): void {
    this.filtro1 = '';
    this.filtro2 = '';
    this.filtro3 = '';
    this.leftItems.set([]);
    this.rightItems.set([]);
    this.selectedLeft.set(null);
    this.selectedRight.set(null);
    this.cdr.markForCheck();
  }

  // ── Left browse: single-select, only status '1' selectable
  onSelectLeft(item: {{LeftModel}}): void {
    if (item['status'] !== '1') {
      this.notification.warning('Apenas registros não processados podem ser selecionados.');
      this.leftItems.update(rows => rows.map(r => r['id'] === item['id'] ? { ...r, $selected: false } : r));
      this.cdr.markForCheck();
      return;
    }
    const prev = this.selectedLeft();
    if (prev && prev['id'] !== item['id']) {
      this.leftItems.update(rows => rows.map(r => r['id'] === prev['id'] ? { ...r, $selected: false } : r));
    }
    this.selectedLeft.set(item);
    // Clear right selection when left changes
    this.selectedRight.set(null);
    this.rightItems.update(rows => rows.map(r => ({ ...r, $selected: false })));
    this.cdr.markForCheck();
  }

  onUnselectLeft(item: {{LeftModel}}): void {
    if (this.selectedLeft()?.['id'] === item['id']) {
      this.selectedLeft.set(null);
      this.selectedRight.set(null);
    }
    this.cdr.markForCheck();
  }

  onAllSelectedLeft(): void {
    this.notification.warning('Selecione apenas um registro por vez.');
    this.leftItems.update(rows => rows.map(r => ({ ...r, $selected: false })));
    this.selectedLeft.set(null);
    this.cdr.markForCheck();
  }

  // ── Right browse: requires left to be selected first
  onSelectRight(item: {{RightModel}}): void {
    if (!this.selectedLeft()) {
      this.notification.warning('Selecione primeiro um registro no painel esquerdo.');
      this.rightItems.update(rows => rows.map(r => r['id'] === item['id'] ? { ...r, $selected: false } : r));
      this.cdr.markForCheck();
      return;
    }
    if (item['status'] !== '1') {
      this.notification.warning('Apenas registros não processados podem ser selecionados.');
      this.rightItems.update(rows => rows.map(r => r['id'] === item['id'] ? { ...r, $selected: false } : r));
      this.cdr.markForCheck();
      return;
    }
    const prev = this.selectedRight();
    if (prev && prev['id'] !== item['id']) {
      this.rightItems.update(rows => rows.map(r => r['id'] === prev['id'] ? { ...r, $selected: false } : r));
    }
    this.selectedRight.set(item);
    this.cdr.markForCheck();
  }

  onUnselectRight(item: {{RightModel}}): void {
    if (this.selectedRight()?.['id'] === item['id']) this.selectedRight.set(null);
    this.cdr.markForCheck();
  }

  onAllSelectedRight(): void {
    this.notification.warning('Selecione apenas um registro por vez.');
    this.rightItems.update(rows => rows.map(r => ({ ...r, $selected: false })));
    this.selectedRight.set(null);
    this.cdr.markForCheck();
  }

  statusLabel(status: string): string {
    // TODO: adjust labels to your domain
    const map: Record<string, string> = {
      '1': 'Não Processado',
      '2': 'Processado',
      '3': 'Com Erro',
    };
    return map[status] ?? status;
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
```

---
