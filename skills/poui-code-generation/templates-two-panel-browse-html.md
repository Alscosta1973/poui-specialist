# Template: two-panel-browse — HTML, SCSS, model

> Sub-arquivo de `templates-two-panel-browse.md`. Use este arquivo ao gerar `.component.html`, `.component.scss` ou interfaces de modelo.
> Use `templates-two-panel-browse-ts.md` para `.component.ts`.

---

## {{kebab-name}}.component.html

```html
<po-page-default p-title="{{PageTitle}}">

  <!-- Cabeçalho: campos de filtro + botões de ação -->
  <!-- NOTA DE ALINHAMENTO: po-input reserva 8px abaixo do campo para mensagens de erro.
       .header-botoes precisa de margin-bottom:8px para que os botões alinhem com o campo,
       e não com o espaço invisível abaixo dele. Veja o SCSS. -->
  <div class="div-header">
    <div class="header-filtros">
      <po-input
        name="filtro1"
        p-label="Filtro 1"
        [p-maxlength]="10"
        [(ngModel)]="filtro1"
        class="input-f1">
      </po-input>
      <po-input
        name="filtro2"
        p-label="Filtro 2"
        [p-maxlength]="10"
        [(ngModel)]="filtro2"
        class="input-f2">
      </po-input>
      <po-button
        p-label="Carregar"
        p-kind="primary"
        p-icon="po-icon-search"
        (p-click)="carregar()">
      </po-button>
    </div>
    <div class="header-botoes">
      <po-button
        p-label="Confirmar"
        p-kind="primary"
        p-icon="po-icon-ok"
        [p-disabled]="!selectedLeft() || !selectedRight()"
        (p-click)="confirmar()">
      </po-button>
      <po-button
        p-label="Cancelar"
        p-kind="tertiary"
        p-icon="po-icon-close"
        (p-click)="cancelar()">
      </po-button>
    </div>
  </div>

  <!-- Barra de status contextual — aparece apenas quando uma linha esquerda está selecionada -->
  @if (selectedLeft()) {
    <div class="div-status-sel">
      <span class="sel-info">
        Selecionado: <strong>{{ selectedLeft()!['id'] }}</strong>
      </span>
      @if (!selectedRight()) {
        <span class="sel-seta">→ Selecione o registro correspondente à direita</span>
      }
      @if (selectedRight()) {
        <span class="sel-seta">✓ Pronto — clique em Confirmar</span>
      }
    </div>
  }

  <!-- Dois painéis de browse lado a lado -->
  <div class="div-browses">

    <!-- Browse esquerdo -->
    <div class="browse-panel browse-panel-left" (click)="onPanelLeftClick()">
      <div class="browse-titulo" [class.browse-titulo-ativo]="activeBrowse() === 'left'">
        <span class="browse-nome">{{LeftPanelTitle}}</span>
        <span class="browse-count">{{ leftItems().length }} reg. &nbsp;·&nbsp; Tab ↔ ↑↓</span>
      </div>
      <po-table
        [p-columns]="colunasLeft"
        [p-items]="leftItems()"
        [p-selectable]="true"
        [p-selectable-entire-line]="false"
        [p-loading]="loading()"
        [p-height]="browseHeight()"
        [p-virtual-scroll]="false"
        [p-hide-action-fixed-columns]="true"
        (p-selected)="onSelectLeft($event)"
        (p-unselected)="onUnselectLeft($event)"
        (p-all-selected)="onAllSelectedLeft()"
        (p-all-unselected)="selectedLeft.set(null)">

        <ng-template p-table-column-template [p-property]="'status'" let-value>
          <span [class]="'status-dot status-dot-' + value" [title]="statusLabel(value)"></span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'valor'" let-value>
          <span class="valor-num">{{ fmtVal(value) }}</span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'taxa'" let-value>
          <span class="valor-num valor-taxa">{{ fmtVal(value) }}</span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'liquido'" let-value>
          <span class="valor-num">{{ fmtVal(value) }}</span>
        </ng-template>
      </po-table>
    </div>

    <!-- Browse direito -->
    <div class="browse-panel browse-panel-right" (click)="onPanelRightClick()">
      <div class="browse-titulo" [class.browse-titulo-ativo]="activeBrowse() === 'right'">
        <span class="browse-nome">{{RightPanelTitle}}</span>
        <span class="browse-count">{{ rightItems().length }} reg.</span>
      </div>
      <po-table
        [p-columns]="colunasRight"
        [p-items]="rightItems()"
        [p-selectable]="true"
        [p-selectable-entire-line]="false"
        [p-loading]="loading()"
        [p-height]="browseHeight()"
        [p-virtual-scroll]="false"
        [p-hide-action-fixed-columns]="true"
        (p-selected)="onSelectRight($event)"
        (p-unselected)="onUnselectRight($event)"
        (p-all-selected)="onAllSelectedRight()"
        (p-all-unselected)="selectedRight.set(null)">

        <ng-template p-table-column-template [p-property]="'status'" let-value>
          <span [class]="'status-dot status-dot-' + value" [title]="statusLabel(value)"></span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'valor'" let-value>
          <span class="valor-num">{{ fmtVal(value) }}</span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'taxa'" let-value>
          <span class="valor-num valor-taxa">{{ fmtVal(value) }}</span>
        </ng-template>
        <ng-template p-table-column-template [p-property]="'liquido'" let-value>
          <span class="valor-num">{{ fmtVal(value) }}</span>
        </ng-template>
      </po-table>
    </div>

  </div>

  <!-- Legenda de status -->
  <div class="div-legenda">
    <!-- TODO: adjust to your domain status codes -->
    <span class="legenda-item"><span class="status-dot status-dot-1"></span> Não Processado</span>
    <span class="legenda-item"><span class="status-dot status-dot-2"></span> Processado</span>
    <span class="legenda-item"><span class="status-dot status-dot-3"></span> Com Erro</span>
  </div>

  <!-- Totais do rodapé -->
  <div class="div-totais">
    <div class="total-item">
      <span class="total-label">Total:</span>
      <span class="total-valor">{{ fmtVal(leftItems().reduce((s, r) => s + r['valor'], 0)) }}</span>
    </div>
  </div>

</po-page-default>
```

