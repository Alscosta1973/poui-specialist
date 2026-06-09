# Template: stacked-browse

Generates a master-detail screen with **two stacked po-table components**:
- Top browse (master): user navigates rows with ArrowUp/Down; selecting a row loads its items in the detail browse below.
- Bottom browse (detail): shows items of the selected master row; supports multi-select via checkboxes.
- Tab key switches keyboard focus between the two browses.
- Compact filter bar with "Remover Filtro" always visible in the master header.

Use cases: SC5/SC6 (orders + items), invoice lines, stock entries, any ERP master-detail where both levels need independent keyboard navigation.

> Use `two-panel-browse` for side-by-side reconciliation/matching.
> Use `master-detail` for inline expandable rows (no separate detail browse needed).

---

## Key patterns

| Pattern | Implementation |
|---|---|
| Active browse indicator | `border-top-color` on `.browse-cabecalho` — never `outline` (outline creates a scroll artifact at the bottom edge of the browse) |
| Keyboard navigation | `@HostListener('window:keydown')` routes ArrowUp/Down to active browse; Tab switches browse |
| Scroll sync | `_scrollRowIntoView()` walks DOM to find real scrollable ancestor; callers use `setTimeout(..., 50)` NOT 0ms |
| No page scroll | `masterHeight` + `detailHeight` computed signals using `_winH() - OFFSET` |
| Focus ring suppression | `::ng-deep *:focus, ::ng-deep *:focus-visible { outline: none }` inside each browse container |
| Compact filter bar | `--font-size: 12px` CSS variable on `.filtros-bar` cascades to all PO-UI children |
| Remover Filtro | Always rendered + always red; cursor and underline-hover only when `isFiltrado()` is true |
| Demo data | `const DEMO_*` at top of component file; loaded in `error` callback of service call |

---

## {{kebab-name}}.component.ts

