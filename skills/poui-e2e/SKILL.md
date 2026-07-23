---
name: poui-e2e
description: Use to generate a real Playwright E2E test spec for a component created by the plugin — drives the live dev server + browser to discover real selectors, then writes and runs a *.e2e.spec.ts file, complementing the unit specs from poui-test | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
metadata:
  domain: PO-UI / Angular / Protheus
  author: Andre Costa
  version: '1.12.1'
  category: Testing
---

# PO-UI E2E — Teste Ponta-a-Ponta com Playwright

Gera um spec `@playwright/test` real (`e2e/<kebab-name>.e2e.spec.ts`) para um componente Angular
gerado pelo plugin, inspirado no `tir-test-generator` da TOTVS (que gera testes E2E robotizados
para telas nativas Protheus) — aqui adaptado para telas Angular/PO-UI. Complementa o
`/poui-specialist:test` (unitário, mocka HTTP) com um teste que sobe o app de verdade e interage
com o DOM real via browser.

## Uso

```
/poui-specialist:e2e <ComponentClass> --module <module>
```

**Exemplos:**
```
/poui-specialist:e2e TitulosListComponent --module financeiro/titulos-list
/poui-specialist:e2e ParceirosEditComponent --module faturamento/parceiros
```

---

## Passo 1 — Parse de argumentos

Extrair `ComponentClass` e `--module`. Derivar `kebab-name`, `componentPath` e `componentFile`
como em `skills/poui-test/SKILL.md` Passo 1.

Se o arquivo não existir, exibir erro e encerrar (mesmo formato do `poui-test`).

---

## Passo 2 — Identificar família do componente

Ler o `.component.ts` e aplicar a mesma tabela de detecção de família do `poui-test/SKILL.md`
Passo 2 (`list`, `form`, `detail`, `complex`, `other`). A família determina o roteiro de
interação no Passo 6.

---

## Passo 3 — Garantir ambiente de teste E2E no projeto

Verificar se existe `playwright.config.ts` na raiz do projeto Angular.

**Se não existir:** perguntar antes de criar:
```
Este projeto ainda não tem Playwright Test configurado para E2E.
Deseja que eu crie um playwright.config.ts mínimo (baseURL dinâmica, pasta e2e/)? [S/n]
```
Se confirmado, criar `playwright.config.ts` com `testDir: './e2e'` e `use: { baseURL: 'http://localhost:4200' }`
(a baseURL real será sobrescrita por variável de ambiente no Passo 7). Se recusado, encerrar
com instrução: `Rode: npm init playwright@latest` e tente novamente depois.

**Se já existir:** seguir para o Passo 4.

---

## Passo 4 — Subir o app Angular

Reutilizar exatamente a lógica de `skills/poui-preview/SKILL.md` Passos 1, 3 e 4 (localizar
`angular.json`, detectar porta livre 4200–4209, iniciar `ng serve --port <porta>` em background,
aguardar até 120s). Não repetir a rota de preview aqui — apenas garantir o servidor no ar.

Se o Playwright MCP não estiver disponível nesta sessão (mesma checagem do `poui-preview`
Passo 4.5), abortar com a mesma mensagem orientando ativar o MCP.

---

## Passo 5 — Inspecionar o DOM real para descobrir seletores

Navegar para `/<module>/<kebab-name>` com `browser_navigate` e capturar `browser_snapshot`
(árvore de acessibilidade, não screenshot) para identificar os seletores reais a usar no spec:

| Família | O que localizar no snapshot |
|---|---|
| `list` | `po-table` (role `table`), campo de busca rápida (`po-clean` / input de filtro), linhas (`role=row`) |
| `form` / `edit` | Inputs obrigatórios (`po-input`, `po-select`, `po-datepicker`), botão salvar (`role=button` "Salvar"/"Confirmar") |
| `detail` | Campos do `po-dynamic-view` / labels de exibição |
| `complex` | Os dois `po-table` (master/detail ou two-panel), botão de ação principal |

Anotar os `data-testid` / roles / texto de label reais encontrados — usar esses seletores no
spec gerado, nunca inventar seletores genéricos que não existam na página real.

---

## Passo 6 — Gerar o spec E2E

Escrever `e2e/<kebab-name>.e2e.spec.ts` usando `@playwright/test`, com roteiro por família:

**`list`:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('<ComponentClass> (E2E)', () => {
  test('carrega a lista e exibe ao menos uma linha ou o estado vazio', async ({ page }) => {
    await page.goto('/<module>/<kebab-name>');
    const rows = page.getByRole('row');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test('busca rápida filtra a lista', async ({ page }) => {
    await page.goto('/<module>/<kebab-name>');
    await page.getByPlaceholder(/pesquisar|buscar/i).fill('<termo-de-busca-real>');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('row')).toHaveCount(1, { timeout: 10000 });
  });
});
```

**`form` / `edit`:** navegar, preencher os campos obrigatórios reais encontrados no Passo 5,
clicar em salvar, e validar navegação de volta à lista ou mensagem de sucesso (`po-toaster`).

**`detail`:** navegar via uma linha da lista (ou URL direta com id conhecido) e validar que os
campos-chave aparecem com texto não vazio.

**`complex`:** navegar, validar que os dois painéis renderizam linhas, selecionar uma linha em
cada e validar que a ação de confirmação habilita.

Adaptar os seletores/textos do template acima para os reais encontrados no Passo 5 — nunca
deixar placeholders `<...>` no arquivo final.

---

## Passo 7 — Rodar o spec gerado

```powershell
npx playwright test e2e/<kebab-name>.e2e.spec.ts --reporter=list
```

- **Passou:** exibir `✅ <ComponentClass> — E2E: N spec(s) passando`
- **Falhou:** exibir o erro do Playwright (screenshot de falha se gerado em `test-results/`),
  ajustar seletor/timing uma vez e rodar novamente. Se falhar de novo, entregar o arquivo como
  está e reportar:
  ```
  ⚠ Spec E2E gerado mas 1+ teste falhou — revise manualmente os seletores em <specPath>.
  ```

---

## Passo 8 — Encerrar

Deixar o dev server rodando (mesmo comportamento do `poui-preview` — não matar o processo).
Informar:
```
✅ E2E gerado: e2e/<kebab-name>.e2e.spec.ts
Dev server continua rodando em http://localhost:<porta>. Ctrl+C no terminal para encerrar.
```

---

## Quando NÃO usar

- Para teste unitário (mock de HTTP, sem browser real) → use `/poui-specialist:test`.
- Se o projeto não tem Protheus REST disponível no momento — o teste ainda roda, mas contra
  estado vazio/erro (comportamento real de produção, útil de qualquer forma).
