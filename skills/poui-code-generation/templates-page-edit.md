# Template: page-edit

Generates a standalone `po-page-edit` component using `po-dynamic-form` + `PoDynamicFormField[]` for create and edit operations — the standard PO-UI/Protheus form pattern.

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
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY } from 'rxjs';
import {
  PoDynamicFormField,
  PoDynamicModule,
  PoNotificationService,
  PoPageEditModule,
  PoPageEditActions,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageEditModule, PoDynamicModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  private readonly service = inject({{ServiceClass}});
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEdit = signal(false);
  readonly loading = signal(false);
  private recordId = '';

  // Two-way bound to po-dynamic-form; populated on edit load
  values: Partial<{{ModelInterface}}> = {};

  // TODO: define fields matching {{ModelInterface}} properties.
  // Use `divider` to create section headers.
  // Use `gridColumns` (1-12) to control width in the form grid.
  readonly fields: PoDynamicFormField[] = [
    // --- Texto com comprimento obrigatório ---
    {
      property: 'codigo',
      label: 'Código',
      divider: 'Dados Principais',  // cria cabeçalho de seção acima deste campo
      required: true,
      maxLength: 6,
      gridColumns: 6,
    },
    {
      property: 'nome',
      label: 'Nome / Razão Social',
      required: true,
      minLength: 3,
      maxLength: 40,
      gridColumns: 12,
    },

    // --- E-mail com regex ---
    {
      property: 'email',
      label: 'E-mail',
      required: false,
      regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      errorMessage: 'Informe um e-mail válido',
      gridColumns: 12,
    },

    // --- Valor monetário ---
    {
      property: 'valor',
      label: 'Valor',
      type: 'currency',
      required: true,
      min: 0,
      gridColumns: 6,
    },

    // --- Campos com máscara nativa PO-UI ---
    // {
    //   property: 'cnpj',
    //   label: 'CNPJ',
    //   type: 'cnpj',     // aplica máscara e validação automática
    //   required: true,
    //   gridColumns: 6,
    // },
    // {
    //   property: 'cpf',
    //   label: 'CPF',
    //   type: 'cpf',
    //   required: true,
    //   gridColumns: 6,
    // },
    // {
    //   property: 'cep',
    //   label: 'CEP',
    //   type: 'cep',
    //   gridColumns: 4,
    // },
    // {
    //   property: 'telefone',
    //   label: 'Telefone',
    //   mask: '(99) 99999-9999',
    //   gridColumns: 4,
    // },

    // --- Select (options fixas) ---
    // {
    //   property: 'situacao',
    //   label: 'Situação',
    //   divider: 'Status',
    //   options: [
    //     { label: 'Ativo',   value: '1' },
    //     { label: 'Inativo', value: '2' },
    //   ],
    //   gridColumns: 6,
    // },

    // --- Data ---
    // {
    //   property: 'dataEmissao',
    //   label: 'Data de Emissão',
    //   type: 'date',
    //   required: true,
    //   gridColumns: 4,
    // },

    // --- Número inteiro com limites ---
    // {
    //   property: 'quantidade',
    //   label: 'Quantidade',
    //   type: 'number',
    //   min: 0,
    //   max: 9999,
    //   gridColumns: 4,
    // },
  ];

  readonly editActions: PoPageEditActions = {
    save: {
      label: 'Salvar',
      action: () => this.save(),
    },
    cancel: {
      label: 'Cancelar',
      action: () => this.goBack(),
    },
  };

  get pageTitle(): string {
    return this.isEdit() ? 'Editar {{ModelInterface}}' : 'Novo {{ModelInterface}}';
  }

  ngOnInit(): void {
    const params = this.route.snapshot.params;
    if (params['id']) {
      this.recordId = params['id'];
      this.isEdit.set(true);
      this.loadRecord();
    }
  }

  save(): void {
    this.loading.set(true);
    const request$ = this.isEdit()
      ? this.service.update(this.recordId, this.values)
      : this.service.create(this.values);

    request$
      .pipe(
        catchError((err) => {
          this.notification.error(this.parseError(err));
          this.loading.set(false);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.notification.success(
          this.isEdit() ? 'Registro atualizado com sucesso.' : 'Registro criado com sucesso.'
        );
        this.loading.set(false);
        this.goBack();
      });
  }

  private loadRecord(): void {
    this.loading.set(true);
    this.service
      .getById(this.recordId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          this.values = { ...record };
          this.loading.set(false);
        },
        error: (err) => {
          this.notification.error(this.parseError(err));
          this.loading.set(false);
          this.goBack();
        },
      });
  }

  private goBack(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  // Decodes Protheus REST error format: { errorMessage: JSON.stringify({code, message, detailedMessage}) }
  private parseError(err: any): string {
    try {
      const errObj = JSON.parse(err.error?.errorMessage ?? '{}');
      const msg = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
```

## {{kebab-name}}.component.html

```html
<po-page-edit
  [p-title]="pageTitle"
  [p-actions]="editActions"
  [p-loading]="loading()">

  <po-dynamic-form
    [p-fields]="fields"
    [(p-value)]="values">
  </po-dynamic-form>

</po-page-edit>
```

## {{kebab-name}}.component.scss

```scss
// Add component-specific styles here
```
