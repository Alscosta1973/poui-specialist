# Reactive Forms com PO-UI

Padrões para usar Angular Reactive Forms com campos PO-UI em telas `po-page-edit`.

> **Quando usar Reactive Forms vs PoDynamicForm:**
> - **Reactive Forms** → validação cruzada entre campos, lógica de disable dinâmica,
>   FormArray para linhas repetíveis, controle preciso sobre o modelo de dados.
> - **PoDynamicForm** → campos simples sem dependências, prototipagem rápida, menos boilerplate.

---

## Setup básico — FormGroup + FormBuilder

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  PoDecimalModule,
  PoDatepickerModule,
  PoInputModule,
  PoLoadingModule,
  PoNotificationService,
  PoPageModule,
  PoSelectModule,
  PoSwitchModule,
  PoTextareaModule,
} from '@po-ui/ng-components';
import { PedidosService } from '../pedidos.service';
import { Pedido } from '../models/pedido.model';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PoPageModule,
    PoInputModule,
    PoSelectModule,
    PoDecimalModule,
    PoDatepickerModule,
    PoSwitchModule,
    PoTextareaModule,
    PoLoadingModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pedidos-edit.component.html',
})
export class PedidosEditComponent implements OnInit {
  private readonly fb           = inject(FormBuilder);
  private readonly service      = inject(PedidosService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly loading = signal(false);
  readonly isEdit  = signal(false);
  private recordId = '';

  readonly situacaoOptions = [
    { label: 'Ativo',    value: 'S' },
    { label: 'Inativo',  value: 'N' },
    { label: 'Bloqueado', value: 'B' },
  ];

  readonly form: FormGroup = this.fb.group({
    codigo:        ['',  [Validators.required, Validators.maxLength(6)]],
    loja:          ['01',[Validators.required, Validators.maxLength(2)]],
    nome:          ['',  [Validators.required, Validators.minLength(3), Validators.maxLength(40)]],
    cnpj:          ['',  Validators.required],
    email:         ['',  Validators.email],
    limiteCredito: [0,   [Validators.required, Validators.min(0)]],
    situacao:      ['S', Validators.required],
    observacoes:   [''],
  });

  ngOnInit(): void {
    this.recordId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.recordId) {
      this.isEdit.set(true);
      // Bloqueia código em modo edição — não pode ser alterado
      this.form.get('codigo')!.disable();
      this.form.get('loja')!.disable();
      this.loadRecord();
    }
  }

  private loadRecord(): void {
    this.loading.set(true);
    this.service.getById(this.recordId)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next:  (data) => this.form.patchValue(data),
        error: ()     => this.notification.error('Erro ao carregar registro.'),
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Corrija os campos inválidos antes de salvar.');
      return;
    }
    this.loading.set(true);
    // getRawValue() inclui campos disabled — use sempre no submit
    const payload: Pedido = this.form.getRawValue();
    const request$ = this.isEdit()
      ? this.service.update(this.recordId, payload)
      : this.service.create(payload);

    request$
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success(`Registro ${this.isEdit() ? 'alterado' : 'incluído'} com sucesso.`);
          this.cancel();
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  cancel(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
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

```html
<po-page-edit
  p-title="Cliente"
  [p-disable-submit]="form.invalid || loading()"
  (p-save)="save()"
  (p-cancel)="cancel()">

  @if (loading()) {
    <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
  }

  <form [formGroup]="form">
    <div class="po-row">
      <po-input    class="po-md-4" p-label="Código"         formControlName="codigo"
                   [p-required]="true" [p-maxlength]="6"
                   [p-disabled]="isEdit()"></po-input>
      <po-input    class="po-md-2" p-label="Loja"           formControlName="loja"
                   [p-required]="true" [p-maxlength]="2"
                   [p-disabled]="isEdit()"></po-input>
      <po-input    class="po-md-6" p-label="Nome"           formControlName="nome"
                   [p-required]="true" [p-maxlength]="40"></po-input>
      <po-input    class="po-md-4" p-label="CNPJ"           formControlName="cnpj"
                   p-type="cnpj" [p-required]="true"></po-input>
      <po-input    class="po-md-4" p-label="E-mail"         formControlName="email"></po-input>
      <po-decimal  class="po-md-4" p-label="Limite Crédito" formControlName="limiteCredito"
                   [p-decimals-length]="2" [p-min]="0"></po-decimal>
      <po-select   class="po-md-3" p-label="Situação"       formControlName="situacao"
                   [p-options]="situacaoOptions"></po-select>
      <po-textarea class="po-md-9" p-label="Observações"    formControlName="observacoes"
                   [p-rows]="3"></po-textarea>
    </div>
  </form>

</po-page-edit>
```

---

## Validação cruzada (cross-field validator)

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const senha    = group.get('senha')?.value;
    const confirma = group.get('confirmarSenha')?.value;
    return senha && confirma && senha !== confirma
      ? { passwordMismatch: true }
      : null;
  };
}

