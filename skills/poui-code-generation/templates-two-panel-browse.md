# Template: two-panel-browse

Generates a reconciliation/matching screen with **two po-table panels side by side**.
The user selects one row from the left browse, then one from the right, then confirms an action.

Use cases: card reconciliation, accounts payable/receivable matching, document pairing.

> **Before using this template**, read the column-width rule in the **Horizontal scroll prevention** section below.
> Failing to calculate widths will cause horizontal scroll on both browse panels.

---

## Key patterns

| Pattern | Implementation |
|---|---|
| Dynamic height (no page scroll) | `browseHeight = computed(() => Math.max(180, winH() - OFFSET))` |
| No horizontal scroll | Sum of all `p-width` values (including checkbox 41px) must equal panel width |
| Single-select per browse | On `(p-selected)`, clear previous selection via `items.update(...)` |
| Cross-browse validation | Left must be selected before right; validate in `(p-selected)` of right browse |
| Button alignment with po-input | `.header-botoes { margin-bottom: 8px }` — cancels po-input's internal 8px error-space |
| Checkbox column width | Override with `::ng-deep .po-table-column-selectable { width: 41px !important }` |
| Keyboard navigation | `@HostListener('window:keydown')` routes ArrowUp/Down to active panel; Tab switches panel |
| Scroll sync | `_scrollRowIntoView()` walks DOM for real scrollable ancestor; callers use `setTimeout(..., 50)` |
| Focus ring suppression | `::ng-deep *:focus, *:focus-visible { outline: none }` — prevents scroll artifact at browse edge |
| Active panel indicator | `border-top-color` on `.browse-titulo` — never `outline` on po-table-container |

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

## {{kebab-name}}.component.html

```html
<po-page-default p-title="{{PageTitle}}">

  <!-- Header: filter inputs + action buttons -->
  <!-- ALIGNMENT NOTE: po-input reserves 8px below the field for error messages.
       .header-botoes needs margin-bottom:8px so buttons align with the input field,
       not the invisible error-space below it. See SCSS. -->
  <div class="div-header">
    <div class="header-filtros">
      <po-input
        name="filtro1"
        p-label="Filtro 1"
        [p-maxlength]="10"
        [(ngModel)]="filtro1"
        class="input-f1">
      </po-input>
      <po-input
        name="filtro2"
        p-label="Filtro 2"
        [p-maxlength]="10"
        [(ngModel)]="filtro2"
        class="input-f2">
      </po-input>
      <po-button
        p-label="Carregar"
        p-kind="primary"
        p-icon="po-icon-search"
        (p-click)="carregar()">
      </po-button>
    </div>
    <div class="header-botoes">
      <po-button
        p-label="Confirmar"
        p-kind="primary"
        p-icon="po-icon-ok"
        [p-disabled]="!selectedLeft() || !selectedRight()"
        (p-click)="confirmar()">
      </po-button>
      <po-button
        p-label="Cancelar"
        p-kind="tertiary"
        p-icon="po-icon-close"
        (p-click)="cancelar()">
      </po-button>
    </div>
  </div>

  <!-- Contextual status bar — appears only when left row is selected -->
  <div class="div-status-sel" *ngIf="selectedLeft()">
    <span class="sel-info">
      Selecionado: <strong>{{ selectedLeft()!['id'] }}</strong>
    </span>
    <span class="sel-seta" *ngIf="!selectedRight()">→ Selecione o registro correspondente à direita</span>
    <span class="sel-seta" *ngIf="selectedRight()">✓ Pronto — clique em Confirmar</span>
  </div>

  <!-- Two browse panels side by side -->
  <div class="div-browses">

    <!-- Left browse -->
    <div class="browse-panel browse-panel-left" (click)="onPanelLeftClick()">
      <div class="browse-titulo" [class.browse-titulo-ativo]="activeBrowse() === 'left'">
        <span class="browse-nome">{{LeftPanelTitle}}</span>
        <span class="browse-count">{{ leftItems().length }} reg. &nbsp;·&nbsp; Tab ↔ ↑↓</span>
      </div>
      <po-table
        [p-columns]="colunasLeft"
        [p-items]="leftItems()"
        [p-selectable]="true"
        [p-selectable-entire-line]="false"
        [p-loading]="loading()"
        [p-height]="browseHeight()"
        [p-virtual-scroll]="false"
        [p-hide-action-fixed-columns]="true"
        (p-selected)="onSelectLeft($event)"
        (p-unselected)="onUnselectLeft($event)"
        (p-all-selected)="onAllSelectedLeft()"
        (p-all-unselected)="selectedLeft.set(null)">

        <ng-template p-table-column-template [p-property]="'status'" let-value>
          <span [class]="'status-dot status-dot-' + value" [title]="statusLabel(value)"></span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'valor'" let-value>
          <span class="valor-num">{{ fmtVal(value) }}</span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'taxa'" let-value>
          <span class="valor-num valor-taxa">{{ fmtVal(value) }}</span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'liquido'" let-value>
          <span class="valor-num">{{ fmtVal(value) }}</span>
        </ng-template>
      </po-table>
    </div>

    <!-- Right browse -->
    <div class="browse-panel browse-panel-right" (click)="onPanelRightClick()">
      <div class="browse-titulo" [class.browse-titulo-ativo]="activeBrowse() === 'right'">
        <span class="browse-nome">{{RightPanelTitle}}</span>
        <span class="browse-count">{{ rightItems().length }} reg.</span>
      </div>
      <po-table
        [p-columns]="colunasRight"
        [p-items]="rightItems()"
        [p-selectable]="true"
        [p-selectable-entire-line]="false"
        [p-loading]="loading()"
        [p-height]="browseHeight()"
        [p-virtual-scroll]="false"
        [p-hide-action-fixed-columns]="true"
        (p-selected)="onSelectRight($event)"
        (p-unselected)="onUnselectRight($event)"
        (p-all-selected)="onAllSelectedRight()"
        (p-all-unselected)="selectedRight.set(null)">

        <ng-template p-table-column-template [p-property]="'status'" let-value>
          <span [class]="'status-dot status-dot-' + value" [title]="statusLabel(value)"></span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'valor'" let-value>
          <span class="valor-num">{{ fmtVal(value) }}</span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'taxa'" let-value>
          <span class="valor-num valor-taxa">{{ fmtVal(value) }}</span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'liquido'" let-value>
          <span class="valor-num">{{ fmtVal(value) }}</span>
        </ng-template>
      </po-table>
    </div>

  </div>

  <!-- Status legend -->
  <div class="div-legenda">
    <!-- TODO: adjust to your domain status codes -->
    <span class="legenda-item"><span class="status-dot status-dot-1"></span> Não Processado</span>
    <span class="legenda-item"><span class="status-dot status-dot-2"></span> Processado</span>
    <span class="legenda-item"><span class="status-dot status-dot-3"></span> Com Erro</span>
  </div>

  <!-- Footer totals -->
  <div class="div-totais">
    <div class="total-item">
      <span class="total-label">Total:</span>
      <span class="total-valor">{{ fmtVal(leftItems().reduce((s, r) => s + r['valor'], 0)) }}</span>
    </div>
  </div>

</po-page-default>
```

