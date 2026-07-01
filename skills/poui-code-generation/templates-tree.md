# Template: po-tree

Gera componente de navegação hierárquica com `po-tree-view`.
Duas variações — o agente escolhe conforme o contexto:

| Variação | Quando usar |
|----------|-------------|
| **A — Pré-carregado (flat → tree)** | Backend retorna lista plana com `pai`/`id`; frontend monta a árvore localmente |
| **B — Lazy loading** | Cada nó carrega seus filhos sob demanda ao expandir (ideal para hierarquias profundas) |

Padrão de seleção (mestre-detalhe com painel lateral) é mostrado ao final.

---

## Template A — Pré-carregado (flat-to-tree)

O backend Protheus retorna a hierarquia como lista plana com referência ao nó pai.
O frontend constrói a árvore recursivamente antes de renderizar.

### Contrato esperado do backend

```typescript
export interface {{ModelInterface}}Flat {
  id:        string;    // código do nó
  pai:       string;    // código do pai; '' ou null = nó raiz
  descricao: string;
  icon?:     string;    // po-icon-* opcional
}
```

### {{kebab-name}}.component.ts

```typescript
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoNotificationService,
  PoPageModule,
  PoToolbarModule,
  PoTreeViewItem,
  PoTreeViewModule,
} from '@po-ui/ng-components';
import { {{ModelInterface}}Flat } from './{{kebab-name}}.model';
import { {{ServiceClass}} } from './{{kebab-name}}.service';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageModule, PoToolbarModule, PoTreeViewModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit {
  private readonly service      = inject({{ServiceClass}});
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  readonly loading     = signal(false);
  readonly treeItems   = signal<PoTreeViewItem[]>([]);
  readonly selectedItem = signal<PoTreeViewItem | null>(null);

  ngOnInit(): void { this.loadHierarchy(); }
  ngAfterViewInit(): void { setTimeout(() => this.cdr.detectChanges()); }

  onSelect(item: PoTreeViewItem): void {
    this.selectedItem.set(item);
    // TODO: disparar ação com item.value (ex: filtrar outra lista, navegar para detalhe)
  }

  onExpanded(item: PoTreeViewItem): void {
    // Apenas informacional para Template A — todos os filhos já estão carregados
  }

  onCollapsed(item: PoTreeViewItem): void {
    // Apenas informacional para Template A
  }

  private loadHierarchy(): void {
    this.loading.set(true);
    this.service
      .getAll()
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.treeItems.set(this.buildTree(res.items, '')),
        error: () => this.notification.error('Erro ao carregar hierarquia.'),
      });
  }

  // Converte lista plana com referência pai → árvore PoTreeViewItem[]
  private buildTree(items: {{ModelInterface}}Flat[], parentId: string): PoTreeViewItem[] {
    return items
      .filter(i => (i.pai ?? '') === parentId)
      .map(i => ({
        label:    i.descricao,
        value:    i.id,
        icon:     i.icon,
        subItems: this.buildTree(items, i.id),
      }));
  }
}
```

### {{kebab-name}}.component.html

```html
<po-toolbar p-title="{{PageTitle}}"></po-toolbar>

<po-page-default p-title="{{PageTitle}}">

  @if (loading()) {
    <po-loading-overlay p-text="Carregando hierarquia..."></po-loading-overlay>
  }

  @if (!loading()) {
    <po-tree-view
      [p-items]="treeItems()"
      (p-selected)="onSelect($event)"
      (p-expanded)="onExpanded($event)"
      (p-collapsed)="onCollapsed($event)">
    </po-tree-view>

    @if (!treeItems().length) {
      <div class="po-text-center po-mt-4" style="color: var(--color-neutral-mid-60);">
        Nenhum item encontrado.
      </div>
    }
  }

</po-page-default>
```

---

## Template B — Lazy Loading (filhos carregados ao expandir)

Root nodes chegam na carga inicial. Cada expansão dispara um `GET` para carregar os filhos do nó.
Evita carregar árvores gigantescas de uma vez (ex: plano de contas com centenas de níveis).

