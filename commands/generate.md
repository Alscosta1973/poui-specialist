---
description: Generate PO-UI Angular 17+ components, services and modules for Protheus REST integration
allowed-tools: Read, Write, Glob, Grep, Skill, Agent, Bash, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__plugin_playwright_playwright__browser_wait_for
argument-hint: "<type> <Name> [--module <module>] [--dry-run] [--skip-build]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:generate

Generates standalone Angular 17+ artifacts using PO-UI components, integrated with TOTVS Protheus REST API.

## Tipos válidos

### Páginas de lista
| Tipo | Arquivos gerados | `--module` obrigatório? | Quando usar |
|------|----------------|----------------------|-------------|
| `page-list` | `*.component.ts/html/scss` | Sim | Lista simples com busca rápida apenas |
| `page-dynamic-search` | `*.component.ts/html/scss` | Sim | Lista + busca avançada + disclaimers — **padrão Protheus** |
| `page-dynamic` | `*.component.ts/html` | Sim | Zero-boilerplate via PoPageDynamicTableComponent — API deve seguir contrato do plugin |
| `master-detail` | `*.component.ts/html/scss` + model | Sim | Lista com linhas filho expansíveis (pedido/itens, NF/itens) |
| `stacked-browse` | `*.component.ts/html/scss` | Sim | Dois po-table empilhados (master/detail) com navegação por teclado ArrowUp/Down e Tab para alternar |
| `two-panel-browse` | `*.component.ts/html/scss` | Sim | Dois po-table lado a lado para conciliação/matching (seleciona um de cada e confirma) |
| `action-list` | `*.component.ts/html/scss` + model | Sim | Lista com N ações procedurais Protheus — cada ação tem modal de confirmação com interpolação de campos, loading isolado por botão, resposta estruturada por linha com modal de resultados para sucesso parcial |

### Edição e detalhe
| Tipo | Arquivos gerados | `--module` obrigatório? | Quando usar |
|------|----------------|----------------------|-------------|
| `page-edit` | `*.component.ts/html/scss` | Sim | Formulário com muitos campos, navega via rota |
| `page-detail` | `*.component.ts/html/scss` | Sim | Detalhe somente leitura, rota `:id/detalhe` |
| `modal-crud` | `*.component.ts/html/scss` | Sim | Lista + modal add/edit num único componente (até ~10 campos) |
| `stepper-form` | `*.component.ts/html/scss` | Sim | Wizard multi-etapas com po-stepper (3+ seções distintas) |

### Utilitários
| Tipo | Arquivos gerados | `--module` obrigatório? | Quando usar |
|------|----------------|----------------------|-------------|
| `service` | `*.service.ts` | Sim | Angular service consumindo REST Protheus |
| `module` | `app.routes.ts`, `app.config.ts`, `app.component.ts`, `package.json`, `proxy.conf.json`, `index.html` | Não | Scaffold completo de aplicação |
| `dashboard` | `*.component.ts/html/scss` | Sim | Página analítica com po-widget + po-chart |
| `refactor` | `*.component.ts/html/scss` + service + model | Sim | Converte `.prw`/`.tlpp` existente para PO-UI (fornecer o arquivo fonte) |
| `models` | `<entidade>.model.ts` | Sim | Interfaces TypeScript: simples, chave composta, flat relational (padrão Protheus) |
| `tlpp-contract` | skeleton WsRestFul `.tlpp` | Sim | Contrato REST backend para implementar com `/advpl-specialist:generate rest` |

## Exemplos