---

## {{kebab-name}}.component.scss

```scss
:host {
  display: block;
  font-size: 12px;
}

// ── Header: filter inputs + action buttons
.div-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;

  .header-filtros {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-wrap: wrap;

    .input-f1 { width: 100px; }
    .input-f2 { width: 100px; }

    // po-button inside a flex container with align-items:flex-end needs margin-bottom:8px
    // because po-input reserves 8px below the visible field for error messages.
    // Without this, the button sits 8px lower than the input field.
    po-button { margin-bottom: 8px; }
  }

  .header-botoes {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    // Same 8px offset correction for the right-side buttons
    margin-bottom: 8px;
  }
}

// ── Contextual status bar (visible when left row is selected)
.div-status-sel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 10px;
  background: #e3f2fd;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 11px;
  border-left: 3px solid #1565c0;

  .sel-seta {
    color: #1565c0;
    font-style: italic;
    margin-left: auto;
  }
}

// ── Two browse panels side by side
// gap: 4px (not 8px) to maximize panel width and avoid horizontal scroll
.div-browses {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.browse-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  // Hide the column-manager gear (controlled via a dedicated button if needed)
  ::ng-deep .po-table-actions-column-manager {
    display: none;
  }

  // Reduce internal checkbox column from 56px to ~41px
  // po-table-column-selectable is PO-UI's internal selectable column; not controllable via p-width
  ::ng-deep .po-table-column-selectable {
    width: 41px !important;
    min-width: 41px !important;
    max-width: 41px !important;
  }

  // Compact rows
  ::ng-deep tbody td {
    padding-top: 3px !important;
    padding-bottom: 3px !important;
  }

  ::ng-deep .po-table-body-ellipsis,
  ::ng-deep .po-table-header-ellipsis {
    font-size: 11px;
  }

  // Row highlight from keyboard navigation (set via classList in component)
  ::ng-deep .row-ativa td { background-color: #dbeafe !important; }

  // Suppress ALL browser focus rings — prevents the blue outline artifact that
  // appears on the po-table-container-overflow element when clicking or scrolling.
  ::ng-deep *:focus,
  ::ng-deep *:focus-visible {
    outline:    none !important;
    box-shadow: none !important;
  }
}

.browse-titulo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  background: #f0f4f8;
  border: 1px solid #d0d7de;
  border-bottom: none;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  // Active-panel indicator: 2px top border changes color (same pattern as stacked-browse).
  // Using border-top-color avoids the scroll artifact caused by outline on the table container.
  border-top: 2px solid var(--color-neutral-light-10, #e0e0e0);
  transition: border-top-color 0.1s;

  .browse-nome  { font-size: 12px; font-weight: 700; color: #333; }
  .browse-count { font-size: 10px; color: #777; }
}

.browse-titulo-ativo {
  border-top-color: var(--color-action-default, #0079c3) !important;
}

// ── Status dot (colored circle in St. column)
.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  vertical-align: middle;
  flex-shrink: 0;
}

// TODO: adjust colors to your domain status codes
.status-dot-1 { background-color: #1565c0; }  // Não Processado — azul
.status-dot-2 { background-color: #2e7d32; }  // Processado — verde
.status-dot-3 { background-color: #c62828; }  // Com Erro — vermelho

// ── Monetary values (right-aligned, colored)
.valor-num  { display: block; text-align: right; font-size: 11px; font-weight: 600; color: #1565c0; }
.valor-taxa { color: #d32f2f; }

// ── Status legend
.div-legenda {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 5px 10px;
  background: #f5f6fa;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 2px;
  flex-wrap: wrap;

  .legenda-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: #555;
    white-space: nowrap;
  }
}

// ── Footer totals
.div-totais {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 7px 12px;
  background: #fff;
  border-top: 2px solid #e0e0e0;

  .total-item  { display: flex; align-items: center; gap: 8px; }
  .total-label { font-size: 11px; font-weight: 700; color: #555; white-space: nowrap; }
  .total-valor { font-size: 14px; font-weight: 700; color: #1565c0; font-family: monospace; min-width: 110px; text-align: right; }
}
```

