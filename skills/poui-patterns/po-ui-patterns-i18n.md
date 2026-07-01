# Padrão: Internacionalização (i18n) com PoI18nService

Guia completo para adicionar suporte multilíngue a projetos PO-UI + Protheus.
Cobre: configuração, dicionários JSON, uso no componente, detecção de idioma pelo Protheus,
language switcher e armadilhas comuns.

---

## Quando usar i18n

| Cenário | Recomendação |
|---------|-------------|
| App usado apenas no Brasil, por usuários em PT-BR | Labels hardcoded em PT-BR são aceitáveis — não adicione i18n por precaução |
| App exportado para clientes internacionais | i18n obrigatório |
| App Protheus com clientes em ES/EN configurados no sistema | Detectar idioma via `ProAppConfigService` |
| Labels de negócio específicos do cliente (ex: "Nota Fiscal" vs "Invoice") | i18n mesmo se monolíngue — facilita personalização por cliente |

---

## 1. Estrutura de arquivos

```
src/
├── app/
│   ├── app.config.ts         ← registrar providePoI18n()
│   └── ...
└── i18n/
    ├── geral.pt.json         ← literais globais PT-BR
    ├── geral.en.json         ← literais globais EN
    ├── geral.es.json         ← literais globais ES (opcional)
    ├── pedidos.pt.json       ← literais do módulo Pedidos PT-BR
    └── pedidos.en.json       ← literais do módulo Pedidos EN
```

---

## 2. Configuração em app.config.ts

```typescript
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PoI18nConfig, providePoI18n } from '@po-ui/ng-components';
import { ProtheusLibCoreModule } from '@totvs/protheus-lib-core';
import { routes } from './app.routes';

const i18nConfig: PoI18nConfig = {
  default: {
    language: 'pt',      // idioma padrão — sobrescrito por detectProtheusLanguage() em AppComponent
    context: 'geral',
    cache: true,         // mantém literais em memória após primeiro load
  },
  contexts: {
    geral: {
      pt: () => import('../i18n/geral.pt.json'),
      en: () => import('../i18n/geral.en.json'),
      es: () => import('../i18n/geral.es.json'),
    },
    pedidos: {
      pt: () => import('../i18n/pedidos.pt.json'),
      en: () => import('../i18n/pedidos.en.json'),
    },
    // Adicionar novos módulos aqui
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    importProvidersFrom(ProtheusLibCoreModule),
    providePoI18n(i18nConfig),
  ],
};
```

> **`cache: true`** — literais são carregadas do JSON apenas uma vez por sessão.
> Sem cache, cada `getLiterals()` faz um novo `import()` dinâmico.

---

## 3. Dicionários JSON

### src/i18n/geral.pt.json

```json
{
  "salvar":          "Salvar",
  "cancelar":        "Cancelar",
  "excluir":         "Excluir",
  "confirmar":       "Confirmar",
  "pesquisar":       "Pesquisar",
  "carregando":      "Carregando...",
  "semResultados":   "Nenhum registro encontrado.",
  "erroCarregar":    "Erro ao carregar os dados. Tente novamente.",
  "erroSalvar":      "Erro ao salvar. Verifique os dados e tente novamente.",
  "sucessoSalvar":   "Registro salvo com sucesso!",
  "sucessoExcluir":  "Registro excluído com sucesso!",
  "confirmExcluir":  "Confirmar exclusão?",
  "msgConfirmExcluir": "Esta ação não pode ser desfeita."
}
```

### src/i18n/geral.en.json

```json
{
  "salvar":          "Save",
  "cancelar":        "Cancel",
  "excluir":         "Delete",
  "confirmar":       "Confirm",
  "pesquisar":       "Search",
  "carregando":      "Loading...",
  "semResultados":   "No records found.",
  "erroCarregar":    "Error loading data. Please try again.",
  "erroSalvar":      "Save error. Please check the data and try again.",
  "sucessoSalvar":   "Record saved successfully!",
  "sucessoExcluir":  "Record deleted successfully!",
  "confirmExcluir":  "Confirm deletion?",
  "msgConfirmExcluir": "This action cannot be undone."
}
```

### src/i18n/geral.es.json