```bash
/poui-specialist:generate page-dynamic-search Pedidos --module financeiro
/poui-specialist:generate page-dynamic Parceiros --module compras
/poui-specialist:generate modal-crud Produtos --module estoque
/poui-specialist:generate page-edit Pedido --module faturamento
/poui-specialist:generate page-detail Pedido --module faturamento
/poui-specialist:generate stepper-form CadastroPedido --module financeiro
/poui-specialist:generate master-detail PedidoCompra --module compras
/poui-specialist:generate page-list Parceiros --module compras
/poui-specialist:generate service PedidoService --module faturamento
/poui-specialist:generate dashboard Estoque --module estoque
/poui-specialist:generate module Faturamento
/poui-specialist:generate refactor --module financeiro   # will ask for .prw/.tlpp file
/poui-specialist:generate stacked-browse AprovacaoPedido --module compras
/poui-specialist:generate two-panel-browse ConciliacaoCartao --module financeiro
/poui-specialist:generate models Pedido --module compras
/poui-specialist:generate tlpp-contract Pedido --module compras
```

## Processo

> **Pré-passo opcional:** Se o projeto Angular já tem serviços e rotas cadastradas, execute `/poui-specialist:context` antes para gerar um snapshot de contexto e evitar duplicatas.
> 
> **Geração a partir de imagem:** Se tiver um screenshot ou wireframe da tela, use `/poui-specialist:screenshot <caminho-ou-url>` para gerar o manifesto automaticamente por visão, sem precisar escrever o manifesto à mão.

1. **Parse arguments** — identificar `<type>`, `<Name>`, `--module` e flags opcionais:
   - `--dry-run`: exibir apenas o plano (lista de arquivos e estrutura resumida) **sem escrever nada em disco**. Encerrar após o Passo 2 com: `🔍 Modo dry-run — nenhum arquivo foi gerado.`
   - `--skip-build`: pular o Passo 4. Útil em gerações em lote para rodar build uma única vez no final.
2. **Delegate to `code-generator` agent** — full planning, validation, and generation workflow
3. **Confirm output** — list created files with their absolute paths and suggested route addition
4. **Build verification** — Se `--skip-build` foi fornecido: exibir `⚠ Build verification ignorada (--skip-build). Execute ng build --configuration development manualmente.` e pular para o Passo 5. Caso contrário: invocar automaticamente a skill `poui-specialist:build-fix`. Não perguntar ao usuário — executar direto e exibir o relatório de build.
5. **Preview no browser** — após a verificação de build, perguntar:

   > "Deseja visualizar a tela no browser? [S/n]"

   - Se **sim**: invocar a skill `poui-specialist:poui-preview` passando `<module>`, `<kebab-name>` e `<ComponentClass>` gerados no Passo 2.
   - Se **não**: encerrar normalmente.

> **Auditoria periódica:** Use `/poui-specialist:quality` após gerar para verificar se os componentes atendem os 4 critérios de qualidade do plugin (OnPush, loading state, error handling, cleanup de observables) e se as rotas usam lazy loading.
> **Geração de testes:** Use `/poui-specialist:test <ComponentClass> --module <module>` para gerar testes unitários Karma + Jasmine completos (smoke, HTTP, router, modais) para o componente gerado.

## Geração em Lote

Para gerar múltiplos componentes com custo fixo por componente (sem acúmulo de contexto por sessão), use o comando `/poui-specialist:generate-batch` com o formato manifesto.

Exemplo:
```
/poui-specialist:generate-batch

MODULO: financeiro/titulos
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/financeiro/titulos

COMPONENTES:
| tipo      | classe               | endpoint      | campos                        |
|-----------|----------------------|---------------|-------------------------------|
| page-list | TitulosListComponent | /titulos      | codTit, nomCli, valor, status |
| service   | TitulosService       | /titulos      | -                             |

REGRAS:
- Status: A=Aberto B=Baixado
```

Consulte a [documentação de Otimização de Tokens](https://alscosta1973.github.io/poui-specialist-docs/docs/otimizacao-tokens) para o formato completo.

Para descobrir os campos automaticamente a partir de um endpoint, use primeiro `/poui-specialist:discover /api/custom/v1/<entidade>` — o plugin chama o endpoint, inspeciona os campos e gera o manifesto pronto para revisão e geração.
