# Template: upload

Gera componente de upload de arquivos com `po-upload`, integrado com endpoint REST Protheus.
Três variações disponíveis — o agente escolhe conforme o contexto:

| Variação | Quando usar |
|----------|-------------|
| **A — Upload único simples** | Um arquivo, auto-upload, resultado exibido inline |
| **B — Upload múltiplo** | Vários arquivos, validação de tipo/tamanho, lista de progresso |
| **C — Upload embutido em formulário** | Arquivo é um campo do form; upload via POST junto com os dados |

---

## Template A — Upload único (auto-upload)

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
  PoUploadModule,
} from '@po-ui/ng-components';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageModule, PoToolbarModule, PoUploadModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit {
  private readonly notification = inject(PoNotificationService);
  private readonly cdr          = inject(ChangeDetectorRef);

  // URL do endpoint Protheus que recebe o multipart/form-data
  readonly uploadUrl = '/rest/api/custom/v1/{{kebab-name}}/upload';

  // Extensões e tamanho — ajustar conforme regra de negócio
  readonly allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  readonly maxFileSizeMb     = 5;   // interpretado em MB quando p-restrict-in-megabytes="true"

  readonly loading     = signal(false);
  readonly uploadDone  = signal(false);
  readonly resultLabel = signal('');

  ngOnInit(): void {}
  ngAfterViewInit(): void { setTimeout(() => this.cdr.detectChanges()); }

  onUpload(files: any): void {
    // (p-upload) dispara quando o usuário confirma o upload
    // po-upload gerencia o request HTTP — este handler recebe o evento de início
    this.loading.set(true);
    this.uploadDone.set(false);
  }

  onUploadSuccess(event: any): void {
    this.loading.set(false);
    this.uploadDone.set(true);
    this.resultLabel.set('Arquivo enviado com sucesso!');
    this.notification.success('Upload concluído.');
  }

  onUploadError(event: any): void {
    this.loading.set(false);
    this.notification.error('Falha no envio. Verifique o arquivo e tente novamente.');
  }
}
```

### {{kebab-name}}.component.html

```html
<po-toolbar p-title="Upload de Arquivos"></po-toolbar>

<po-page-default p-title="{{PageTitle}}">

  <po-upload
    p-label="Selecione um arquivo"
    [p-url]="uploadUrl"
    [p-auto-upload]="true"
    [p-drag-drop]="true"
    [p-allowed-extensions]="allowedExtensions"
    [p-max-file-size]="maxFileSizeMb"
    [p-restrict-in-megabytes]="true"
    [p-disabled]="loading()"
    (p-upload)="onUpload($event)"
    (p-success)="onUploadSuccess($event)"
    (p-error)="onUploadError($event)">
  </po-upload>

  @if (uploadDone()) {
    <div class="po-mt-2">
      <span class="po-color-11">{{ resultLabel() }}</span>
    </div>
  }

