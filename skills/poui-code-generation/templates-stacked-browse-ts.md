# Template: stacked-browse — TypeScript component

> Sub-arquivo de `templates-stacked-browse.md`. Use este arquivo ao gerar `.component.ts`.
> Use `templates-stacked-browse-html.md` para `.component.html` e `.component.scss`.

---

## {{kebab-name}}.component.ts

```typescript
/**
 * @generated  poui-specialist v1.13.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 * @node       v20.14.0 (>=18.19 required)
 * @angular    ^21.0.0 (17-21+ supported)
 */
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

// Dados de demonstração — remova ao conectar o service real
const DEMO_MASTER: {{MasterModel}}[] = [
  // TODO: preencha com registros de exemplo realistas
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
export class {{ComponentClass}} implements OnInit, AfterViewInit {
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

  // ── Alturas responsivas — sem scroll na página
  // Offset 320px = PO shell navbar + título da página + filtros-bar + cabeçalhos dos browses + rodapé
  // Ajuste se adicionar/remover elementos fixos.
  private readonly _winH = signal(window.innerHeight);
  readonly masterHeight  = computed(() => Math.max(160, Math.floor((this._winH() - 320) * 0.47)));
  readonly detailHeight  = computed(() => Math.max(140, Math.floor((this._winH() - 320) * 0.40)));

  // ── Campos de filtro (objeto simples — mais direto que signals para um grupo de campos de formulário)
  filtros = { campo1: '', campo2: '', dataDE: '', dataATE: '' };

  // ── Definição de colunas — TODO: substitua pelos campos do seu domínio
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

  ngAfterViewInit(): void {
    setTimeout(() => this.cdr.detectChanges());
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
        this._highlightDetailRow();
      }
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;

    if (this.activeBrowse() === 'master') {
      this._moverCursor(delta);
    } else {
      this._moverCursorDetail(delta);
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
    this._highlightDetailRow();
  }

  // OnPush não roda change detection sincronamente após um signal.set(). Sem o detectChanges()
  // abaixo, o querySelectorAll leria o DOM antes do Angular re-renderizar o po-table (inclusive
  // após items()/detailItems() serem substituídos), e getBoundingClientRect() retornaria valores
  // stale. Chamar detectChanges() aqui torna estes métodos seguros para uso síncrono — nunca
  // envolva a chamada em setTimeout: temporizadores concorrentes de chamadores diferentes (clique
  // do mouse, seleção automática no load, navegação por teclado) são a causa raiz de duas linhas
  // ficarem destacadas simultaneamente.
  private _highlightMasterRow(): void {
    this.cdr.detectChanges();
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
    this.cdr.detectChanges();
    document.querySelectorAll('.detail-browse .row-ativa').forEach(el => el.classList.remove('row-ativa'));
    const idx  = this.cursorDetail();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.detail-browse table tbody tr');
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  // Sobe o DOM a partir da linha para encontrar o ancestral scrollável real.
  // Nunca use scrollIntoView({ block:'nearest' }): ignora o thead fixo e
  // esconde a linha 0 atrás do cabeçalho fixo.
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
    this._highlightMasterRow();
  }

  onMasterDeselecionado(_item: {{MasterModel}}): void {
    // seleção única: master permanece selecionado mesmo no p-unselected
  }

  onMasterClick(): void { this.activeBrowse.set('master'); }

  // ── Detail browse events
  onItemSelecionado(item: {{DetailModel}}): void {
    this.itensSelecionados.update(prev => [...prev, item]);
    const idx = this.detailItems().findIndex(i => (i as any)['item'] === (item as any)['item']);
    if (idx >= 0) this.cursorDetail.set(idx);
    this._highlightDetailRow();
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
      this._highlightDetailRow();
    }
  }

  // ── Search & filter
  buscar(): void {
    const { campo1, campo2, dataDE, dataATE } = this.filtros;
    const de  = this._toISO(dataDE);
    const ate = this._toISO(dataATE);

    // TODO: substitua DEMO_MASTER pela chamada real ao service:
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
    if (resultado.length > 0) this.onMasterSelecionado(resultado[0]);
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
    const todos = DEMO_MASTER;
    const idx   = keyAtivo ? todos.findIndex(r => (r as any)['{{masterKey}}'] === keyAtivo) : 0;
    const alvo  = todos[idx >= 0 ? idx : 0];
    this.onMasterSelecionado(alvo);
  }

  confirmar(): void {
    // TODO: implemente a ação de confirmação (gerar NF, processar registros, etc.)
    this.notification.success('Ação executada com sucesso.');
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private _carregarItens(key: string): void {
    // TODO: substitua pela chamada real ao service:
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