---

## Horizontal scroll prevention — column width calculation

> **This is the most common mistake when building two-panel browses.**
> Each browse panel must have `tableWidth === panelWidth`. If `tableWidth > panelWidth`, po-table adds a horizontal scrollbar.

### Formula

```
panel_width = (viewport_width - sidebar_width - page_padding - inter_panel_gap) / 2
checkbox_width = 41px  (after ::ng-deep override; po-table default is 56px)
data_columns_budget = panel_width - checkbox_width
```

Typical values at 1366px viewport:
- Sidebar: 280px
- po-page-default content padding: 32px (16px each side)
- Inter-panel gap: 4px (use gap:4px in .div-browses, not 8px)
- Per panel: (1366 - 280 - 32 - 4) / 2 = **525px** (actual rendered ~520px — measure with Playwright)

### Verification with Playwright

```javascript
// Run after page loads to verify overflow
const r = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.browse-panel')).map(p => {
    const pr = p.getBoundingClientRect();
    const tr = p.querySelector('table')?.getBoundingClientRect();
    return { panelW: Math.round(pr.width), tableW: Math.round(tr?.width ?? 0), overflow: Math.round((tr?.width ?? 0) - pr.width) };
  })
);
// overflow must be 0 on both panels
```

### Column width sizing reference

At **11px font** with **8px horizontal cell padding** (16px total per cell), minimum visible text area = `column_width - 16px`.

| Content type | Typical content | Min column |
|---|---|---|
| Date `dd/MM/yyyy` | "10/01/2025" (65px text) | 84px |
| Currency | "3.200,00" (48px text) | 68px |
| Short code | "NF001" (30px text) | 50px |
| Medium code | "PED001" (36px text) | 58px |
| Status dot | 10px dot | 28px |
| Parcel "001" | 18px text | 36px |

---

## models/{{modelFile}}.model.ts

```typescript
export interface {{LeftModel}} {
  id: string;
  status: string;    // '1' = not processed, '2' = processed, '3' = error
  data: string;      // ISO date yyyy-MM-dd
  titulo: string;
  pedido: string;
  parcela: string;
  valor: number;
  taxa: number;
  liquido: number;
}

export interface {{RightModel}} {
  id: string;
  status: string;
  pedido: string;
  emissao: string;   // ISO date yyyy-MM-dd
  titulo: string;
  parcela: string;
  valor: number;
  taxa: number;
  liquido: number;
}

export interface {{ConfirmRequest}} {
  leftId: string;
  rightId: string;
}
```
