# PO-UI Layout Components

## po-container

Agrupa conteúdo com borda, título e espaçamento interno — ideal para separar seções de formulário
sem usar `divider` no `po-dynamic-form`, especialmente quando cada seção tem sua própria lógica.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título exibido no topo do container |
| `p-no-border` | `boolean` | Remove a borda (mantém padding) |
| `p-no-padding` | `boolean` | Remove o padding interno |
| `p-height` | `number` | Altura fixa em pixels (scroll interno se o conteúdo exceder) |

### Exemplos

```html
<!-- Seção de endereço em formulário Reactive -->
<po-container p-title="Endereço">
  <div class="po-row">
    <po-input   class="po-md-3" p-label="CEP"        formControlName="cep"        p-mask="99999-999"></po-input>
    <po-input   class="po-md-7" p-label="Logradouro" formControlName="logradouro"></po-input>
    <po-input   class="po-md-2" p-label="Número"     formControlName="numero"></po-input>
    <po-input   class="po-md-4" p-label="Cidade"     formControlName="cidade"></po-input>
    <po-input   class="po-md-4" p-label="Bairro"     formControlName="bairro"></po-input>
    <po-select  class="po-md-2" p-label="UF"         formControlName="uf" [p-options]="ufOptions"></po-select>
    <po-input   class="po-md-2" p-label="País"       formControlName="pais"></po-input>
  </div>
</po-container>

<!-- Container sem borda para apenas agrupar visualmente -->
<po-container [p-no-border]="true">
  <po-dynamic-view [p-fields]="fields" [p-value]="record()"></po-dynamic-view>
</po-container>

<!-- Container com scroll interno (lista dentro de form) -->
<po-container p-title="Itens do Pedido" [p-height]="300">
  <po-table [p-columns]="itemColumns" [p-items]="orderItems()"></po-table>
</po-container>
```

```typescript
import { PoContainerModule } from '@po-ui/ng-components';
// em imports do @Component: [PoContainerModule]
```

---

## po-accordion + po-accordion-item

Agrupa conteúdo em seções retráteis — útil para formulários longos com muitas seções, ou
telas de detalhe onde o usuário precisa explorar seções sob demanda.

### po-accordion — Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-show-manager-accordion` | `boolean` | Exibe botões "Expandir todos / Recolher todos" |
| `p-allow-expand-all-items` | `boolean` | Permite múltiplas seções abertas simultaneamente (default: somente uma) |
| `p-size` | `'medium' \| 'large'` | Tamanho visual (default `'medium'`) |

### po-accordion-item — Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do item / título da seção |
| `p-disabled` | `boolean` | Desabilita o item (impede expansão) |

### Métodos programáticos

```typescript
import { ViewChild } from '@angular/core';
import { PoAccordionComponent, PoAccordionItemComponent } from '@po-ui/ng-components';

@ViewChild(PoAccordionComponent) accordion!: PoAccordionComponent;

// Expandir/recolher todos
this.accordion.expandAllItems();
this.accordion.collapseAllItems();
```

### Exemplo em formulário de cadastro

```html
<po-accordion [p-show-manager-accordion]="true" [p-allow-expand-all-items]="true">

  <po-accordion-item p-label="Dados Principais">
    <div class="po-row">
      <po-input  class="po-md-4" p-label="Código"  formControlName="codigo"  [p-required]="true" p-maxlength="6"></po-input>
      <po-input  class="po-md-8" p-label="Nome"    formControlName="nome"    [p-required]="true" p-maxlength="40"></po-input>
      <po-input  class="po-md-6" p-label="E-mail"  formControlName="email"></po-input>
      <po-input  class="po-md-6" p-label="Telefone" formControlName="telefone" p-mask="(99) 99999-9999"></po-input>
    </div>
  </po-accordion-item>

  <po-accordion-item p-label="Endereço">
    <div class="po-row">
      <po-input  class="po-md-3" p-label="CEP"        formControlName="cep" p-mask="99999-999"></po-input>
      <po-input  class="po-md-9" p-label="Logradouro" formControlName="logradouro"></po-input>
      <po-input  class="po-md-4" p-label="Cidade"     formControlName="cidade"></po-input>
      <po-select class="po-md-2" p-label="UF"         formControlName="uf" [p-options]="ufOptions"></po-select>
    </div>
  </po-accordion-item>

  <po-accordion-item p-label="Dados Fiscais" [p-disabled]="!isPessoaJuridica()">
    <div class="po-row">
      <po-input class="po-md-4" p-label="CNPJ"        formControlName="cnpj" p-mask="99.999.999/9999-99"></po-input>
      <po-input class="po-md-4" p-label="Inscrição Estadual" formControlName="ie"></po-input>
    </div>
  </po-accordion-item>

</po-accordion>
```

