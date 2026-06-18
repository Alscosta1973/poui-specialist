# Template: stacked-browse

Gera uma tela master-detail com **dois componentes po-table empilhados**:
- Browse superior (master): o usuário navega pelas linhas com ArrowUp/Down; selecionar uma linha carrega seus itens no browse de detalhe abaixo.
- Browse inferior (detail): exibe os itens da linha master selecionada; suporta multi-seleção via checkboxes.
- Tecla Tab alterna o foco do teclado entre os dois browses.
- Barra de filtros compacta com "Remover Filtro" sempre visível no cabeçalho do master.

Casos de uso: SC5/SC6 (pedidos + itens), linhas de nota fiscal, entradas de estoque, qualquer master-detail ERP onde ambos os níveis precisam de navegação independente pelo teclado.

> Use `two-panel-browse` para conciliação/correspondência lado a lado.
> Use `master-detail` para linhas expansíveis inline (sem browse de detalhe separado).

---

## Padrões principais

| Padrão | Implementação |
|---|---|
| Indicador de browse ativo | `border-top-color` em `.browse-cabecalho` — nunca `outline` (outline cria artefato de scroll na borda inferior do browse) |
| Navegação pelo teclado | `@HostListener('window:keydown')` direciona ArrowUp/Down para o browse ativo; Tab alterna o browse |
| Sincronização de scroll | `_scrollRowIntoView()` percorre o DOM para encontrar o ancestral scrollável real; chamadores usam `setTimeout(..., 50)` e NÃO 0ms |
| Sem scroll na página | Signals computados `masterHeight` + `detailHeight` usando `_winH() - OFFSET` |
| Supressão de foco visual | `::ng-deep *:focus, ::ng-deep *:focus-visible { outline: none }` dentro de cada container de browse |
| Barra de filtros compacta | Variável CSS `--font-size: 12px` em `.filtros-bar` cascateia para todos os filhos PO-UI |
| Remover Filtro | Sempre renderizado + sempre vermelho; cursor e sublinhado-hover apenas quando `isFiltrado()` é verdadeiro |
| Dados de demonstração | `const DEMO_*` no topo do arquivo do componente; carregado no callback `error` da chamada do service |

---

## Como carregar os sub-arquivos

| O que você está gerando | Arquivo a carregar |
|---|---|
| Apenas `.component.ts` | `templates-stacked-browse-ts.md` |
| Apenas `.component.html` + `.component.scss` | `templates-stacked-browse-html.md` |
| Interfaces do modelo | `templates-stacked-browse-html.md` (contém a seção do modelo) |
| Todos os artefatos | Carregue ambos os sub-arquivos |
