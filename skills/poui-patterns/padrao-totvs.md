# Padrão visual TOTVS para apps PO-UI no Protheus

Padrão **obrigatório** de tudo que o plugin gera (scaffold, generate, review). Tirado dos apps padrão
da TOTVS que rodam pelo `FwCallApp`: **Novo Gestor Financeiro (FINA710)** e **Análise de Crédito
Financeiro (FINAPP001)**, conferidos nos bundles extraídos em `protheus_data/http-root/app-root`
(PO-UI 21, `@totvs/po-theme` 21) em 2026-10-27. O objetivo é o app do cliente ficar igual às telas
nativas: mesma fonte, mesmos tamanhos, mesmo menu e mesmas tabelas.

## 1. Fonte e tamanhos — os do tema, sem sobrepor

| Item | Padrão TOTVS |
|---|---|
| Fonte | **NunitoSans** (vem do `@totvs/po-theme`; ícones `Animalia`) |
| Texto/campos/botões | `--font-size-default: 1rem` (16px) |
| Grade (`po-table`) | `--font-size-grid` = `--font-size-xs` (12px) |
| Altura de campos/botões | `--target-size-aaa: 2.75rem` (44px); `--target-size-aa: 2rem` só nos `p-size="small"` |
| Acessibilidade | AAA (padrão do tema). AA **só** se o app usar `p-size="small"` (exigência do PO-UI 21) |

**Proibido** no `src/styles.scss` (o lint acusa como **S01**):
- importar outra fonte (`@import url('https://fonts.googleapis.com/...Open+Sans...')`);
- `font-family` em `body`, `html`, `:root` ou `*`;
- sobrepor `--font-size-*`, `--font-family*` ou `--target-size-*` no `:root` (deixa o app menor/diferente das telas TOTVS).

Ordem de estilos no `angular.json` (como o `scaffold` gera):

```json
"styles": [
  "node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
  "node_modules/@totvs/po-theme/css/po-theme-default.min.css",
  "node_modules/@po-ui/style/css/po-theme-core.min.css",
  "src/styles.scss"
]
```

## 2. Shell — barra superior + menu lateral recolhido

```
┌──────────────────────────────────────────────────────────────────────────┐
│ (●) │ NOME DO APP - v1.0.0                              (usuário) [avatar] │  ← po-toolbar
├─────┼────────────────────────────────────────────────────────────────────┤
│ ⌂   │                                                                    │
│ ▤   │   conteúdo (router-outlet)                                         │
│ ▣   │                                                                    │
│ ⇥   │                                                                    │  ← po-menu recolhido (só ícones);
│ (›) │                                                                    │    passa o mouse → expande com os nomes
└─────┴────────────────────────────────────────────────────────────────────┘
```

- **`po-toolbar`**
  - `p-title` = `"<Nome do app> - v<versão>"`. O tema mostra em caixa alta ("NOME DO APP - V1.0.0").
    A versão vem de `src/app/app-version.ts` (`APP_VERSION`), atualizada a cada entrega.
  - `p-profile` = `{ title: displayName, subtitle: userName }`. Dentro do `FwCallApp` vem de
    `ProThreadInfoService.getUserInfoThread()` (`@totvs/protheus-lib-core`; chama
    `/api/framework/v1/users/<id>`). Assim como nos apps TOTVS, a barra mostra só o avatar; o nome
    aparece ao clicar. `avatar` sempre presente, com o **símbolo da marca do app**: TOTVS
    (`assets/logos/totvs-short-symbol.svg`) em produto TOTVS, como nos apps padrão; em
    **customização**, o símbolo do cliente, o mesmo arquivo do `p-short-logo` (ex.: `assets/logos/ffm.png`).
    - **Só chamar dentro do Protheus** (`insideProtheus()`) e dentro de `defer()`: fora dele não há
      token, e o serviço lança `TypeError ... 'access_token'` na hora, o que derruba o app no `ng serve`.
    - Sem usuário, a barra fica sem perfil.
  - `p-profile-actions` = `[{ icon: 'an an-sign-out', label: 'Sair', type: 'danger', separator: true, action }]`.