```json
{
  "salvar":          "Guardar",
  "cancelar":        "Cancelar",
  "excluir":         "Eliminar",
  "confirmar":       "Confirmar",
  "pesquisar":       "Buscar",
  "carregando":      "Cargando...",
  "semResultados":   "No se encontraron registros.",
  "erroCarregar":    "Error al cargar los datos. Intente nuevamente.",
  "erroSalvar":      "Error al guardar. Verifique los datos e intente nuevamente.",
  "sucessoSalvar":   "¡Registro guardado con éxito!",
  "sucessoExcluir":  "¡Registro eliminado con éxito!",
  "confirmExcluir":  "¿Confirmar eliminación?",
  "msgConfirmExcluir": "Esta acción no se puede deshacer."
}
```

### src/i18n/pedidos.pt.json (módulo específico)

```json
{
  "tituloPagina":    "Pedidos de Compra",
  "colCodigo":       "Código",
  "colFornecedor":   "Fornecedor",
  "colValor":        "Valor",
  "colEmissao":      "Data Emissão",
  "colStatus":       "Status",
  "statusAberto":    "Aberto",
  "statusFechado":   "Fechado",
  "statusCancelado": "Cancelado",
  "acaoAprovar":     "Aprovar",
  "acaoRejeitar":    "Rejeitar"
}
```

---

## 4. Detecção automática do idioma Protheus

O Protheus armazena a preferência de idioma do usuário. Detecte e aplique no `AppComponent`:

```typescript
import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PoI18nService, PoMenuModule, PoToolbarModule } from '@po-ui/ng-components';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly proConfig = inject(ProAppConfigService);
  private readonly i18n      = inject(PoI18nService);

  ngOnInit(): void {
    this.detectProtheusLanguage();
  }

  private detectProtheusLanguage(): void {
    const protheusLang = this.proConfig.getLanguage?.() ?? '';

    // Mapeamento Protheus → PoI18n (Protheus usa códigos como 'POR', 'ENG', 'SPA')
    const langMap: Record<string, string> = {
      'POR': 'pt',
      'ENG': 'en',
      'SPA': 'es',
    };

    const lang = langMap[protheusLang?.toUpperCase()] ?? 'pt';
    this.i18n.setLanguage(lang);
  }
}
```

> **`getLanguage()` pode não existir** em todas as versões de `ProAppConfigService`.
> Use optional chaining `?.` e defina `'pt'` como fallback.

---