</po-page-default>
```

---

## Template B — Upload múltiplo com validação

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
import {
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
  PoToolbarModule,
  PoUploadModule,
} from '@po-ui/ng-components';

export interface UploadResult {
  name:   string;
  size:   string;
  status: 'enviado' | 'erro';
}

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageModule, PoToolbarModule, PoUploadModule, PoTableModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit {
  private readonly notification = inject(PoNotificationService);
  private readonly cdr          = inject(ChangeDetectorRef);

  readonly uploadUrl         = '/rest/api/custom/v1/{{kebab-name}}/upload';
  readonly allowedExtensions = ['.pdf', '.xls', '.xlsx', '.csv'];
  readonly maxFileSizeMb     = 10;

  readonly loading     = signal(false);
  readonly results     = signal<UploadResult[]>([]);
  readonly pendingCount = signal(0);

  readonly resultCols: PoTableColumn[] = [
    { property: 'name',   label: 'Arquivo' },
    { property: 'size',   label: 'Tamanho', width: '15%' },
    {
      property: 'status',
      label: 'Status',
      type: 'label',
      labels: [
        { value: 'enviado', color: 'color-11', label: 'Enviado' },
        { value: 'erro',    color: 'color-07', label: 'Erro'    },
      ],
    },
  ];

  ngOnInit(): void {}
  ngAfterViewInit(): void { setTimeout(() => this.cdr.detectChanges()); }

  onUpload(files: any[]): void {
    this.loading.set(true);
    this.pendingCount.set(Array.isArray(files) ? files.length : 1);
  }

  onUploadSuccess(event: { file: { name: string; size: number } }): void {
    const file = event?.file;
    const newEntry: UploadResult = {
      name:   file?.name ?? 'arquivo',
      size:   file ? this.formatBytes(file.size) : '—',
      status: 'enviado',
    };
    this.results.update(prev => [...prev, newEntry]);
    this.decrementPending();
  }

  onUploadError(event: { file: { name: string; size: number } }): void {
    const file = event?.file;
    const newEntry: UploadResult = {
      name:   file?.name ?? 'arquivo',
      size:   file ? this.formatBytes(file.size) : '—',
      status: 'erro',
    };
    this.results.update(prev => [...prev, newEntry]);
    this.notification.error(`Falha ao enviar: ${file?.name ?? 'arquivo'}`);
    this.decrementPending();
  }

  private decrementPending(): void {
    this.pendingCount.update(n => n - 1);
    if (this.pendingCount() <= 0) {
      this.loading.set(false);
      this.notification.success('Upload concluído.');
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
```

### {{kebab-name}}.component.html

```html
<po-toolbar p-title="Upload de Arquivos"></po-toolbar>

<po-page-default p-title="{{PageTitle}}">

  <po-upload
    p-label="Selecione os arquivos"
    [p-url]="uploadUrl"
    [p-multiple]="true"
    [p-drag-drop]="true"
    [p-allowed-extensions]="allowedExtensions"
    [p-max-file-size]="maxFileSizeMb"
    [p-restrict-in-megabytes]="true"
    [p-disabled]="loading()"
    (p-upload)="onUpload($event)"
    (p-success)="onUploadSuccess($event)"
    (p-error)="onUploadError($event)">
  </po-upload>

  @if (results().length > 0) {
    <po-table
      class="po-mt-2"
      p-title="Resultado do upload"
      [p-columns]="resultCols"
      [p-items]="results()"
      [p-striped]="true"
      [p-hide-select-all]="true">
    </po-table>
  }

</po-page-default>
```

---

## Template C — Upload embutido em formulário (manual)

> Arquivo é selecionado pelo usuário mas enviado junto com o POST do formulário
> (não usa `[p-url]` — o componente apenas captura o arquivo).

### {{kebab-name}}.component.ts (fragmento — integrar com page-edit ou modal-crud)

```typescript
import { PoUploadFile, PoUploadModule } from '@po-ui/ng-components';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// Dentro do componente:
readonly uploadUrl     = '';          // vazio = po-upload não envia automaticamente
readonly pendingFile   = signal<File | null>(null);
readonly uploading     = signal(false);

readonly allowedExtensions = ['.pdf'];
readonly maxFileSizeMb     = 5;

onFileChange(files: PoUploadFile[]): void {
  const rawFile = files[0]?.rawFile ?? null;
  this.pendingFile.set(rawFile);
}

// No método de salvar (onSave / onSubmit):
private saveWithFile(formData: Record<string, unknown>): void {
  const file = this.pendingFile();
  if (!file) {
    // Nenhum arquivo selecionado — salvar só o formulário
    this.submitForm(formData);
    return;
  }

  // Montar FormData com arquivo + campos
  const payload = new FormData();
  payload.append('file', file, file.name);
  Object.entries(formData).forEach(([k, v]) =>
    payload.append(k, String(v ?? ''))
  );

  this.uploading.set(true);
  this.http
    .post('/rest/api/custom/v1/{{kebab-name}}', payload)
    .pipe(
      finalize(() => this.uploading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe({
      next: () => {
        this.notification.success('Salvo com sucesso!');
        this.router.navigate(['..'], { relativeTo: this.route });
      },
      error: (err) => this.notification.error(this.parseProtheusError(err)),
    });
}
```