```typescript
/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
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
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PoButtonModule,
  PoFieldModule,
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{MasterModel}}, {{DetailModel}} } from '../models/{{modelFile}}.model';

// Demo data — remove when wiring the real service
const DEMO_MASTER: {{MasterModel}}[] = [
  // TODO: populate with realistic sample records
  { {{masterKey}}: '000001', descricao: 'Exemplo 1', status: 'A', dataEmissao: '2026-06-01', valor: 1000 } as any,
  { {{masterKey}}: '000002', descricao: 'Exemplo 2', status: 'A', dataEmissao: '2026-06-02', valor: 2000 } as any,
  { {{masterKey}}: '000003', descricao: 'Exemplo 3', status: 'F', dataEmissao: '2026-06-03', valor: 3000 } as any,
];

const DEMO_DETAIL: Record<string, {{DetailModel}}[]> = {
  '000001': [
    { item: '01', produto: 'PROD001', descricao: 'Produto A', qtd: 5,  valor: 200 } as any,
    { item: '02', produto: 'PROD002', descricao: 'Produto B', qtd: 10, valor: 600 } as any,
  ],
  '000002': [
    { item: '01', produto: 'PROD003', descricao: 'Produto C', qtd: 2,  valor: 1000 } as any,
  ],
  '000003': [],
};

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [CommonModule, FormsModule, PoPageModule, PoTableModule, PoButtonModule, PoFieldModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  private readonly service      = inject({{ServiceClass}});
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  // ── Data signals
  readonly items             = signal<{{MasterModel}}[]>([]);
  readonly detailItems       = signal<{{DetailModel}}[]>([]);
  readonly masterAtual       = signal<{{MasterModel}} | null>(null);
  readonly itensSelecionados = signal<{{DetailModel}}[]>([]);

  // ── Navigation signals
  readonly cursorIndex  = signal<number>(0);
  readonly cursorDetail = signal<number>(-1);
  readonly activeBrowse = signal<'master' | 'detail'>('master');
  readonly isFiltrado   = signal(false);

  // ── Responsive heights — no page scroll
  // Offset 320px = PO shell navbar + page title + filtros-bar + browse headers + rodapé
  // Adjust if you add/remove fixed elements.
  private readonly _winH = signal(window.innerHeight);
  readonly masterHeight  = computed(() => Math.max(160, Math.floor((this._winH() - 320) * 0.47)));
  readonly detailHeight  = computed(() => Math.max(140, Math.floor((this._winH() - 320) * 0.40)));

  // ── Filter fields (plain object — simpler than signals for a group of form fields)
  filtros = { campo1: '', campo2: '', dataDE: '', dataATE: '' };

  // ── Column definitions — TODO: replace with your domain fields
  readonly colunasMaster: PoTableColumn[] = [
    { property: '{{masterKey}}', label: 'Código',   width: '100px' },
    { property: 'descricao',     label: 'Descrição' },
    { property: 'dataEmissao',   label: 'Emissão',  type: 'date', format: 'dd/MM/yyyy', width: '110px' },
    { property: 'valor',         label: 'Valor',    type: 'currency', format: 'BRL', width: '120px' },
    {
      property: 'status', label: 'Status', width: '90px',
      type: 'label',
      labels: [
        { value: 'A', label: 'Aberto',     color: 'color-08' },
        { value: 'F', label: 'Finalizado', color: 'color-11' },
        { value: 'C', label: 'Cancelado',  color: 'color-07' },
      ],
    },
  ];

  readonly colunasDetail: PoTableColumn[] = [
    { property: 'item',      label: 'Item',      width: '60px' },
    { property: 'produto',   label: 'Produto',   width: '100px' },
    { property: 'descricao', label: 'Descrição' },
    { property: 'qtd',       label: 'Qtde',      type: 'number',   width: '80px' },
    { property: 'valor',     label: 'Valor',     type: 'currency', format: 'BRL', width: '120px' },
  ];

  // ── Computed display values
  readonly tituloDetail = computed(() => {
    const m = this.masterAtual();
    return m ? `{{DetailTitle}} — ${m['{{masterKey}}']}` : '{{DetailTitle}}';
  });

  readonly qtdSelecionados  = computed(() => this.itensSelecionados().length);
  readonly totalSelecionado = computed(() =>
    this.itensSelecionados().reduce((s, i) => s + ((i as any)['valor'] ?? 0), 0)
  );
  readonly podeConfirmar = computed(() => this.itensSelecionados().length > 0);

  ngOnInit(): void {
    this.buscar();
  }

  @HostListener('window:resize')
  onResize(): void { this._winH.set(window.innerHeight); }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (event.key === 'Tab') {
      event.preventDefault();
      const next = this.activeBrowse() === 'master' ? 'detail' : 'master';
      this.activeBrowse.set(next);
      if (next === 'detail' && this.cursorDetail() < 0 && this.detailItems().length) {
        this.cursorDetail.set(0);
        setTimeout(() => this._highlightDetailRow(), 50);
      }
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;

    if (this.activeBrowse() === 'master') {
      this._moverCursor(delta);
      setTimeout(() => this._highlightMasterRow(), 50);
    } else {
      this._moverCursorDetail(delta);
      setTimeout(() => this._highlightDetailRow(), 50);
    }
  }

  private _moverCursor(delta: number): void {
    const its  = this.items();
    if (!its.length) return;
    const cur  = this.cursorIndex();
    const next = cur < 0 ? 0 : Math.max(0, Math.min(its.length - 1, cur + delta));
    if (next === cur && cur >= 0) return;
    this.cursorIndex.set(next);
    this.onMasterSelecionado(its[next]);
  }

  private _moverCursorDetail(delta: number): void {
    const its  = this.detailItems();
    if (!its.length) return;
    const cur  = this.cursorDetail();
    const next = cur < 0 ? 0 : Math.max(0, Math.min(its.length - 1, cur + delta));
    if (next === cur && cur >= 0) return;
    this.cursorDetail.set(next);
    setTimeout(() => this._highlightDetailRow(), 50);
  }

  private _highlightMasterRow(): void {
    document.querySelectorAll('.master-browse .row-ativa').forEach(el => el.classList.remove('row-ativa'));
    const idx  = this.cursorIndex();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.master-browse table tbody tr');
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  private _highlightDetailRow(): void {
    document.querySelectorAll('.detail-browse .row-ativa').forEach(el => el.classList.remove('row-ativa'));
    const idx  = this.cursorDetail();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.detail-browse table tbody tr');
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  // Walks up from the row to find the real scrollable ancestor.
  // Callers MUST use setTimeout(..., 50) — NOT 0ms — so PO-UI's change detection
  // has completed and getBoundingClientRect() returns correct values.
  // Never use scrollIntoView({ block:'nearest' }): it ignores the sticky thead and
  // hides row 0 behind the fixed header.
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

  // ── Master browse events
  onMasterSelecionado(item: {{MasterModel}}): void {
    const idx = this.items().findIndex(i => (i as any)['{{masterKey}}'] === (item as any)['{{masterKey}}']);
    this.cursorIndex.set(idx);
    this.masterAtual.set(item);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this._carregarItens((item as any)['{{masterKey}}']);
    this.cdr.markForCheck();
    setTimeout(() => this._highlightMasterRow(), 50);
  }

  onMasterDeselecionado(_item: {{MasterModel}}): void {
    // single-select: master stays selected even on p-unselected
  }

  onMasterClick(): void { this.activeBrowse.set('master'); }

  // ── Detail browse events
  onItemSelecionado(item: {{DetailModel}}): void {
    this.itensSelecionados.update(prev => [...prev, item]);
    const idx = this.detailItems().findIndex(i => (i as any)['item'] === (item as any)['item']);
    if (idx >= 0) this.cursorDetail.set(idx);
    setTimeout(() => this._highlightDetailRow(), 50);
  }

  onItemDeselecionado(item: {{DetailModel}}): void {
    this.itensSelecionados.update(prev =>
      prev.filter(i => (i as any)['item'] !== (item as any)['item'])
    );
  }

  onTodosItensSelecionados(): void {
    this.itensSelecionados.set([...this.detailItems()]);
    this.cdr.markForCheck();
  }

  onTodosItensDeselecionados(): void {
    this.itensSelecionados.set([]);
    this.cdr.markForCheck();
  }

  onDetailClick(): void {
    this.activeBrowse.set('detail');
    if (this.cursorDetail() < 0 && this.detailItems().length) {
      this.cursorDetail.set(0);
      setTimeout(() => this._highlightDetailRow(), 50);
    }
  }

  // ── Search & filter
  buscar(): void {
    const { campo1, campo2, dataDE, dataATE } = this.filtros;
    const de  = this._toISO(dataDE);
    const ate = this._toISO(dataATE);

    // TODO: replace DEMO_MASTER with real service call:
    // this.service.buscar(this.filtros).subscribe({ next: r => { ... } });
    const resultado = DEMO_MASTER.filter(r => {
      const m = r as any;
      if (campo1?.trim() && !String(m['{{masterKey}}']).includes(campo1.trim())) return false;
      if (campo2?.trim() && !String(m['descricao'] ?? '').toLowerCase().includes(campo2.trim().toLowerCase())) return false;
      if (de  && String(m['dataEmissao'] ?? '') < de)  return false;
      if (ate && String(m['dataEmissao'] ?? '') > ate) return false;
      return true;
    });

    this.isFiltrado.set(!!(campo1?.trim() || campo2?.trim() || dataDE?.trim() || dataATE?.trim()));
    this.masterAtual.set(null);
    this.detailItems.set([]);
    this.itensSelecionados.set([]);
    this.cursorIndex.set(0);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this.items.set(resultado.map(r => ({ ...r })));
    this.cdr.markForCheck();
    if (resultado.length > 0) setTimeout(() => this.onMasterSelecionado(resultado[0]), 0);
  }

  removerFiltro(): void {
    const keyAtivo = (this.masterAtual() as any)?.['{{masterKey}}'];
    this.filtros   = { campo1: '', campo2: '', dataDE: '', dataATE: '' };
    this.isFiltrado.set(false);
    this.masterAtual.set(null);
    this.detailItems.set([]);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this.items.set(DEMO_MASTER.map(r => ({ ...r })));
    this.cdr.markForCheck();
    setTimeout(() => {
      const todos = DEMO_MASTER;
      const idx   = keyAtivo ? todos.findIndex(r => (r as any)['{{masterKey}}'] === keyAtivo) : 0;
      const alvo  = todos[idx >= 0 ? idx : 0];
      this.cursorIndex.set(idx >= 0 ? idx : 0);
      this.onMasterSelecionado(alvo);
    }, 0);
  }

  confirmar(): void {
    // TODO: implement confirmation action (generate NF, process records, etc.)
    this.notification.success('Ação executada com sucesso.');
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private _carregarItens(key: string): void {
    // TODO: replace with real service call:
    // this.service.getItens(key).subscribe({ next: itens => { ... } });
    const itens = DEMO_DETAIL[key] ?? [];
    this.detailItems.set(itens.map(i => ({ ...i })));
    this.cdr.markForCheck();
  }

  private _toISO(d: string): string {
    if (!d?.trim()) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }
}
```