- **`po-menu`**
  - **Sem `p-filter`** (o FINA710 não mostra "Pesquisar" no menu).
  - `#poMenu`, `[p-collapsed]="true"` + `[p-automatic-toggle]="true"`: começa só com ícones,
    **expande ao passar o mouse** e recolhe ao sair, como no FINA710.
  - `p-logo` / `p-short-logo` com os logos TOTVS.
  - `poMenu.collapse()` a cada `NavigationEnd`.
  - Itens:
    - todo item tem `label` (nome completo, aparece expandido), `shortLabel` e `icon` **Animalia** (`an an-*`);
    - "Início"/"Home" (`an an-house-line`) primeiro, quando o app tiver tela inicial;
    - "Sair" (`an an-sign-out`) por último;
    - nada de `po-icon-*` (ícones antigos).
- **Logos.** Vêm do `@totvs/common-assets` (peer dependency da `protheus-lib-core` — instalar junto), copiados pelo
  `angular.json` (em `build` **e** `test`):

  ```json
  "assets": [
    { "glob": "**/*", "input": "public" },
    { "glob": "totvs*.svg", "input": "node_modules/@totvs/common-assets/common-assets/logos/totvs", "output": "assets/logos" }
  ]
  ```

  `p-logo="assets/logos/totvs.svg"` (expandido) e `p-short-logo="assets/logos/totvs-short-symbol.svg"`
  (recolhido).
- **Logo do cliente (customização).** Quando o app é uma customização para um cliente, o logo do
  cliente substitui o TOTVS no menu, com o **mesmo efeito**:
  - menu aberto: logo com o nome (`p-logo`);
  - menu recolhido: só o símbolo (`p-short-logo`).

  Como fazer:
  - **Avatar do perfil:** o símbolo do cliente também (constante `AVATAR_CLIENTE` no `app.ts`).
  - **Arquivos:** os dois ficam em `public/assets/logos/` (ex.: `cliente-nome.png` e `cliente.png`), já
    copiados pelo glob `public` do `angular.json`, mais `p-logo-alt="<Cliente>"`.
  - **Fundo transparente:** logo com fundo opaco (comum em imagem colada num documento) fica como um
    retângulo cinza no menu. Remova o fundo e corte as bordas antes de usar.
  - **Tamanho:** o logo aberto ocupa até ~256 px de largura; um logo horizontal de ~280×100 px fica
    legível.
  - **Origem:** pedir os logos ao usuário (arquivo ou imagem num documento) e nunca inventar.

  Validado com a FFM no RCA em 27/10/2026.

### app-version.ts

```typescript
/** Versão exibida na barra do app ("Nome - vX.Y.Z"). Atualizar a cada entrega. */
export const APP_VERSION = '1.0.0';
```

### app.html

```html
<div class="po-wrapper">
  <po-toolbar
    [p-title]="titulo"
    [p-profile]="perfil()"
    [p-profile-actions]="acoesPerfil">
  </po-toolbar>
  <po-menu
    #poMenu
    [p-menus]="menus"
    [p-collapsed]="true"
    [p-automatic-toggle]="true"
    p-logo="assets/logos/totvs.svg"
    p-short-logo="assets/logos/totvs-short-symbol.svg">
  </po-menu>
  <div class="container-fluid">
    <router-outlet></router-outlet>
  </div>
</div>
```

### app.ts