---

## {{kebab-name}}.component.scss

```scss
:host {
  display: block;
  font-size: 12px;
}

// ── Cabeçalho: campos de filtro + botões de ação
.div-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;

  .header-filtros {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-wrap: wrap;

    .input-f1 { width: 100px; }
    .input-f2 { width: 100px; }

    // po-button dentro de flex container com align-items:flex-end precisa de margin-bottom:8px
    // pois po-input reserva 8px abaixo do campo visível para mensagens de erro.
    // Sem isso, o botão fica 8px mais baixo que o campo.
    po-button { margin-bottom: 8px; }
  }

  .header-botoes {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    // Mesma correção de 8px para os botões do lado direito
    margin-bottom: 8px;
  }
}

// ── Barra de status contextual (visível quando linha esquerda está selecionada)
.div-status-sel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 10px;
  background: #e3f2fd;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 11px;
  border-left: 3px solid #1565c0;

  .sel-seta {
    color: #1565c0;
    font-style: italic;
    margin-left: auto;
  }
}

// ── Dois painéis de browse lado a lado
// gap: 4px (não 8px) para maximizar a largura do painel e evitar scroll horizontal
.div-browses {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.browse-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  // Oculta o ícone de gerenciar colunas (controlado por botão dedicado se necessário)
  ::ng-deep .po-table-actions-column-manager {
    display: none;
  }

  // Reduz coluna de checkbox interna de 56px para ~41px
  // po-table-column-selectable é a coluna interna do PO-UI; não controlável via p-width
  ::ng-deep .po-table-column-selectable {
    width: 41px !important;
    min-width: 41px !important;
    max-width: 41px !important;
  }

  // Linhas compactas
  ::ng-deep tbody td {
    padding-top: 3px !important;
    padding-bottom: 3px !important;
  }

  ::ng-deep .po-table-body-ellipsis,
  ::ng-deep .po-table-header-ellipsis {
    font-size: 11px;
  }

  // Destaque de linha na navegação por teclado (definido via classList no componente)
  ::ng-deep .row-ativa td { background-color: #dbeafe !important; }

  // Remove todos os rings de foco do browser — evita o artefato de contorno azul que
  // aparece no po-table-container-overflow ao clicar ou rolar a tabela.
  ::ng-deep *:focus,
  ::ng-deep *:focus-visible {
    outline:    none !important;
    box-shadow: none !important;
  }
}

.browse-titulo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  background: #f0f4f8;
  border: 1px solid #d0d7de;
  border-bottom: none;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  // Indicador de painel ativo: borda superior de 2px muda de cor (mesmo padrão do stacked-browse).
  // Usar border-top-color evita o artefato de scroll causado por outline no container da tabela.
  border-top: 2px solid var(--color-neutral-light-10, #e0e0e0);
  transition: border-top-color 0.1s;

  .browse-nome  { font-size: 12px; font-weight: 700; color: #333; }
  .browse-count { font-size: 10px; color: #777; }
}

.browse-titulo-ativo {
  border-top-color: var(--color-action-default, #0079c3) !important;
}

// ── Ponto de status (círculo colorido na coluna St.)
.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  vertical-align: middle;
  flex-shrink: 0;
}

// TODO: ajuste as cores conforme os códigos de status do seu domínio
.status-dot-1 { background-color: #1565c0; }  // Não Processado — azul
.status-dot-2 { background-color: #2e7d32; }  // Processado — verde
.status-dot-3 { background-color: #c62828; }  // Com Erro — vermelho

// ── Valores monetários (alinhados à direita, coloridos)
.valor-num  { display: block; text-align: right; font-size: 11px; font-weight: 600; color: #1565c0; }
.valor-taxa { color: #d32f2f; }

// ── Legenda de status
.div-legenda {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 5px 10px;
  background: #f5f6fa;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 2px;
  flex-wrap: wrap;

  .legenda-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: #555;
    white-space: nowrap;
  }
}

// ── Totais do rodapé
.div-totais {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 7px 12px;
  background: #fff;
  border-top: 2px solid #e0e0e0;

  .total-item  { display: flex; align-items: center; gap: 8px; }
  .total-label { font-size: 11px; font-weight: 700; color: #555; white-space: nowrap; }
  .total-valor { font-size: 14px; font-weight: 700; color: #1565c0; font-family: monospace; min-width: 110px; text-align: right; }
}
```

