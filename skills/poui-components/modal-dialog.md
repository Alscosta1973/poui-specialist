# PO-UI Modal, Dialog e Dynamic View

## po-modal

Componente de diálogo modal. Controlado via `@ViewChild` + métodos `open()` / `close()`.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título exibido no cabeçalho |
| `p-size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'auto'` | Largura do modal (default `'md'`) |
| `p-primary-action` | `PoModalAction` | Botão primário (confirmar/salvar) |
| `p-secondary-action` | `PoModalAction` | Botão secundário (cancelar/fechar) |
| `p-hide-close` | `boolean` | Oculta o X de fechar |

### PoModalAction

```typescript
interface PoModalAction {
  label: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean | (() => boolean);
  loading?: boolean;
}
```

### Uso com @ViewChild

```typescript
import {
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  PoModalAction,
  PoModalComponent,
  PoModalModule,
} from '@po-ui/ng-components';

@Component({
  standalone: true,
  imports: [PoModalModule, PoDynamicModule],
  ...
})
export class MeuComponent {
  @ViewChild(PoModalComponent) private modal!: PoModalComponent;

  readonly formValues = signal<Partial<MinhaEntidade>>({});

  readonly primaryAction: PoModalAction = {
    label: 'Salvar',
    action: () => this.save(),
  };

  readonly secondaryAction: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modal.close(),
  };

  openNew(): void {
    this.formValues.set({});
    this.modal.open();
  }

  openEdit(row: MinhaEntidade): void {
    this.formValues.set({ ...row });
    this.modal.open();
  }

  private save(): void {
    // lógica de salvar
    this.modal.close();
  }
}
```

```html
<po-modal
  p-title="Novo Registro"
  p-size="md"
  [p-primary-action]="primaryAction"
  [p-secondary-action]="secondaryAction">

  <po-dynamic-form
    [p-fields]="fields"
    [(p-value)]="formValues">
  </po-dynamic-form>

</po-modal>
```