### Contrato esperado do backend

```
GET /rest/api/custom/v1/{{kebab-name}}?pai=         → retorna nós raiz (pai vazio)
GET /rest/api/custom/v1/{{kebab-name}}?pai=001       → retorna filhos do nó 001
```

```typescript
// Service — adicionar método para filhos:
getChildren(pai: string): Observable<ProtheusListResponse<{{ModelInterface}}Flat>> {
  return this.http.get<ProtheusListResponse<{{ModelInterface}}Flat>>(this.baseUrl, {
    params: new HttpParams({ fromObject: { pai } }),
  });
}
```

### {{kebab-name}}.component.ts (lazy)

```typescript
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoNotificationService,
  PoPageModule,
  PoToolbarModule,
  PoTreeViewItem,
  PoTreeViewModule,
} from '@po-ui/ng-components';
import { {{ModelInterface}}Flat } from './{{kebab-name}}.model';
import { {{ServiceClass}} } from './{{kebab-name}}.service';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageModule, PoToolbarModule, PoTreeViewModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit {
  private readonly service      = inject({{ServiceClass}});
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  readonly loading      = signal(false);
  readonly treeItems    = signal<PoTreeViewItem[]>([]);
  readonly selectedItem = signal<PoTreeViewItem | null>(null);

  // IDs de nós cujos filhos estão sendo carregados agora
  private readonly loadingNodes = new Set<string>();
  // IDs de nós já carregados (evita re-fetch ao re-expandir)
  private readonly loadedNodes  = new Set<string>();

  ngOnInit(): void { this.loadRoots(); }
  ngAfterViewInit(): void { setTimeout(() => this.cdr.detectChanges()); }

  onSelect(item: PoTreeViewItem): void {
    this.selectedItem.set(item);
  }

  onExpanded(item: PoTreeViewItem): void {
    const id = String(item.value);
    if (this.loadedNodes.has(id) || this.loadingNodes.has(id)) return;
    this.loadChildren(id);
  }

  onCollapsed(_item: PoTreeViewItem): void {
    // Filhos permanecem em memória — não recarregam ao re-expandir
  }

  private loadRoots(): void {
    this.loading.set(true);
    this.service
      .getAll({ pai: '' })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.treeItems.set(
            res.items.map(i => this.toTreeItem(i, true /* hasChildren placeholder */))
          );
        },
        error: () => this.notification.error('Erro ao carregar hierarquia.'),
      });
  }

  private loadChildren(pai: string): void {
    this.loadingNodes.add(pai);
    this.service
      .getChildren(pai)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.loadingNodes.delete(pai);
          this.loadedNodes.add(pai);
          const children = res.items.map(i => this.toTreeItem(i, i.temFilhos ?? false));
          this.treeItems.update(nodes => this.insertChildren(nodes, pai, children));
        },
        error: () => {
          this.loadingNodes.delete(pai);
          this.notification.error(`Erro ao carregar filhos do nó ${pai}.`);
        },
      });
  }

  // Insere filhos no nó correto, recursivamente
  private insertChildren(
    nodes: PoTreeViewItem[],
    targetValue: string,
    children: PoTreeViewItem[],
  ): PoTreeViewItem[] {
    return nodes.map(node => {
      if (String(node.value) === targetValue) {
        return { ...node, subItems: children };
      }
      if (node.subItems?.length) {
        return { ...node, subItems: this.insertChildren(node.subItems, targetValue, children) };
      }
      return node;
    });
  }

  private toTreeItem(item: {{ModelInterface}}Flat, hasChildren: boolean): PoTreeViewItem {
    return {
      label:    item.descricao,
      value:    item.id,
      icon:     item.icon,
      // subItems vazio sinaliza para po-tree-view que há filhos (exibe ícone de expansão)
      subItems: hasChildren ? [] : undefined,
    };
  }
}
```

### {{kebab-name}}.component.html (lazy)