```typescript
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { defer, filter } from 'rxjs';
import {
  PoMenuComponent,
  PoMenuItem,
  PoMenuModule,
  PoToolbarAction,
  PoToolbarModule,
  PoToolbarProfile,
} from '@po-ui/ng-components';
import { ProAppConfigService, ProThreadInfoService } from '@totvs/protheus-lib-core';
import { APP_VERSION } from './app-version';

/** Avatar do perfil na barra: símbolo TOTVS, como nos apps padrão (FINA710/FINAPP001). */
export const AVATAR_TOTVS = 'assets/logos/totvs-short-symbol.svg';

/** Perfil da barra: sempre com o avatar TOTVS; nome/login do usuário logado quando houver. */
export function montarPerfil(info: { displayName?: string; userName?: string } | undefined): PoToolbarProfile {
  const title = info?.displayName?.trim() || info?.userName?.trim() || '';
  return { avatar: AVATAR_TOTVS, title, subtitle: info?.userName?.trim() ?? '' };
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly proAppConfigService = inject(ProAppConfigService);
  private readonly poMenu = viewChild.required<PoMenuComponent>('poMenu');

  readonly titulo = `Nome do App - v${APP_VERSION}`;
  readonly perfil = signal<PoToolbarProfile>(montarPerfil(undefined));
  readonly acoesPerfil: PoToolbarAction[] = [
    { icon: 'an an-sign-out', label: 'Sair', type: 'danger', separator: true, action: () => this.closeApp() },
  ];
  readonly menus: PoMenuItem[] = [
    // { label: 'Pedidos', shortLabel: 'Pedidos', icon: 'an an-list-checks', link: '/pedidos' },
    { label: 'Sair', shortLabel: 'Sair', icon: 'an an-sign-out', action: () => this.closeApp() },
  ];

  constructor() {
    if (!this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.loadAppConfig();
    }
    // usuário da thread do FwCallApp; fora do Protheus não há token e o serviço lança erro na hora
    const threadInfo = inject(ProThreadInfoService);
    if (this.proAppConfigService.insideProtheus()) {
      defer(() => threadInfo.getUserInfoThread())
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (info) => this.perfil.set(montarPerfil(info)),
          error: () => this.perfil.set(montarPerfil(undefined)),
        });
    }
  }

  ngAfterViewInit(): void {
    // padrão TOTVS: o menu volta a recolher depois de escolher uma opção
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.poMenu().collapse());
  }

  private closeApp(): void {
    if (this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.callAppClose();
    }
  }
}
```

> Teste unitário: prover `ProThreadInfoService` com `{ getUserInfoThread: () => of({...}) }` e
> `ProAppConfigService` com `insideProtheus: () => true`; chamar `fixture.detectChanges()` antes de
> destruir (senão o `po-menu` erra no cleanup).

## 3. Tabelas (`po-table`)

Como "Meus Clientes" (FINAPP001):

```html
<po-table
  [p-columns]="colunas"
  [p-items]="itens()"
  [p-striped]="true"
  [p-sort]="true"
  [p-loading]="carregando()">
</po-table>
```

