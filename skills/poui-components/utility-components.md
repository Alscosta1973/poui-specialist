# PO-UI Utility Components

## po-loading-overlay

Sobreposição de carregamento com texto — bloqueia a UI durante operações assíncronas.
Controlado com `@if (loading())` no template.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-text` | `string` | Texto exibido abaixo do spinner |
| `p-screen-lock` | `boolean` | Bloqueia a tela inteira em vez de apenas o componente pai |

### Exemplos

```typescript
import { PoLoadingModule } from '@po-ui/ng-components';
// em imports do @Component: [PoLoadingModule]

readonly loading = signal(false);
readonly saving  = signal(false);
```

```html
<!-- Bloqueia o conteúdo do componente pai (uso padrão em page-list/page-edit) -->
@if (loading()) {
  <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
}

<!-- Bloqueia a tela inteira durante um save -->
@if (saving()) {
  <po-loading-overlay p-text="Salvando registro..." [p-screen-lock]="true"></po-loading-overlay>
}
```

> **Posicionamento:** O `po-loading-overlay` cobre o elemento pai mais próximo com
> `position: relative`. Os componentes `po-page-*` já aplicam isso automaticamente.
> Para sobrepor um `div` customizado, adicione `style="position: relative"` nele.

---

## po-widget

Card de KPI para dashboards — exibe título, conteúdo livre e ações opcionais.
Usado no template `dashboard` do plugin com classes de grid responsivo.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título do card |
| `p-help` | `string` | Texto do tooltip do ícone de ajuda (?) |
| `p-type` | `'normal' \| 'danger' \| 'info' \| 'success' \| 'warning'` | Variante de cor do header (default `'normal'`) |
| `p-primary-label` | `string` | Rótulo do botão primário |
| `p-secondary-label` | `string` | Rótulo do botão secundário |
| `p-disabled` | `boolean` | Desabilita as ações do card |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-primary-action)` | `void` | Clique no botão primário |
| `(p-secondary-action)` | `void` | Clique no botão secundário |

### Exemplos

```typescript
import { PoWidgetModule } from '@po-ui/ng-components';
// em imports do @Component: [PoWidgetModule]
```

```html
<!-- KPI simples com valor grande -->
<div class="po-row">
  <po-widget class="po-md-12 po-lg-4 po-mt-2"
             p-title="Pedidos Pendentes"
             p-type="warning"
             p-help="Total de pedidos aguardando aprovação nas últimas 24h">
    <div class="po-font-display po-text-center">{{ pedidosPendentes() }}</div>
    <div class="po-text-center po-font-text-small">últimas 24h</div>
  </po-widget>

  <po-widget class="po-md-12 po-lg-4 po-mt-2"
             p-title="Faturamento do Mês"
             p-type="success">
    <div class="po-font-title po-text-center">
      {{ faturamentoMes() | currency:'BRL':'symbol':'1.2-2' }}
    </div>
  </po-widget>

  <!-- Widget com ação -->
  <po-widget
    class="po-md-12 po-lg-4 po-mt-2"
    p-title="Tarefas Vencidas"
    p-type="danger"
    p-primary-label="Ver todas"
    (p-primary-action)="router.navigate(['/tarefas/vencidas'])">
    <div class="po-font-display po-text-center">{{ tarefasVencidas() }}</div>
  </po-widget>
</div>
```

### Classes de grid responsivo para po-widget

```html
<!-- 3 widgets em linha no desktop, empilhados no mobile -->
<po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="KPI 1">...</po-widget>
<po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="KPI 2">...</po-widget>
<po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="KPI 3">...</po-widget>

<!-- 4 widgets em linha no desktop -->
<po-widget class="po-md-6 po-lg-3 po-mt-2" p-title="KPI 1">...</po-widget>
<po-widget class="po-md-6 po-lg-3 po-mt-2" p-title="KPI 2">...</po-widget>
<po-widget class="po-md-6 po-lg-3 po-mt-2" p-title="KPI 3">...</po-widget>
<po-widget class="po-md-6 po-lg-3 po-mt-2" p-title="KPI 4">...</po-widget>
```

---

## po-avatar

Exibe imagem circular de perfil com fallback para iniciais quando a imagem não carrega.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-src` | `string` | URL da imagem de perfil |
| `p-size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'xxl'` | Tamanho do avatar (default `'md'`) |
| `p-loading` | `'eager' \| 'lazy'` | Estratégia de carregamento da imagem (default `'eager'`) |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-click)` | `void` | Clique no avatar |

### Exemplos

```typescript
import { PoAvatarModule } from '@po-ui/ng-components';
// em imports do @Component: [PoAvatarModule]
```

```html
<!-- Avatar do usuário logado com clique para perfil -->
<po-avatar
  [p-src]="currentUser().fotoUrl"
  p-size="lg"
  (p-click)="router.navigate(['/perfil'])">
</po-avatar>

<!-- Avatares em lista de contatos -->
@for (contato of contatos(); track contato.id) {
  <div class="po-row po-align-items-center po-mb-1">
    <po-avatar [p-src]="contato.fotoUrl" p-size="sm" p-loading="lazy"></po-avatar>
    <div class="po-ml-1">
      <div class="po-font-text">{{ contato.nome }}</div>
      <div class="po-font-text-small">{{ contato.cargo }}</div>
    </div>
  </div>
}
```

---

## po-badge

Contador numérico ou indicador de estado visual sobreposto a qualquer elemento.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-value` | `number` | Número exibido — exibe `"9+"` automaticamente acima de 9 |
| `p-status` | `'positive' \| 'negative' \| 'warning' \| 'info' \| 'disabled'` | Variante semântica de cor |
| `p-color` | `string` | Token de cor customizado (substitui `p-status`) |
| `p-size` | `'small' \| 'medium' \| 'large'` | Tamanho (default `'medium'`) |

### Exemplos

```typescript
import { PoBadgeModule } from '@po-ui/ng-components';
// em imports do @Component: [PoBadgeModule]
```

```html
<!-- Badge sobre ícone de notificação -->
<div class="po-relative po-d-inline-block">
  <span class="po-icon po-icon-notification po-font-subtitle"></span>
  <po-badge [p-value]="notificacoesCount()" p-status="negative"></po-badge>
</div>

<!-- Badges de status em painel de saúde do sistema -->
<div class="po-row po-align-items-center">
  <span class="po-mr-1">Erros:</span>
  <po-badge [p-value]="errosCount()"   p-status="negative" p-size="small"></po-badge>

  <span class="po-ml-2 po-mr-1">Alertas:</span>
  <po-badge [p-value]="alertasCount()" p-status="warning"  p-size="small"></po-badge>

  <span class="po-ml-2 po-mr-1">OK:</span>
  <po-badge [p-value]="okCount()"      p-status="positive" p-size="small"></po-badge>
</div>
```

> **po-badge vs po-tag:** Use `po-badge` para contadores numéricos sobrepostos a ícones
> ou como indicadores de quantidade. Use `po-tag` para rótulos textuais de status em
> listas e tabelas.