---

## {{kebab-name}}.component.html

```html
<po-page-default p-title="{{PageTitle}}">

  <!-- Filtros ─────────────────────────────────────────────────────────── -->
  <div class="filtros-bar">
    <po-input
      name="campo1"
      p-label="Campo 1"
      p-placeholder=""
      [(ngModel)]="filtros.campo1"
      class="filtro-campo">
    </po-input>
    <po-input
      name="campo2"
      p-label="Campo 2"
      p-placeholder=""
      [(ngModel)]="filtros.campo2"
      class="filtro-campo">
    </po-input>
    <po-datepicker
      name="dataDE"
      p-label="Data De"
      [(ngModel)]="filtros.dataDE"
      class="filtro-campo filtro-data">
    </po-datepicker>
    <po-datepicker
      name="dataATE"
      p-label="Data Até"
      [(ngModel)]="filtros.dataATE"
      class="filtro-campo filtro-data">
    </po-datepicker>
    <po-button
      p-label="Buscar"
      p-kind="primary"
      p-icon="po-icon-search"
      (p-click)="buscar()"
      class="btn-buscar">
    </po-button>
  </div>

  <!-- Browse Master ────────────────────────────────────────────────────── -->
  <div class="browse-cabecalho" [class.browse-cabecalho-ativo]="activeBrowse() === 'master'">
    <span class="browse-titulo">{{MasterTitle}}</span>
    <div class="browse-direita">
      <span class="browse-count" *ngIf="items().length > 0">
        {{ items().length }} registro(s) &nbsp;·&nbsp; Tab para alternar browse &nbsp;·&nbsp; ↑↓ para navegar
      </span>
      <span class="link-remover-filtro"
            [class.link-remover-filtro--ativo]="isFiltrado()"
            (click)="isFiltrado() && removerFiltro()">✕ Remover Filtro</span>
    </div>
  </div>
  <div class="master-browse" [class.browse-ativo]="activeBrowse() === 'master'" (click)="onMasterClick()">
    <po-table
      [p-columns]="colunasMaster"
      [p-items]="items()"
      [p-selectable]="true"
      [p-selectable-entire-line]="true"
      [p-hide-columns-manager]="true"
      [p-height]="masterHeight()"
      (p-selected)="onMasterSelecionado($event)"
      (p-unselected)="onMasterDeselecionado($event)">
    </po-table>
  </div>

  <!-- Browse Detail ────────────────────────────────────────────────────── -->
  <div class="browse-cabecalho browse-cabecalho-detail" [class.browse-cabecalho-ativo]="activeBrowse() === 'detail'">
    <span class="browse-titulo">{{ tituloDetail() }}</span>
    <span class="browse-count" *ngIf="detailItems().length > 0">{{ detailItems().length }} item(ns)</span>
  </div>
  <div class="detail-browse" [class.browse-ativo]="activeBrowse() === 'detail'" (click)="onDetailClick()">
    <po-table
      [p-columns]="colunasDetail"
      [p-items]="detailItems()"
      [p-selectable]="true"
      [p-hide-columns-manager]="true"
      [p-height]="detailHeight()"
      (p-selected)="onItemSelecionado($event)"
      (p-unselected)="onItemDeselecionado($event)"
      (p-all-selected)="onTodosItensSelecionados()"
      (p-all-unselected)="onTodosItensDeselecionados()">
    </po-table>
  </div>

  <!-- Rodapé ───────────────────────────────────────────────────────────── -->
  <div class="rodape-bar">
    <span class="rodape-info">
      <strong>{{ qtdSelecionados() }}</strong> item(ns) &nbsp;·&nbsp;
      Total:&nbsp;<strong class="rodape-total">R$&nbsp;{{ fmtVal(totalSelecionado()) }}</strong>
    </span>
    <po-button
      p-label="Confirmar"
      p-kind="primary"
      p-icon="po-icon-ok"
      [p-disabled]="!podeConfirmar()"
      (p-click)="confirmar()">
    </po-button>
  </div>

</po-page-default>
```