readonly form = this.fb.group(
  {
    senha:          ['', [Validators.required, Validators.minLength(8)]],
    confirmarSenha: ['',  Validators.required],
  },
  { validators: passwordMatchValidator() },
);
```

```html
@if (form.hasError('passwordMismatch') && form.get('confirmarSenha')!.touched) {
  <span class="po-text-color-feedback-negative">As senhas não coincidem.</span>
}
```

---

## Disable dinâmico por valor de outro campo

```typescript
ngOnInit(): void {
  // Habilita 'inscricaoEstadual' somente quando tipoContribuinte === 'CL'
  this.form.get('tipoContribuinte')!.valueChanges
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((tipo: string) => {
      const ctrl = this.form.get('inscricaoEstadual')!;
      if (tipo === 'CL') {
        ctrl.enable();
      } else {
        ctrl.disable();
        ctrl.reset('');
      }
    });
}
```

```html
<!-- p-disabled reflete o estado do AbstractControl -->
<po-input
  class="po-md-4"
  p-label="Inscrição Estadual"
  formControlName="inscricaoEstadual"
  [p-disabled]="form.get('inscricaoEstadual')!.disabled">
</po-input>
```

---

## FormArray — linhas repetíveis (ex: itens de pedido)

```typescript
import {
  FormArray,
  FormGroup,
  AbstractControl,
} from '@angular/forms';

// Getter tipado para acesso sem cast repetido
get itens(): FormArray {
  return this.form.get('itens') as FormArray;
}

readonly form: FormGroup = this.fb.group({
  numeroPedido: ['', Validators.required],
  dataEmissao:  ['', Validators.required],
  observacoes:  [''],
  itens:        this.fb.array([]),   // começa vazio; itens adicionados via addItem()
});

addItem(): void {
  const itemGroup = this.fb.group({
    produto:    ['', Validators.required],
    quantidade: [1,  [Validators.required, Validators.min(1)]],
    valorUnit:  [0,  [Validators.required, Validators.min(0.01)]],
    total:      [{ value: 0, disabled: true }],   // calculado automaticamente
  });

  // Recalcula total ao mudar quantidade ou valor unitário
  itemGroup.get('quantidade')!.valueChanges
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.recalcItem(itemGroup));

  itemGroup.get('valorUnit')!.valueChanges
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.recalcItem(itemGroup));

  this.itens.push(itemGroup);
}

removeItem(index: number): void {
  this.itens.removeAt(index);
}

private recalcItem(group: AbstractControl): void {
  const qty   = (group as FormGroup).get('quantidade')!.value ?? 0;
  const price = (group as FormGroup).get('valorUnit')!.value  ?? 0;
  (group as FormGroup).get('total')!.setValue(qty * price, { emitEvent: false });
}

get totalPedido(): number {
  return this.itens.controls.reduce((sum, ctrl) => {
    const g = ctrl as FormGroup;
    return sum + (g.get('total')!.value ?? 0);
  }, 0);
}
```

```html
<po-container p-title="Itens do Pedido">

  <div formArrayName="itens">
    @for (item of itens.controls; track $index; let i = $index) {
      <div class="po-row" [formGroupName]="i">
        <po-combo   class="po-md-4" p-label="Produto"    formControlName="produto"
                    [p-options]="produtoOptions" [p-required]="true"></po-combo>
        <po-number  class="po-md-2" p-label="Quantidade" formControlName="quantidade"
                    [p-min]="1" [p-required]="true"></po-number>
        <po-decimal class="po-md-2" p-label="Vlr Unit."  formControlName="valorUnit"
                    [p-decimals-length]="2" [p-min]="0.01"></po-decimal>
        <po-decimal class="po-md-2" p-label="Total"      formControlName="total"
                    [p-decimals-length]="2" [p-disabled]="true"></po-decimal>
        <div class="po-md-2 po-flex po-align-items-end po-pb-1">
          <po-button
            p-label="Remover"
            p-kind="tertiary"
            p-icon="po-icon-delete"
            p-type="danger"
            (p-click)="removeItem(i)">
          </po-button>
        </div>
      </div>
    }
  </div>

  <div class="po-row po-mt-2 po-align-items-center">
    <po-button
      p-label="Adicionar Item"
      p-icon="po-icon-plus"
      p-kind="secondary"
      (p-click)="addItem()">
    </po-button>
    <span class="po-ml-3 po-font-text">
      Total do Pedido: <strong>{{ totalPedido | currency:'BRL':'symbol':'1.2-2' }}</strong>
    </span>
  </div>

</po-container>
```

```typescript
import { PoComboModule, PoNumberModule, PoDecimalModule, PoContainerModule, PoButtonModule } from '@po-ui/ng-components';
// em imports: [..., PoComboModule, PoNumberModule, PoDecimalModule, PoContainerModule, PoButtonModule]
```

---

## patchValue vs setValue vs getRawValue

| Método | Comportamento | Quando usar |
|--------|--------------|-------------|
| `form.patchValue(obj)` | Atualiza apenas as propriedades presentes em `obj`; ignora propriedades ausentes | Load de dados da API (response pode não ter todos os campos) |
| `form.setValue(obj)` | Exige que `obj` contenha **todos** os campos — erro se faltar algum | Raramente necessário; prefira `patchValue` |
| `form.getRawValue()` | Retorna **todos** os campos incluindo os `disabled` | **Sempre** usar no submit — não omite campos desabilitados |
| `form.value` | Retorna apenas campos `enabled`; campos `disabled` são omitidos | Nunca usar no submit; usar apenas para inspeção |
| `form.markAllAsTouched()` | Ativa exibição de erros em todos os campos | Chamar ao tentar salvar com formulário inválido |
| `ctrl.reset(value?)` | Limpa o campo e marca como `pristine` + `untouched` | Limpar campo ao desabilitá-lo por lógica condicional |