```typescript
import { PoAccordionModule } from '@po-ui/ng-components';
// em imports do @Component: [PoAccordionModule]
```

---

## po-list-view

Lista card-style com templates customizáveis — alternativa ao `po-table` para dados mais visuais,
como listas de documentos, produtos com imagem, ou registros com muita informação contextual.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-items` | `any[]` | Array de dados |
| `p-property-title` | `string` | Propriedade usada como título de cada card |
| `p-property-link` | `string` | Propriedade usada como link do título |
| `p-loading` | `boolean` | Indicador de carregamento |
| `p-show-more-disabled` | `boolean` | Desabilita o botão "Mostrar mais" |
| `p-selectable` | `boolean` | Habilita seleção de itens com checkbox |
| `p-hide-select-all` | `boolean` | Oculta o checkbox "Selecionar todos" |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-show-more)` | `void` | Clique em "Mostrar mais" — carregar próxima página |
| `(p-selected)` | `any[]` | Array de itens selecionados |

### Diretivas de template

```html
<!-- Conteúdo principal de cada item (linha abaixo do título) -->
<ng-template p-list-view-content-template let-item let-index="index">
  <!-- qualquer HTML/componente PO-UI -->
</ng-template>

<!-- Detalhe expansível (botão "Ver detalhes" aparece automaticamente) -->
<ng-template p-list-view-detail-template let-item let-index="index">
  <!-- HTML do detalhe expandido -->
</ng-template>
```

### Exemplo completo — lista de parceiros

```typescript
import {
  PoListViewModule,
  PoInfoModule,
  PoTagModule,
} from '@po-ui/ng-components';

// em imports: [PoListViewModule, PoInfoModule, PoTagModule]
```

```html
<po-list-view
  [p-items]="items()"
  p-property-title="razaoSocial"
  [p-loading]="loading()"
  [p-show-more-disabled]="!hasNext()"
  [p-selectable]="true"
  (p-show-more)="onShowMore()"
  (p-selected)="onSelect($event)">

  <!-- Conteúdo resumido de cada card -->
  <ng-template p-list-view-content-template let-item>
    <div class="po-row po-mt-1">
      <po-info class="po-md-3" p-label="Código" [p-value]="item.codigo"></po-info>
      <po-info class="po-md-3" p-label="CNPJ"   [p-value]="item.cnpj"></po-info>
      <po-info class="po-md-3" p-label="Cidade" [p-value]="item.cidade + ' / ' + item.estado"></po-info>
      <div class="po-md-3">
        <po-tag
          [p-value]="item.ativo === 'S' ? 'Ativo' : 'Inativo'"
          [p-kind]="item.ativo === 'S' ? 'success' : 'danger'">
        </po-tag>
      </div>
    </div>
  </ng-template>

  <!-- Detalhe expandível -->
  <ng-template p-list-view-detail-template let-item>
    <div class="po-row po-mt-1">
      <po-info class="po-md-6" p-label="E-mail"   [p-value]="item.email"></po-info>
      <po-info class="po-md-6" p-label="Telefone" [p-value]="item.telefone"></po-info>
      <po-info class="po-md-9" p-label="Endereço" [p-value]="item.logradouro + ', ' + item.numero"></po-info>
    </div>
  </ng-template>

</po-list-view>
```

### po-list-view vs po-table — quando usar qual

| Critério | `po-table` | `po-list-view` |
|----------|-----------|----------------|
| Dados tabulares (muitas colunas) | ✅ Ideal | ⚠️ Limitado |
| Cards visuais / layout livre | ⚠️ Limitado | ✅ Ideal |
| Ordenação por coluna | ✅ Nativo | ❌ Manual |
| Templates de célula customizados | ✅ via diretiva | ✅ via template |
| Detalhe expandível (master-detail) | ✅ `type: 'detail'` | ✅ detail-template |
| Mobile-friendly por padrão | ⚠️ Scroll horizontal | ✅ Cards empilham |