---

## {{kebab-name}}.component.scss

```scss
:host {
  display:   block;
  font-size: 12px;
}

/* ── Filtros ─────────────────────────────────────────────────────────────── */
.filtros-bar {
  display:     flex;
  align-items: flex-end;
  gap:         10px;
  flex-wrap:   wrap;
  padding:     0 0 4px;

  /*
    --font-size: 12px cascades to ALL PO-UI children via var(--font-size):
    labels, inputs, datepickers, and buttons all shrink uniformly.
    The forced min-height and padding below further compact the inputs.
  */
  --font-size: 12px;

  ::ng-deep .po-input  { min-height: 28px !important; padding-top: 2px !important; padding-bottom: 2px !important; }
  ::ng-deep .po-button { min-height: 28px !important; height: 28px !important; padding: 0 12px !important; }
}

.filtro-campo { width: 130px; }

/*
  po-datepicker has 44px right padding for the calendar icon.
  At 12px font, 170px fits "dd/MM/yyyy" (10 chars × ~8px + 44px icon + 6px padding).
  Do NOT go below 170px — the rightmost year digit gets clipped.
*/
.filtro-data { width: 170px; }

/* Aligns button baseline with the input field (po-input has 8px invisible error space below) */
.btn-buscar  { margin-bottom: 4px; }

/* ── Browse headers ──────────────────────────────────────────────────────── */
/*
  Active state uses border-top-color — NOT outline on the po-table container.
  Reason: outline: 2px solid on .po-table-container draws on all 4 sides; when
  the user scrolls the browse the bottom edge of the outline becomes visible as
  a floating line, creating a visual artifact below the table.
*/
.browse-cabecalho {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         3px 4px;
  border-top:      2px solid var(--color-neutral-light-10, #e0e0e0);
  margin-top:      3px;
  transition:      border-top-color 0.1s;
}

.browse-cabecalho-ativo {
  border-top-color: var(--color-action-default, #0079c3) !important;
}

.browse-cabecalho-detail { margin-top: 4px; }

.browse-titulo {
  font-size:   0.82rem;
  font-weight: 600;
  color:       var(--color-neutral-dark-70, #4a4a4a);
}

.browse-direita {
  display:     flex;
  align-items: center;
  gap:         10px;
}

.browse-count {
  font-size: 0.75rem;
  color:     var(--color-neutral-dark-40, #999);
}

/*
  "✕ Remover Filtro" is always red — the disabled state changes only the cursor
  and removes the hover underline. This avoids visual inconsistency when the
  filter state changes.
*/
.link-remover-filtro {
  font-size:   0.72rem;
  color:       var(--color-feedback-negative-base, #c9372c);
  cursor:      default;
  user-select: none;

  &--ativo {
    cursor: pointer;
    &:hover { text-decoration: underline; }
  }
}

/* ── Browse containers ───────────────────────────────────────────────────── */
.master-browse,
.detail-browse {
  ::ng-deep tbody td {
    padding-top:    4px !important;
    padding-bottom: 4px !important;
  }

  ::ng-deep .po-table-body-ellipsis,
  ::ng-deep .po-table-header-ellipsis { font-size: 11px; }

  ::ng-deep .row-ativa td { background-color: #dbeafe !important; }
  ::ng-deep tbody tr td   { cursor: pointer; }

  /*
    Suppress ALL browser focus rings inside the browse.
    Without this, clicking a row or scrolling causes a blue outline to appear
    on the po-table-container-overflow element — visible as a border around
    the scroll area and as a floating line at the bottom edge during scroll.
  */
  ::ng-deep *:focus,
  ::ng-deep *:focus-visible {
    outline:    none !important;
    box-shadow: none !important;
  }
}

/* Master: hide PO-UI's built-in checkbox column (single-row navigation via p-selectable-entire-line) */
.master-browse {
  ::ng-deep thead th:first-child,
  ::ng-deep tbody td:first-child {
    display:  none !important;
    width:    0    !important;
    padding:  0    !important;
  }
}

/* Detail: unselected rows must stay transparent — only row-ativa shows highlight */
.detail-browse {
  ::ng-deep tbody tr:not(.row-ativa) td {
    background-color: transparent !important;
  }
}

/* ── Rodapé ──────────────────────────────────────────────────────────────── */
.rodape-bar {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         5px 4px 0;
  margin-top:      4px;
  border-top:      2px solid var(--color-neutral-light-10, #e0e0e0);
}

.rodape-info  { font-size: 0.82rem; color: var(--color-neutral-dark-70, #4a4a4a); }
.rodape-total { color: var(--color-feedback-positive-dark, #1a7a5f); }
```

