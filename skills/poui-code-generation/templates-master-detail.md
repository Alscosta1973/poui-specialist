# Template: master-detail

Generates a `po-page-list` + `po-table` with expandable detail rows — the ERP pattern
for parent records that embed child lists inline (orders with items, invoices with lines,
stock movements with entries).

> **When to use vs alternatives:**
> - `master-detail` → child records are display-only inline items (no separate CRUD for items)
> - `page-list` + `page-edit` with `FormArray` → items need their own add/edit/delete UX
> - `modal-crud` → child has up to ~10 fields and justifies a dedicated modal

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoDialogService,
  PoLoadingModule,
  PoNotificationService,
  PoPageAction,
  PoPageFilter,
  PoPageListModule,
  PoTableAction,
  PoTableColumn,
  PoTableDetail,
  PoTableModule,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}}, {{DetailInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageListModule, PoTableModule, PoLoadingModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  private readonly service      = inject({{ServiceClass}});
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog       = inject(PoDialogService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly items   = signal<{{ModelInterface}}[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // ── Colunas do MASTER (cabeçalho do pedido / NF) ──
  // TODO: ajuste para os campos de {{ModelInterface}}
  readonly columns: PoTableColumn[] = [
    { property: 'numero',      label: 'Número',    width: '10%', sortable: true },
    { property: 'dataEmissao', label: 'Emissão',   type: 'date', format: 'dd/MM/yyyy', width: '12%' },
    { property: 'parceiro',    label: 'Parceiro',  sortable: true },
    { property: 'valorTotal',  label: 'Total',     type: 'currency', width: '12%' },
    {
      property: 'status',
      label:    'Status',
      type:     'label',
      width:    '10%',
      labels: [
        { value: 'A', label: 'Aberto',    color: 'color-08' },
        { value: 'F', label: 'Faturado',  color: 'color-11' },
        { value: 'C', label: 'Cancelado', color: 'color-07' },
      ],
    },
    // Coluna de detalhe — OBRIGATÓRIA: type 'detail' + config buildDetailConfig()
    {
      property: 'itens',
      label:    'Itens',
      type:     'detail',
      detail:   this.buildDetailConfig(),
    },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label:  'Editar',
      icon:   'po-icon-edit',
      action: (row: {{ModelInterface}}) =>
        this.router.navigate([row['numero']], { relativeTo: this.route }),
    },
    {
      label:     'Cancelar',
      icon:      'po-icon-close',
      type:      'danger',
      separator: true,
      disabled:  (row: {{ModelInterface}}) => row['status'] !== 'A',
      action:    (row: {{ModelInterface}}) => this.confirmCancel(row),
    },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label:  'Incluir',
      icon:   'po-icon-plus',
      action: () => this.router.navigate(['novo'], { relativeTo: this.route }),
    },
  ];

  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar por número ou parceiro...',
    action:      (q: string) => this.onSearch(q),
  };

  ngOnInit(): void {
    this.load();
  }

  onSearch(q: string): void {
    this.currentPage = 1;
    this.lastSearch  = q;
    this.load(q);
  }

  onShowMore(): void {
    this.currentPage++;
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.lastSearch })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.update(prev => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  private load(q = ''): void {
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar registros.'),
      });
  }

  private confirmCancel(row: {{ModelInterface}}): void {
    this.dialog.confirm({
      title:   'Cancelar registro',
      message: `Confirma o cancelamento do registro ${row['numero']}?`,
      confirm: () => this.cancelRecord(row),
    });
  }

  private cancelRecord(row: {{ModelInterface}}): void {
    this.loading.set(true);
    this.service.cancel(row['numero'])
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Registro cancelado com sucesso.');
          this.items.update(prev =>
            prev.map(r => r['numero'] === row['numero'] ? { ...r, status: 'C' } : r)
          );
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  // ── Configuração das colunas de DETALHE ──
  // TODO: ajuste para os campos de {{DetailInterface}}
  private buildDetailConfig(): PoTableDetail {
    return {
      columns: [
        { property: 'sequencia',  label: 'Seq',       width: '8%' },
        { property: 'produto',    label: 'Produto',    width: '12%' },
        { property: 'descricao',  label: 'Descrição' },
        { property: 'unidade',    label: 'UN',         width: '6%' },
        { property: 'quantidade', label: 'Qtde',       type: 'number',   width: '8%' },
        { property: 'valorUnit',  label: 'Vlr Unit.',  type: 'currency', width: '12%' },
        { property: 'valorTotal', label: 'Total',      type: 'currency', width: '12%' },
      ],
      typeHeader: 'inline',   // 'inline' | 'top' | 'none'
    };
  }

  private parseProtheusError(err: any): string {
    try {
      const obj    = JSON.parse(err.error?.errorMessage ?? '{}');
      const msg    = decodeURIComponent(escape(obj.message ?? ''));
      const detail = obj.detailedMessage
        ? ` — ${decodeURIComponent(escape(obj.detailedMessage))}`
        : '';
      return `Erro ${obj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
```

## {{kebab-name}}.component.html

```html
<po-page-list
  p-title="{{ModelInterface}}"
  [p-actions]="pageActions"
  [p-filter]="filterSettings">

  @if (loading()) {
    <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
  }

  <po-table
    [p-columns]="columns"
    [p-items]="items()"
    [p-loading]="loading()"
    [p-actions]="tableActions"
    [p-show-more-disabled]="!hasNext()"
    (p-show-more)="onShowMore()">
  </po-table>

</po-page-list>
```

## {{kebab-name}}.component.scss

```scss
// Add component-specific styles here
```

## models/{{modelFile}}.model.ts

```typescript
export interface {{DetailInterface}} {
  sequencia:   number;
  produto:     string;
  descricao:   string;
  unidade:     string;      // 'UN', 'KG', 'CX', etc.
  quantidade:  number;
  valorUnit:   number;
  valorTotal:  number;
}

export interface {{ModelInterface}} {
  numero:      string;
  dataEmissao: string;                  // ISO 8601 ('YYYY-MM-DD')
  parceiro:    string;
  valorTotal:  number;
  status:      'A' | 'F' | 'C';
  itens:       {{DetailInterface}}[];   // array embutido — retornado pelo GET lista
}
```

## PoTableDetail — todos os campos

```typescript
interface PoTableDetail {
  columns:     PoTableColumn[];   // mesmos tipos suportados pelo master
  typeHeader?: 'inline' | 'top' | 'none';
  //   'inline' (default) → cabeçalho dentro das células de cada linha expandida
  //   'top'              → cabeçalho fixo acima de todos os detalhes
  //   'none'             → sem cabeçalho (quando as colunas são auto-explicativas)
}
```

## API contract — response do GET lista

O endpoint deve embutir o array de itens **dentro de cada objeto master**:

```json
{
  "items": [
    {
      "numero":      "000001",
      "dataEmissao": "2026-06-03",
      "parceiro":    "Fornecedor ABC Ltda",
      "valorTotal":  1500.00,
      "status":      "A",
      "itens": [
        {
          "sequencia":  1,
          "produto":    "PROD001",
          "descricao":  "Produto A",
          "unidade":    "UN",
          "quantidade": 10,
          "valorUnit":  100.00,
          "valorTotal": 1000.00
        },
        {
          "sequencia":  2,
          "produto":    "PROD002",
          "descricao":  "Produto B",
          "unidade":    "KG",
          "quantidade": 5,
          "valorUnit":  100.00,
          "valorTotal": 500.00
        }
      ]
    }
  ],
  "hasNext": false
}
```

O `po-table` lê automaticamente a propriedade `itens` da coluna `type: 'detail'`
e exibe as linhas expansíveis ao clicar no ícone de expandir.

## Service — método cancel adicional

```typescript
// Em {{serviceFile}}.ts — além dos métodos CRUD padrão
cancel(numero: string): Observable<void> {
  return this.http.patch<void>(`${this.baseUrl}/${numero}/cancelar`, {});
}
```
