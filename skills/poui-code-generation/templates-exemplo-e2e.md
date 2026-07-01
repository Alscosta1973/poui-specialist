---
name: templates-exemplo-e2e
description: Exemplo completo ponta-a-ponta — Angular PO-UI + Protheus REST + TLPP backend para entidade Pedidos. Use como referência de integração real.
---

# Exemplo Completo — Pedidos (Angular + Protheus REST + TLPP)

Exemplo de referência: tela de listagem + edição de Pedidos com integração real Protheus.

> **Quando usar:** Desenvolvedor quer entender o fluxo completo antes de gerar uma tela real.  
> Use `/generate page-list Pedidos --module pedidos` para gerar a tela; este arquivo explica a integração.

---

## Estrutura de arquivos

```
src/app/pedidos/
├── pedidos-list/
│   ├── pedidos-list.component.ts
│   └── pedidos-list.component.html
├── pedido.model.ts
└── pedidos.service.ts
```

---

## 1. Model — `pedido.model.ts`

```typescript
export interface Pedido {
  codigo: string;       // C6_NUM
  loja:   string;       // C6_LOJA
  cliente: string;      // C6_CLIENTE
  produto: string;      // C6_PRODUTO
  qtd:    number;       // C6_QTDVEN
  valor:  number;       // C6_PRUNIT
  status: string;       // C6_STATUS ('A'=Aberto, 'F'=Faturado, 'C'=Cancelado)
}

export interface ProtheusListResponse<T> {
  items:   T[];
  hasNext: boolean;
}
```

---

