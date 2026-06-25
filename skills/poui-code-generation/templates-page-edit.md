# Template: page-edit

Componente standalone `po-page-edit` com `po-dynamic-form` + `PoDynamicFormField[]` para criação e edição.

## {{kebab-name}}.component.ts

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
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY } from 'rxjs';
import {
  PoDynamicFormField,
  PoDynamicModule,
  PoNotificationService,
  PoPageModule,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageModule, PoDynamicModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit {
  private readonly service = inject({{ServiceClass}});
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly isEdit = signal(false);
  readonly loading = signal(false);
  private recordId = '';

  // Binding bidirecional com po-dynamic-form; populado ao carregar para edição
  values: Partial<{{ModelInterface}}> = {};

  // TODO: defina os campos correspondentes às propriedades de {{ModelInterface}}.
  // `divider` cria um cabeçalho de seção acima do campo; `gridColumns` (1-12) controla a largura.
  readonly fields: PoDynamicFormField[] = [
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
    {
      property: 'email',
      label: 'E-mail',
      required: false,
      regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      errorMessage: 'Informe um e-mail válido',
      gridColumns: 12,
    },
    {
      property: 'valor',
      label: 'Valor',
      type: 'currency',
      required: true,
      min: 0,
      gridColumns: 6,
    },
    // { property: 'cnpj',        label: 'CNPJ',             type: 'cnpj',   required: true,  gridColumns: 6 },
    // { property: 'cpf',         label: 'CPF',              type: 'cpf',    required: true,  gridColumns: 6 },
    // { property: 'cep',         label: 'CEP',              type: 'cep',                     gridColumns: 4 },
    // { property: 'telefone',    label: 'Telefone',         mask: '(99) 99999-9999',          gridColumns: 4 },
    // { property: 'situacao',    label: 'Situação',         divider: 'Status',
    //   options: [{ label: 'Ativo', value: '1' }, { label: 'Inativo', value: '2' }],         gridColumns: 6 },
    // { property: 'dataEmissao', label: 'Data de Emissão',  type: 'date',   required: true,  gridColumns: 4 },
    // { property: 'quantidade',  label: 'Quantidade',       type: 'number', min: 0, max: 9999, gridColumns: 4 },
  ];

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

  ngAfterViewInit(): void {
    setTimeout(() => this.cdr.detectChanges());
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

  // Decodifica o formato de erro REST do Protheus: { errorMessage: JSON.stringify({code, message, detailedMessage}) }
  private parseError(err: unknown): string {
    try {
      const errObj = JSON.parse((err as any).error?.errorMessage ?? '{}');
      const decode = (s: string) => new TextDecoder('iso-8859-1').decode(
        Uint8Array.from(s, c => c.charCodeAt(0))
      );
      const msg    = decode(errObj.message ?? '');
      const detail = errObj.detailedMessage ? ` — ${decode(errObj.detailedMessage)}` : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return (err as any).error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
```

## {{kebab-name}}.component.html

```html
<po-page-edit
  [p-title]="pageTitle"
  [p-disable-submit]="loading()"
  (p-save)="save()"
  (p-cancel)="goBack()">

  <po-dynamic-form
    [p-fields]="fields"
    [(p-value)]="values">
  </po-dynamic-form>

</po-page-edit>
```

## {{kebab-name}}.component.scss

```scss
// Adicione estilos específicos do componente aqui
```
