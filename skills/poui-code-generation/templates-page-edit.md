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

  // TODO: define fields matching {{ModelInterface}} properties
  // Use `divider` to create section headers, `options` for selects,
  // `type: 'cpf'|'cnpj'|'cep'` for masked fields.
  readonly fields: PoDynamicFormField[] = [
    {
      property: 'codigo',
      label: 'Código',
      divider: 'Dados Principais',
      maxLength: 6,
      required: true,
    },
    {
      property: 'nome',
      label: 'Nome',
      maxLength: 40,
      required: true,
    },
    // Example select:
    // {
    //   property: 'situacao',
    //   label: 'Situação',
    //   options: [
    //     { label: 'Ativo',    value: '1' },
    //     { label: 'Inativo',  value: '2' },
    //   ],
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