## 2. Service — `pedidos.service.ts`

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pedido, ProtheusListResponse } from './pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly http = inject(HttpClient);
  private readonly base = '/rest/api/custom/v1/pedidos';

  list(page = 1, pageSize = 20, filtro = ''): Observable<ProtheusListResponse<Pedido>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('filtro', filtro);
    return this.http.get<ProtheusListResponse<Pedido>>(this.base, { params });
  }

  get(codigo: string, loja: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.base}/${codigo}/${loja}`);
  }

  create(pedido: Pedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.base, pedido);
  }

  update(codigo: string, loja: string, pedido: Partial<Pedido>): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.base}/${codigo}/${loja}`, pedido);
  }

  delete(codigo: string, loja: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${codigo}/${loja}`);
  }
}
```

---

## 3. Component — `pedidos-list.component.ts`

```typescript
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { PoTableModule, PoTableColumn, PoPageModule, PoButtonModule, PoLoadingModule } from '@po-ui/ng-components';
import { PedidosService } from '../pedidos.service';
import { Pedido } from '../pedido.model';

@Component({
  selector: 'app-pedidos-list',
  templateUrl: './pedidos-list.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PoTableModule, PoPageModule, PoButtonModule, PoLoadingModule],
})
export class PedidosListComponent implements OnInit {
  private readonly svc = inject(PedidosService);

  readonly loading  = signal(false);
  readonly hasNext  = signal(false);
  readonly items    = signal<Pedido[]>([]);
  private page      = 1;
  private filtro    = '';

  readonly columns: PoTableColumn[] = [
    { property: 'codigo',  label: 'Pedido',   width: '100px' },
    { property: 'cliente', label: 'Cliente' },
    { property: 'produto', label: 'Produto' },
    { property: 'qtd',     label: 'Qtd',      type: 'number', width: '80px' },
    { property: 'valor',   label: 'Valor',    type: 'currency', format: 'BRL', width: '120px' },
    { property: 'status',  label: 'Status',   type: 'label',
      labels: [
        { value: 'A', label: 'Aberto',     color: 'color-10' },
        { value: 'F', label: 'Faturado',   color: 'color-08' },
        { value: 'C', label: 'Cancelado',  color: 'color-07' },
      ]
    },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.list(this.page, 20, this.filtro).subscribe({
      next: res => {
        this.items.update(prev => this.page === 1 ? res.items : [...prev, ...res.items]);
        this.hasNext.set(res.hasNext);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(filtro: string): void {
    this.filtro = filtro;
    this.page   = 1;
    this.load();
  }

  onLoadMore(): void {
    this.page++;
    this.load();
  }
}
```

---

## 4. Template — `pedidos-list.component.html`

```html
<po-page-list
  p-title="Pedidos"
  [p-actions]="[{ label: 'Novo', action: onNovo.bind(this), icon: 'po-icon-plus' }]"
  (p-search)="onSearch($event)"
  (p-search-reset)="onSearch('')">

  <po-loading [p-screen-lock]="true" [p-visible]="loading()"></po-loading>

  <po-table
    [p-columns]="columns"
    [p-items]="items()"
    [p-loading]="loading()"
    [p-show-more-disabled]="!hasNext()"
    (p-show-more)="onLoadMore()">
  </po-table>

</po-page-list>
```

---

## 5. Backend TLPP — `PCPC001.tlpp`

```tlpp
#Include "totvs.ch"
#Include "tlpp-core.th"
#Include "tlpp-rest.th"

/*/{Protheus.doc} PedidosAPI
  REST API para listagem e CRUD de Pedidos (SC6).
  @type TEndPoint
  @author Andre Costa
/*/
@Rest Description('Pedidos API') EndPoint('/api/custom/v1/pedidos') Produces(APPLICATION_JSON)
Class PedidosAPI

  @Get Description('Listar pedidos com paginação')
  Public Method Get() As Logical

  @Get Description('Buscar pedido por código e loja') Path('/{codigo}/{loja}')
  Public Method GetById() As Logical

  @Post Description('Criar pedido')
  Public Method Post() As Logical

  @Put Description('Atualizar pedido') Path('/{codigo}/{loja}')
  Public Method Put() As Logical

  @Delete Description('Deletar pedido') Path('/{codigo}/{loja}')
  Public Method Delete() As Logical

EndClass

Method Get() Class PedidosAPI
  Local nPage     := Val(GetRestParamByName("page",     Self:oRest))
  Local nPageSize := Val(GetRestParamByName("pageSize", Self:oRest))
  Local cFiltro   := GetRestParamByName("filtro", Self:oRest)
  Local aItems    := {}
  Local lHasNext  := .F.
  Local nReg      := 0

  If nPage     <= 0 : nPage     := 1  : EndIf
  If nPageSize <= 0 : nPageSize := 20 : EndIf

  BeginSQL Alias "QRY_PED"
    SELECT C6_NUM, C6_LOJA, C6_CLI, C6_PRODUTO, C6_QTDVEN, C6_PRUNIT, C6_STATUS
    FROM   %table:SC6% SC6
    WHERE  %notDel%
      AND  %xfilial:SC6%
      AND  (%exp:cFiltro% = '' OR SC6.C6_CLI LIKE '%' + %exp:cFiltro% + '%')
    ORDER BY C6_NUM DESC
  EndSQL

  SC6->(%SkipFilter(nPageSize * (nPage - 1)))

  While !SC6->(Eof()) .And. nReg < nPageSize
    aAdd(aItems, JsonObject():New())
    ATail(aItems):SetJsonText('codigo',  AllTrim(SC6->C6_NUM))
    ATail(aItems):SetJsonText('loja',    AllTrim(SC6->C6_LOJA))
    ATail(aItems):SetJsonText('cliente', AllTrim(SC6->C6_CLI))
    ATail(aItems):SetJsonText('produto', AllTrim(SC6->C6_PRODUTO))
    ATail(aItems):SetJsonNumber('qtd',   SC6->C6_QTDVEN)
    ATail(aItems):SetJsonNumber('valor', SC6->C6_PRUNIT)
    ATail(aItems):SetJsonText('status',  AllTrim(SC6->C6_STATUS))
    SC6->(%DBSkip())
    nReg++
  End

  lHasNext := !SC6->(Eof())
  SC6->(%DBCloseArea())

  Local oResp := JsonObject():New()
  oResp:SetJsonArray('items',   aItems)
  oResp:SetJsonLogical('hasNext', lHasNext)

  Self:oRest:setResponse(oResp:Serialize())
Return .T.
```

---

## 6. proxy.conf.json (desenvolvimento local)

```json
{
  "/rest": {
    "target": "http://localhost:8080",
    "changeOrigin": true,
    "secure": false,
    "logLevel": "debug"
  }
}
```

Iniciar com: `ng serve --proxy-config proxy.conf.json`

---

## 7. CORS no appserver.ini (Protheus)

```ini
[HTTP]
Enable=1
Port=8080
Charset=utf-8

[HTTP_CROSS_ORIGIN]
Enable=1
AccessControlAllowOrigin=http://localhost:4200
AccessControlAllowMethods=GET,POST,PUT,DELETE,OPTIONS
AccessControlAllowHeaders=Content-Type,Authorization,X-TOTVS-TenantId
```

---

## Fluxo de dados resumido

```
Angular Component
  → PedidosService.list(page, pageSize, filtro)
    → GET /rest/api/custom/v1/pedidos?page=1&pageSize=20&filtro=xyz
      → TLPP PedidosAPI.Get()
        → BeginSQL SC6 (paginação manual via SkipFilter)
        → JsonObject { items: [...], hasNext: true }
      ← 200 OK
    ← Observable<ProtheusListResponse<Pedido>>
  ← signal items() atualizado → po-table renderiza
```