---

## models/{{modelFile}}.model.ts

```typescript
export interface {{MasterModel}} {
  {{masterKey}}: string;
  descricao:    string;
  dataEmissao:  string;   // ISO 8601 'YYYY-MM-DD' — use _toISO() in component for filter comparison
  valor:        number;
  status:       'A' | 'F' | 'C';
}

export interface {{DetailModel}} {
  item:      string;
  produto:   string;
  descricao: string;
  qtd:       number;
  valor:     number;
}
```

---

## Height offset calibration

The `masterHeight` and `detailHeight` computeds use a 320px offset. Adjust if you add/remove fixed elements:

| Element | Approximate height |
|---|---|
| PO shell navbar | ~60px |
| po-page-default title + padding | ~80px |
| `.filtros-bar` (compact, 12px font) | ~50px |
| `.browse-cabecalho` × 2 | ~30px |
| `.rodape-bar` | ~45px |
| Extra padding/margin | ~55px |
| **Total** | **~320px** |

Distribution 47% master / 40% detail leaves ~13% as natural breathing room. Increase the offset by 10-20px if you add a status bar or breadcrumb.

---

## Placeholder reference for this template

| Placeholder | Example |
|---|---|
| `{{MasterModel}}` | `PedidoSC5` |
| `{{DetailModel}}` | `ItemSC6` |
| `{{masterKey}}` | `numPedido` |
| `{{MasterTitle}}` | `Pedidos de Venda (SC5)` |
| `{{DetailTitle}}` | `Itens do Pedido (SC6)` |
| `{{PageTitle}}` | `Geração de NF — Pedidos de Venda` |