> **Nota sobre `[(p-value)]`:** O `po-dynamic-form` suporta two-way binding com `[(p-value)]` para
> objetos simples (não signals). Com signals, use `[p-value]="formValues()"` e inicialize o objeto
> antes de abrir o modal. **Não existe `(p-value-change)`** nesta versão do PO-UI — nunca use-o.
> Para reagir a mudanças de campo em tempo real, use `(p-form)` e assine `form.valueChanges`
> (ver Quirk #13 em `po-ui-quirks.md`).

---

## PoDialogService

Serviço para diálogos de confirmação e alerta — sem componente no template.

### confirm

```typescript
import { PoDialogService } from '@po-ui/ng-components';

private readonly dialog = inject(PoDialogService);

confirmDelete(row: MinhaEntidade): void {
  this.dialog.confirm({
    title: 'Excluir registro',
    message: `Deseja realmente excluir "${row.nome}"? Esta ação não pode ser desfeita.`,
    confirm: () => this.delete(row),
    cancel:  () => {},               // opcional
    confirmLabel: 'Excluir',         // opcional — default 'Confirmar'
    cancelLabel:  'Manter',          // opcional — default 'Cancelar'
  });
}
```

### alert

```typescript
showAlert(msg: string): void {
  this.dialog.alert({
    title: 'Atenção',
    message: msg,
    ok: () => {},  // callback ao fechar — opcional
  });
}
```

> **Nota:** `PoDialogService` NÃO precisa de `po-dialog` no template. Ele cria o diálogo
> programaticamente via serviço. Injete apenas no `inject()`. Já está disponível como
> `providedIn: 'root'` — não requer declaração em providers.

---

## po-dynamic-view

Exibe campos de um objeto em layout de grade — ideal para telas de detalhe/visualização somente leitura.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-fields` | `PoDynamicViewField[]` | Definição dos campos exibidos |
| `p-value` | `object` | Objeto com os valores a exibir |

### PoDynamicViewField

```typescript
interface PoDynamicViewField {
  property: string;            // nome da propriedade no objeto
  label?: string;              // rótulo exibido
  type?: 'string' | 'number' | 'currency' | 'date' | 'dateTime'
       | 'boolean' | 'link' | 'subtitle';
  format?: string;             // ex: 'dd/MM/yyyy' para datas
  gridColumns?: number;        // 1-12 (responsive grid, default 6)
  concatLinesLimit?: number;   // para arrays de string
  tag?: boolean;               // exibe valor como po-tag
  color?: string;              // token de cor PO-UI (ex: 'color-08')
}
```

### Exemplo

```typescript
import { PoDynamicModule, PoDynamicViewField } from '@po-ui/ng-components';

// em imports: [PoDynamicModule]

readonly viewFields: PoDynamicViewField[] = [
  { property: 'codigo',      label: 'Código',       gridColumns: 3 },
  { property: 'nome',        label: 'Nome',         gridColumns: 9 },
  { property: 'email',       label: 'E-mail',       gridColumns: 6 },
  { property: 'dataEmissao', label: 'Emissão',      type: 'date', format: 'dd/MM/yyyy', gridColumns: 3 },
  { property: 'valorTotal',  label: 'Valor Total',  type: 'currency', gridColumns: 3 },
  { property: 'ativo',       label: 'Ativo',        type: 'boolean', gridColumns: 3 },
];
```

```html
<po-dynamic-view
  [p-fields]="viewFields"
  [p-value]="record()">
</po-dynamic-view>
```

> **Dica de uso combinado:** Em modais de detalhe (sem edição), substitua o `po-dynamic-form`
> pelo `po-dynamic-view` com os mesmos `fields` — reusa a definição de campos sem duplicar código.

---

## po-page-slide

Painel lateral deslizante a partir da borda direita da tela — alternativa ao `po-modal` quando
o conteúdo secundário precisa coexistir visualmente com a página principal.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título exibido no cabeçalho do painel |
| `p-size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | Largura do painel (default `'md'`) |
| `p-hide-close` | `boolean` | Oculta o botão de fechar |
| `p-click-out` | `boolean` | Fecha ao clicar fora do painel (default `false`) |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-close)` | `void` | Emitido ao fechar o painel |

### Uso com @ViewChild

```typescript
import { ViewChild } from '@angular/core';
import { PoPageSlideComponent, PoPageSlideModule } from '@po-ui/ng-components';
// em imports: [PoPageSlideModule]

@ViewChild(PoPageSlideComponent) slide!: PoPageSlideComponent;

openSlide():  void { this.slide.open();  }
closeSlide(): void { this.slide.close(); }
```

### Exemplo completo

```html
<po-button
  p-label="Ver Detalhes"
  p-icon="po-icon-eye"
  p-kind="secondary"
  (p-click)="openSlide()">
</po-button>

<po-page-slide p-title="Detalhes do Pedido" p-size="md" (p-close)="onSlideClose()">

  <div class="po-row">
    <po-info class="po-md-6" p-label="Número"     [p-value]="pedido().numero"></po-info>
    <po-info class="po-md-6" p-label="Emissão"    [p-value]="pedido().dataEmissao"></po-info>
    <po-info class="po-md-6" p-label="Fornecedor" [p-value]="pedido().fornecedor"></po-info>
    <po-info class="po-md-6" p-label="Valor Total" [p-value]="pedido().valorTotal"></po-info>
  </div>

  <po-page-slide-footer>
    <po-button p-label="Fechar" p-kind="secondary" (p-click)="closeSlide()"></po-button>
    <po-button p-label="Editar" p-kind="primary"   p-icon="po-icon-edit" (p-click)="editarPedido()"></po-button>
  </po-page-slide-footer>

</po-page-slide>
```

> **po-page-slide vs po-modal:** Use `po-page-slide` quando o usuário precisa continuar vendo a
> página principal enquanto visualiza o detalhe. Use `po-modal` quando a tarefa exige atenção total.