## 5. Uso no componente (TypeScript)

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PoI18nService, PoNotificationService } from '@po-ui/ng-components';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosComponent implements OnInit {
  private readonly i18n         = inject(PoI18nService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  // Signal tipado para as literais do componente
  readonly lit = signal<{
    tituloPagina:  string;
    colCodigo:     string;
    colFornecedor: string;
    erroCarregar:  string;
    sucessoSalvar: string;
  }>({
    tituloPagina:  '',
    colCodigo:     '',
    colFornecedor: '',
    erroCarregar:  '',
    sucessoSalvar: '',
  });

  ngOnInit(): void {
    this.loadLiterals();
  }

  private loadLiterals(): void {
    this.i18n
      .getLiterals({ context: 'pedidos', literals: 'tituloPagina,colCodigo,colFornecedor' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(lit => this.lit.set(lit as typeof this.lit()));

    // Literais globais (geral) carregadas separadamente
    this.i18n
      .getLiterals({ context: 'geral', literals: 'erroCarregar,sucessoSalvar' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(lit => this.lit.update(prev => ({ ...prev, ...lit })));
  }

  // Usar literal na notificação
  onSaveSuccess(): void {
    this.notification.success(this.lit().sucessoSalvar);
  }

  onLoadError(): void {
    this.notification.error(this.lit().erroCarregar);
  }
}
```

---

## 6. Uso no template (HTML)

```html
<!-- Título da página via literal -->
<po-page-list [p-title]="lit().tituloPagina">

  <!-- Label de coluna via literal -->
  <!-- As colunas do po-table já usam o valor de label em PoTableColumn[] —
       definir as labels no ngOnInit() após carregar as literais: -->
  <!--
    this.columns = [
      { property: 'codigo',     label: this.lit().colCodigo     },
      { property: 'fornecedor', label: this.lit().colFornecedor },
    ];
    Recriar o array após lit() ser populado para forçar atualização no po-table.
  -->

  <!-- Busca rápida com placeholder traduzido -->
  <po-search
    [p-placeholder]="lit().pesquisar"
    (p-search-value)="onSearch($event)">
  </po-search>

</po-page-list>
```

> **Atenção com `PoTableColumn.label`**: `po-table` lê `label` na inicialização do componente.
> Se `getLiterals()` terminar depois do primeiro `detectChanges()`, o label ficará vazio.
> Estratégia: inicializar `columns` com labels provisórios (ex: string vazia), depois recriar
> o array `columns` dentro do `subscribe` de `getLiterals()` para forçar re-render.

---

## 7. Language switcher (troca de idioma em runtime)

```typescript
import { PoI18nService, PoSelectOption } from '@po-ui/ng-components';

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
export class LanguageSwitcherComponent {
  private readonly i18n = inject(PoI18nService);

  readonly languages: PoSelectOption[] = [
    { label: 'Português', value: 'pt' },
    { label: 'English',   value: 'en' },
    { label: 'Español',   value: 'es' },
  ];

  readonly currentLang = signal(this.i18n.getShortLanguage());

  onLanguageChange(lang: string): void {
    this.i18n.setLanguage(lang);
    this.currentLang.set(lang);
    // setLanguage() é global — todos os componentes que chamarem getLiterals() na próxima
    // vez receberão as literais no novo idioma.
    // Componentes já renderizados precisam recarregar manualmente (chamar loadLiterals() de novo).
  }
}
```

```html
<po-select
  p-label="Idioma"
  [p-options]="languages"
  [ngModel]="currentLang()"
  (ngModelChange)="onLanguageChange($event)">
</po-select>
```

> **`setLanguage()` não recarrega componentes automaticamente.** Cada componente precisa
> chamar `getLiterals()` novamente para obter as literais no novo idioma.
> Se o app suporta troca de idioma em runtime, estruture o `loadLiterals()` como método
> público e chame-o ao receber um evento de mudança de idioma.

---

## 8. Armadilhas comuns

### ❌ Literal não carregada no `ngOnInit` — label vazio no po-table

**Problema:** `columns` é definido antes de `getLiterals()` resolver.

```typescript
// ❌ Columns definidos antes das literais
ngOnInit(): void {
  this.columns = [{ property: 'codigo', label: this.lit().colCodigo }]; // '' aqui
  this.loadLiterals(); // literais chegam depois
}
```

**Fix:** Recriar `columns` dentro do subscribe:

```typescript
// ✅
ngOnInit(): void {
  this.i18n.getLiterals({ context: 'pedidos' })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(lit => {
      this.lit.set(lit as typeof this.lit());
      // Recriar o array para o po-table detectar a mudança
      this.columns = [
        { property: 'codigo',     label: lit['colCodigo']     },
        { property: 'fornecedor', label: lit['colFornecedor'] },
      ];
    });
}
```

---

### ❌ Literal não tipada — `Record<string, string>` não protege em runtime

```typescript
// ❌ Acesso sem garantia — pode ser undefined em runtime
this.notification.success(literals['sucessoSalvarrr']); // typo silencioso
```

**Fix:** Use o cast tipado via signal como mostrado na Seção 5 — TypeScript vai capturar o typo.

---

### ❌ Literal duplicada em múltiplos contextos

Se `'salvar'` existe em `geral.pt.json` e também em `pedidos.pt.json`, o `merge` do `getLiterals()` usa a última carregada. Definir literais genéricas **apenas** no contexto `geral` e sobrescrever apenas onde necessário.

---

### ❌ `setLanguage()` sem recarregar componentes ativos

Após `setLanguage()`, os componentes já montados não se atualizam. Se o app exige troca em runtime, emita um evento global (ex: via `Subject` num `LanguageService`) que todos os componentes assinam para chamar `loadLiterals()` novamente.

---

## 9. Integração com /review

O agente de code-review deve flagrar (como A11Y ou QUAL):

| ID | Regra |
|----|-------|
| I18N-001 | String PT-BR hardcoded em template quando `PoI18nService` está configurado no projeto (`providePoI18n` detectado em `app.config.ts`) — sugerir mover para dicionário `geral.pt.json` |
| I18N-002 | `PoNotificationService.success/error/warning` chamado com string literal em vez de `this.lit().chave` quando i18n está ativo |
| I18N-003 | `getLiterals()` sem `takeUntilDestroyed` — memory leak se o componente for destruído antes do Observable resolver |