- **Colunas curtas com `width` fixo** (ex.: `'100px'`). Quando o rótulo não cabe, a `po-table` mostra
  reticências no cabeçalho ("Finance...") e o nome inteiro num tooltip ao passar o mouse (nativo).
  Em grade com campos editáveis, `[p-height]` volta a ser necessário para o `width` valer (Quirk #12).
- **Situação em texto** (Ativo/Bloqueado): `type: 'label'` com `labels`, que vira uma tag colorida.
- **Legenda por cor** (bolinha): `type: 'subtitle'` com `subtitles`. A `po-table` desenha a bolinha na
  célula e a **legenda no rodapé da tabela**, sozinha. Não criar coluna `cellTemplate` com bolinha
  nem modal/botão "Legenda".
- **Cores.** Só tokens do tema, nunca hexadecimal. Equivalência com as legendas do Protheus
  (`BR_*`) usada pela TOTVS:

  | Protheus | Token | Cor |
  |---|---|---|
  | `BR_VERDE` (ok/ativo) | `color-10` (a TOTVS também usa `color-11` na legenda) | #56b96b (#00b28e) |
  | `BR_VERMELHO` (erro/bloqueado) | `color-07` | #c64840 |
  | `BR_LARANJA` | `color-08` | #ea9b3e |
  | `BR_AMARELO` (pendente) | `caption-tag-08` | #ffb900 |
  | `BR_AZUL` | `color-02` | #2c85c8 |
  | `BR_CINZA` / `BR_PRETO` (encerrado) | `caption-tag-33` | #62748e |

  Para repetir a mesma cor fora da tabela (ex.: bolinha no `po-combo` do filtro, padrão em
  `skills/poui-components/form-fields.md`), usar a classe do tema `po-color-NN` no `<span>`, em vez
  de `background-color` fixo (`caption-tag-NN` → classe `po-caption-tag-NN`).

```typescript
readonly colunas: PoTableColumn[] = [
  {
    property: 'situacao', label: 'Situação', type: 'subtitle', width: '100px', sortable: false,
    subtitles: [
      { value: 'ok', color: 'color-11', label: 'Sem títulos em aberto', content: '' },
      { value: 'aberto', color: 'color-08', label: 'Com título(s) em aberto', content: '' },
      { value: 'vencido', color: 'color-07', label: 'Com título(s) vencido(s)', content: '' },
    ],
  },
  {
    property: 'status', label: 'Status', type: 'label', width: '100px',
    labels: [
      { value: '2', color: 'color-10', label: 'Ativo' },
      { value: '1', color: 'color-07', label: 'Bloqueado' },
    ],
  },
  { property: 'codigo', label: 'Código', width: '120px' },
  { property: 'nome', label: 'Nome' },
];
```

## 4. Carregando — `po-loading-overlay`

Como os apps TOTVS (FINAPP001 e FINA710): enquanto algo carrega, aparece o **overlay "Carregando"**
(fundo escurecido e caixa branca com o spinner, texto padrão do componente; não passar `p-text`).

| Situação | Como |
|---|---|
| Carga inicial, pesquisa ou filtro de uma lista | `@if (loading()) { <po-loading-overlay [p-screen-lock]="false" /> }` dentro do `po-page-list` (cobre a página, não a tela toda) |
| "Carregar mais" da tabela | o **mesmo** overlay (`loading()`), como nas telas TOTVS |
| Ação na linha (reprocessar, excluir) e gravação | o mesmo overlay do `loading()` |
| Formulário (abrir/salvar) | `<po-loading-overlay [p-screen-lock]="true" />` |
| Troca de tela (rota lazy) | no shell: `navegando` = `true` em `NavigationStart` e `false` em `NavigationEnd`/`NavigationCancel`/`NavigationError`; `@if (navegando()) { <po-loading-overlay /> }` |

Não usar o `[p-loading]` da `po-table` como indicador principal: ele só mostra um spinner dentro da
grade, diferente das telas TOTVS.

## 5. Checklist para gerar, revisar ou fazer lint

- [ ] `styles.scss` sem fonte própria e sem sobrepor tokens de tamanho (lint **S01**).
- [ ] `po-menu` com `[p-collapsed]="true"`, `[p-automatic-toggle]="true"` e logo TOTVS (lint **H09**); itens com `label` + `shortLabel` + `an an-*`.
- [ ] `po-toolbar` com "Nome - vVersão" e o usuário no perfil.
- [ ] Legenda por cor com `type: 'subtitle'` (rodapé nativo); situação em texto com `type: 'label'`; só tokens de cor.
- [ ] `po-table` com `[p-striped]` e `[p-sort]` (e `[p-height]` em componente OnPush — lint H05); colunas curtas com `width`.
- [ ] `po-combo` ligado a valor com `[p-remove-initial-filter]="true"` (lint **H08**).
- [ ] Carregamento com `po-loading-overlay` (lista, "carregar mais", ação, formulário e troca de tela).
