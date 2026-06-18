# Template: two-panel-browse

Gera uma **tela de conciliação lado a lado** com dois painéis `po-table` independentes.
O usuário seleciona uma linha no painel esquerdo e uma no direito, e então confirma
uma ação de emparelhamento (conciliação de cartão, correspondência de documentos, conciliação de contas a receber).

Casos de uso: conciliação de cartão, correspondência de contas a pagar/receber, emparelhamento de documentos.

> **Antes de usar este template**, leia a regra de largura de colunas em `templates-two-panel-browse-html.md` (seção de prevenção de scroll horizontal). Não calcular as larguras causará scroll horizontal em ambos os painéis.
> Use `stacked-browse` para tabelas master-detail empilhadas verticalmente com navegação pelo teclado.
> Use `master-detail` para linhas expansíveis inline dentro de uma única tabela.

---

## Padrões principais

| Padrão | Implementação |
|---|---|
| Altura dinâmica (sem scroll na página) | `browseHeight = computed(() => Math.max(180, winH() - OFFSET))` |
| Sem scroll horizontal | Soma de todos os valores de `p-width` (incluindo checkbox 41px) deve ser igual à largura do painel |
| Seleção única por browse | Em `(p-selected)`, limpe a seleção anterior via `items.update(...)` |
| Validação cruzada entre browses | O painel esquerdo deve estar selecionado antes do direito; valide em `(p-selected)` do browse direito |
| Alinhamento do botão com po-input | `.header-botoes { margin-bottom: 8px }` — cancela o espaço interno de erro de 8px do po-input |
| Largura da coluna checkbox | Substitua com `::ng-deep .po-table-column-selectable { width: 41px !important }` |
| Navegação pelo teclado | `@HostListener('window:keydown')` direciona ArrowUp/Down para o painel ativo; Tab alterna o painel |
| Sincronização de scroll | `_scrollRowIntoView()` percorre o DOM para o ancestral scrollável real; chamadores usam `setTimeout(..., 50)` |
| Supressão de foco visual | `::ng-deep *:focus, *:focus-visible { outline: none }` — previne artefato de scroll na borda do browse |
| Indicador de painel ativo | `border-top-color` em `.browse-titulo` — nunca `outline` no po-table-container |

---

## Como carregar os sub-arquivos

| O que você está gerando | Arquivo a carregar |
|---|---|
| Apenas `.component.ts` | `templates-two-panel-browse-ts.md` |
| Apenas `.component.html` + `.component.scss` | `templates-two-panel-browse-html.md` |
| Cálculo de largura de colunas | `templates-two-panel-browse-html.md` (contém tabela de referência de larguras) |
| Interfaces do modelo | `templates-two-panel-browse-html.md` (contém a seção do modelo) |
| Todos os artefatos | Carregue ambos os sub-arquivos |