---

## Prevenção de scroll horizontal — cálculo de largura de colunas

> **Este é o erro mais comum ao construir telas de dois painéis.**
> Cada painel de browse precisa ter `tableWidth === panelWidth`. Se `tableWidth > panelWidth`, o po-table exibe uma barra de rolagem horizontal.

### Fórmula

```
largura_painel = (viewport_width - largura_sidebar - padding_pagina - gap_entre_paineis) / 2
largura_checkbox = 41px  (após override com ::ng-deep; padrão po-table é 56px)
orçamento_colunas_dados = largura_painel - largura_checkbox
```

Valores típicos com viewport de 1366px:
- Sidebar: 280px
- Padding do conteúdo po-page-default: 32px (16px de cada lado)
- Gap entre painéis: 4px (use gap:4px em .div-browses, não 8px)
- Por painel: (1366 - 280 - 32 - 4) / 2 = **525px** (renderizado real ~520px — meça com Playwright)

### Verificação com Playwright

```javascript
// Execute após o carregamento da página para verificar overflow
const r = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.browse-panel')).map(p => {
    const pr = p.getBoundingClientRect();
    const tr = p.querySelector('table')?.getBoundingClientRect();
    return { panelW: Math.round(pr.width), tableW: Math.round(tr?.width ?? 0), overflow: Math.round((tr?.width ?? 0) - pr.width) };
  })
);
// overflow deve ser 0 nos dois painéis
```

### Referência de dimensionamento de colunas

Com **fonte 11px** e **8px de padding horizontal por célula** (16px no total por célula), área mínima visível = `largura_coluna - 16px`.

| Tipo de conteúdo | Conteúdo típico | Col. mín. |
|---|---|---|
| Data `dd/MM/yyyy` | "10/01/2025" (65px texto) | 84px |
| Monetário | "3.200,00" (48px texto) | 68px |
| Código curto | "NF001" (30px texto) | 50px |
| Código médio | "PED001" (36px texto) | 58px |
| Ponto de status | círculo 10px | 28px |
| Parcela "001" | 18px texto | 36px |

---

## models/{{modelFile}}.model.ts

```typescript
export interface {{LeftModel}} {
  id: string;
  status: string;    // '1' = não processado, '2' = processado, '3' = com erro
  data: string;      // data ISO yyyy-MM-dd
  titulo: string;
  pedido: string;
  parcela: string;
  valor: number;
  taxa: number;
  liquido: number;
}

export interface {{RightModel}} {
  id: string;
  status: string;
  pedido: string;
  emissao: string;   // data ISO yyyy-MM-dd
  titulo: string;
  parcela: string;
  valor: number;
  taxa: number;
  liquido: number;
}

export interface {{ConfirmRequest}} {
  leftId: string;
  rightId: string;
}
```
