# Template: page-detail

Gera um componente standalone `po-page-detail` para visualização de registro somente leitura.
Usa `po-dynamic-view` para exibição dos campos e carrega o registro pelo parâmetro de rota `:id`.

> **Quando usar vs alternativas:**
> - `page-detail` → entidade tem uma rota de detalhe dedicada, página standalone somente leitura
> - `po-dynamic-view` dentro de `po-modal` → detalhe inline dentro de uma página de lista (sem rota separada)
> - campos `po-info` → poucos campos fixos com controle preciso de layout

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
import { finalize } from 'rxjs/operators';
import {
  PoBreadcrumb,
  PoDialogService,
  PoDynamicModule,
  PoDynamicViewField,
  PoLoadingModule,
  PoNotificationService,
  PoPageModule,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageModule, PoDynamicModule, PoLoadingModule],
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

  readonly loading = signal(false);
  readonly record  = signal<{{ModelInterface}} | null>(null);
  private recordId = '';

  readonly breadcrumb: PoBreadcrumb = {
    items: [
      { label: '{{ModuleName}}', link: '/{{moduleName}}' },
      { label: '{{ModelInterface}}', link: '../' },
      { label: 'Detalhe' },
    ],
  };

  // TODO: defina os campos de visualização. gridColumns: 1-12; type: 'string'|'number'|'currency'|'date'|'dateTime'|'boolean'|'link'
  readonly viewFields: PoDynamicViewField[] = [
    { property: 'codigo',      label: 'Código',       gridColumns: 3 },
    { property: 'nome',        label: 'Nome',         gridColumns: 9 },
    // { property: 'email',       label: 'E-mail',       gridColumns: 6 },
    // { property: 'dataEmissao', label: 'Emissão',      type: 'date', format: 'dd/MM/yyyy', gridColumns: 3 },
    // { property: 'valorTotal',  label: 'Valor Total',  type: 'currency', gridColumns: 3 },
    // { property: 'ativo',       label: 'Ativo',        type: 'boolean', gridColumns: 3 },
  ];

  ngOnInit(): void {
    this.recordId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  private load(): void {
    if (!this.recordId) return;
    this.loading.set(true);
    this.service.getById(this.recordId)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next:  (data) => this.record.set(data),
        error: ()     => this.notification.error('Erro ao carregar registro.'),
      });
  }

  private confirmDelete(): void {
    this.dialog.confirm({
      title:   'Excluir registro',
      message: 'Deseja realmente excluir este registro? Esta ação não pode ser desfeita.',
      confirm: () => this.delete(),
    });
  }

  private delete(): void {
    this.loading.set(true);
    this.service.delete(this.recordId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Registro excluído com sucesso.');
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
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
<po-page-detail
  p-title="Detalhe — {{ModelInterface}}"
  [p-breadcrumb]="breadcrumb"
  (p-edit)="router.navigate(['../', recordId, 'editar'], { relativeTo: route })"
  (p-remove)="confirmDelete()"
  (p-back)="router.navigate(['../'], { relativeTo: route })">

  @if (loading()) {
    <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
  }

  @if (record(); as rec) {
    <po-dynamic-view
      [p-fields]="viewFields"
      [p-value]="rec">
    </po-dynamic-view>
  }

</po-page-detail>
```

## {{kebab-name}}.component.scss

```scss
// Adicione estilos específicos do componente aqui
```

## Configuração de rota

```typescript
{
  path: ':id/detalhe',
  loadComponent: () =>
    import('./{{kebab-name}}/{{kebab-name}}.component')
      .then(m => m.{{ComponentClass}}),
},
// With edit route sibling:
{
  path: ':id/editar',
  loadComponent: () =>
    import('./{{kebab-name-edit}}/{{kebab-name-edit}}.component')
      .then(m => m.{{ComponentClassEdit}}),
},
```

## Variante: com seções po-container

Para entidades com muitos campos, organize em seções rotuladas usando `po-container`:

```html
<po-page-detail
  p-title="Detalhe — {{ModelInterface}}"
  [p-breadcrumb]="breadcrumb"
  (p-edit)="router.navigate(['../', recordId, 'editar'], { relativeTo: route })"
  (p-remove)="confirmDelete()"
  (p-back)="router.navigate(['../'], { relativeTo: route })">

  @if (record(); as rec) {
    <po-container p-title="Dados Principais">
      <po-dynamic-view [p-fields]="mainFields" [p-value]="rec"></po-dynamic-view>
    </po-container>

    <po-container p-title="Contato" class="po-mt-2">
      <po-dynamic-view [p-fields]="contactFields" [p-value]="rec"></po-dynamic-view>
    </po-container>
  }

</po-page-detail>
```

```typescript
readonly mainFields: PoDynamicViewField[] = [
  { property: 'codigo', label: 'Código', gridColumns: 3 },
  { property: 'nome',   label: 'Nome',   gridColumns: 9 },
];

readonly contactFields: PoDynamicViewField[] = [
  { property: 'email',    label: 'E-mail',   gridColumns: 6 },
  { property: 'telefone', label: 'Telefone', gridColumns: 6 },
];
```

```typescript
// Import adicional necessário para a variante com po-container
import { PoContainerModule } from '@po-ui/ng-components';
// add PoContainerModule to imports: [...]
```