```html
<po-toolbar p-title="{{PageTitle}}"></po-toolbar>

<po-page-default p-title="{{PageTitle}}">

  @if (loading()) {
    <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
  }

  @if (!loading()) {
    <po-tree-view
      [p-items]="treeItems()"
      (p-selected)="onSelect($event)"
      (p-expanded)="onExpanded($event)"
      (p-collapsed)="onCollapsed($event)">
    </po-tree-view>
  }

</po-page-default>
```

---

## Padrão mestre-detalhe (seleção → painel lateral)

Layout em 2 colunas: árvore à esquerda, detalhes do nó selecionado à direita.

### TypeScript (adicionar ao componente)

```typescript
import { PoWidgetModule } from '@po-ui/ng-components';

// No componente:
readonly selectedDetail = signal<{{ModelInterface}} | null>(null);
readonly loadingDetail  = signal(false);

onSelect(item: PoTreeViewItem): void {
  this.selectedItem.set(item);
  this.loadDetail(String(item.value));
}

private loadDetail(id: string): void {
  this.loadingDetail.set(true);
  this.service
    .getById(id)
    .pipe(
      finalize(() => this.loadingDetail.set(false)),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe({
      next: detail => this.selectedDetail.set(detail),
      error: () => this.notification.error('Erro ao carregar detalhes.'),
    });
}
```

### HTML (layout em 2 colunas)

```html
<div class="po-row">

  <!-- Coluna esquerda: árvore -->
  <div class="po-md-5 po-lg-4">
    <po-tree-view
      [p-items]="treeItems()"
      (p-selected)="onSelect($event)"
      (p-expanded)="onExpanded($event)">
    </po-tree-view>
  </div>

  <!-- Coluna direita: detalhe do nó selecionado -->
  <div class="po-md-7 po-lg-8">
    @if (loadingDetail()) {
      <po-loading-overlay p-text="Carregando detalhes..."></po-loading-overlay>
    }

    @if (selectedDetail(); as detail) {
      <po-widget [p-title]="selectedItem()?.label ?? 'Detalhes'">
        <!-- TODO: renderizar campos de detail conforme o modelo -->
        <!-- Exemplo: -->
        <!-- <p><strong>Código:</strong> {{ detail.codigo }}</p> -->
        <!-- <p><strong>Descrição:</strong> {{ detail.descricao }}</p> -->
      </po-widget>
    }

    @if (!selectedDetail() && !loadingDetail()) {
      <div class="po-text-center po-mt-4" style="color: var(--color-neutral-mid-60);">
        Selecione um item na árvore para ver os detalhes.
      </div>
    }
  </div>

</div>
```

### Imports adicionais no componente

```typescript
imports: [..., PoWidgetModule]
```

---

## Notas de implementação

### `subItems: []` vs `subItems: undefined` no Template B
- `subItems: []` (array vazio) → `po-tree-view` exibe o ícone de expansão (▶) mas sem filhos visíveis
- `subItems: undefined` (ausente) → nó é folha; sem ícone de expansão
- Use `subItems: []` como placeholder em nós que sabidamente têm filhos mas ainda não foram carregados.
  Após o lazy load, substitua pelo array real de filhos.

### Cache de nós carregados (`loadedNodes` Set)
```typescript
private readonly loadedNodes = new Set<string>();
```
Evita re-fetch ao recolher e re-expandir o mesmo nó. Os filhos permanecem no signal `treeItems`.

### Backend Protheus — campo `temFilhos`
Para que o frontend saiba se um nó tem filhos sem precisar carregar todos antecipadamente,
o backend deve retornar um campo booleano:
```json
{ "id": "001", "pai": "", "descricao": "Diretoria", "temFilhos": true }
```
Se o backend não fornecer este campo, carregue os filhos imediatamente ao expandir e trate
array vazio como nó folha: `subItems: undefined`.

### Atualização do signal com `insertChildren()`
`signal.update()` + imutabilidade: `insertChildren` retorna **novos objetos** a cada nível
(spread `{ ...node }`), o que garante que o Angular detecta a mudança via ChangeDetection.
Nunca mutate o array de `subItems` diretamente.