### HTML (fragmento — dentro do po-page-edit ou po-modal)

```html
<po-upload
  p-label="Anexar documento (PDF, max 5 MB)"
  p-placeholder="Clique ou arraste o arquivo aqui"
  [p-url]="uploadUrl"
  [p-auto-upload]="false"
  [p-drag-drop]="true"
  [p-allowed-extensions]="allowedExtensions"
  [p-max-file-size]="maxFileSizeMb"
  [p-restrict-in-megabytes]="true"
  [p-disabled]="uploading()"
  (p-file-change)="onFileChange($event)">
</po-upload>
```

---

## Integração Protheus — Backend ADVPL (dicas)

```
// No endpoint ADVPL (WsRestFul) que recebe o upload:
// - Usar FWRest:GetData() para ler o corpo multipart
// - O campo do arquivo vem com nome definido pelo [p-field-name] (padrão: 'file')
// - Tamanho máximo do AppServer: configurar MaxStringSize no appserver.ini
//   [General]
//   MaxStringSize=50  ; em MB; padrão 10MB
//
// Cabeçalho de autenticação: po-upload envia os mesmos cookies/headers
// da sessão Angular — o interceptor de auth (Template A do http-interceptor)
// adiciona o Bearer token automaticamente via HttpInterceptorFn.
// ATENÇÃO: po-upload usa XMLHttpRequest internamente, não o HttpClient —
// o interceptor Angular NÃO intercepta requests do po-upload automaticamente.
//
// Para adicionar autenticação no po-upload, usar [p-headers]:
// readonly uploadHeaders = { Authorization: `Bearer ${this.token}` };
// <po-upload [p-headers]="uploadHeaders" ...>
```

### Cabeçalho de autenticação explícito

```typescript
import { ProAuthService } from '@totvs/protheus-lib-core';

// No componente:
private readonly authService = inject(ProAuthService);

readonly uploadHeaders = signal<Record<string, string>>({});

ngOnInit(): void {
  const token = this.authService.getToken?.() ?? '';
  if (token) {
    this.uploadHeaders.set({ Authorization: `Bearer ${token}` });
  }
}
```

```html
<po-upload
  [p-url]="uploadUrl"
  [p-headers]="uploadHeaders()"
  ...>
</po-upload>
```

---

## Propriedades po-upload — referência rápida

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `[p-url]` | `string` | — | URL do endpoint de upload (obrigatório para auto-upload) |
| `[p-auto-upload]` | `boolean` | `true` | Envia ao selecionar arquivo |
| `[p-multiple]` | `boolean` | `false` | Permite múltiplos arquivos |
| `[p-drag-drop]` | `boolean` | `false` | Habilita área drag-and-drop |
| `[p-allowed-extensions]` | `string[]` | `[]` (todos) | Ex: `['.pdf', '.png']` |
| `[p-max-file-size]` | `number` | `0` (ilimitado) | Bytes ou MB (ver restrict) |
| `[p-restrict-in-megabytes]` | `boolean` | `false` | Interpreta `max-file-size` em MB |
| `[p-field-name]` | `string` | `'file'` | Nome do campo no multipart |
| `[p-headers]` | `object` | `{}` | Cabeçalhos HTTP adicionais |
| `[p-disabled]` | `boolean` | `false` | Desabilita o componente |
| `(p-upload)` | event | — | Início do upload (arquivos selecionados) |
| `(p-success)` | event | — | Upload concluído com sucesso |
| `(p-error)` | event | — | Falha no upload |
| `(p-file-change)` | event | — | Lista de arquivos alterada (Template C) |

> **Quirk — interceptor não intercepta po-upload:** `po-upload` usa `XMLHttpRequest` internamente,
> não o `HttpClient`. O `HttpInterceptorFn` do Angular **não** intercepta esses requests.
> Para autenticação, usar `[p-headers]` explicitamente com o token Bearer.
