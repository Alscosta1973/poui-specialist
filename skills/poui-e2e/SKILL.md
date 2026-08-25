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

**Se não existir:** perguntar antes de configurar:
```
Este projeto ainda não tem Playwright Test configurado para E2E.
Deseja que eu configure agora — instala @playwright/test, baixa o Chromium
e cria um playwright.config.ts mínimo (baseURL dinâmica, pasta e2e/)? [S/n]
```
Se confirmado, executar nesta ordem (parar e reportar o erro se algum passo falhar,
sem tentar os seguintes):
1. `npm install --save-dev @playwright/test`
2. `npx playwright install chromium`
3. Criar `playwright.config.ts`:
   ```typescript
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     testDir: './e2e',
     use: {
       baseURL: process.env['PO_E2E_BASE_URL'] ?? 'http://localhost:4200',
     },
     reporter: 'list',
   });
   ```
   > **Achado real (2026-08-25):** uma versão anterior deste passo deixava a
   > `baseURL` fixa em `'http://localhost:4200'` com a promessa de que seria
   > "sobrescrita por variável de ambiente no Passo 7" — mas nenhum passo
   > setava essa variável de fato, então todo spec gerado com o dev server
   > numa porta diferente de 4200 (comum: portas 4200-4209 são alocadas
   > dinamicamente, e desde o reaproveitamento de dev server — Passo 3 do
   > `poui-preview` — a porta reaproveitada raramente é a 4200 "limpa") batia
   > na URL errada e `npx playwright test` falhava sempre. O Passo 6 abaixo
   > resolve isso de vez embutindo a porta real no próprio spec gerado, sem
   > depender de env var nenhuma no momento de rodar — a `baseURL` dinâmica
   > aqui é só uma rede de segurança pra quem rodar o spec manualmente.
4. Adicionar ao `.gitignore` (se existir e ainda não tiver) os padrões dos
   artefatos efêmeros do Playwright — evita commit acidental:
   ```
   /test-results
   /playwright-report
   /.playwright-mcp
   /blob-report
   /playwright/.cache
   ```

Confirmar ao final: `✅ Playwright Test configurado — @playwright/test instalado, Chromium
baixado, playwright.config.ts criado.` Se recusado, encerrar com instrução: `Rode: npm install
--save-dev @playwright/test && npx playwright install chromium` e tente novamente depois — só
criar o `playwright.config.ts` sem instalar o pacote deixa `npx playwright test` quebrado
mesmo assim.

**Se já existir:** seguir para o Passo 4.

---

## Passo 4 — Subir o app Angular

Reutilizar exatamente a lógica de `skills/poui-preview/SKILL.md` Passos 1, 3, 3.5 e 4 (localizar
`angular.json`, checar o arquivo de estado e reaproveitar se já houver um dev server vivo pra esse
projeto, senão detectar porta livre 4200–4209, iniciar `ng serve --port <porta>` em background,
aguardar até 120s, e gravar o estado). Não repetir a rota de preview aqui — apenas garantir o
servidor no ar. Como o `poui-preview` costuma rodar antes do `poui-e2e` no mesmo componente (a
rota precisa já existir — ver "Quando NÃO usar"), na prática o servidor quase sempre já está de
pé e é só reaproveitado aqui, sem gastar outros 5-10s de boot do Angular.

Se o Playwright MCP não estiver disponível nesta sessão (mesma checagem do `poui-preview`
Passo 4.5), abortar com a mesma mensagem orientando ativar o MCP.

---

## Passo 5 — Inspecionar o DOM real para descobrir seletores

Navegar para `http://localhost:<porta-real-do-Passo-4>/<module>/<kebab-name>` (URL absoluta —
`browser_navigate` precisa do host completo, não só do caminho) com `browser_navigate` e capturar
`browser_snapshot`
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

Escrever `e2e/<kebab-name>.e2e.spec.ts` usando `@playwright/test`. **Embutir a porta real usada
no Passo 4** numa constante `BASE_URL` no topo do arquivo, sobrescrevível por `PO_E2E_BASE_URL` —
o spec navega com URL **absoluta** (`PAGE_URL`), nunca relativa. Isso deixa o spec correto mesmo
que a `baseURL` do `playwright.config.ts` aponte pra outra porta (ver achado no Passo 3):

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env['PO_E2E_BASE_URL'] ?? 'http://localhost:<porta-real-do-Passo-4>';
const PAGE_URL = `${BASE_URL}/<module>/<kebab-name>`;
```

Roteiro por família, sempre usando `page.goto(PAGE_URL)` em vez de caminho relativo:

**`list`:**
```typescript
test.describe('<ComponentClass> (E2E)', () => {
  test('carrega a lista e exibe ao menos uma linha ou o estado vazio', async ({ page }) => {
    await page.goto(PAGE_URL);
    const rows = page.getByRole('row');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test('busca rápida filtra a lista', async ({ page }) => {
    await page.goto(PAGE_URL);
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

Deixar o dev server rodando (mesmo comportamento do `poui-preview` — não matar o processo; ele
fica rastreado no arquivo de estado e é reaproveitado na próxima chamada de `poui-preview`/
`poui-e2e` nesse projeto, em vez de subir outro). Informar:
```
✅ E2E gerado: e2e/<kebab-name>.e2e.spec.ts
Dev server continua rodando em http://localhost:<porta> (reaproveitado nas próximas execuções).

Para encerrar de vez:
  $linha = netstat -ano | Select-String "TCP6?\s+\S+:<porta>\s.*LISTENING"
  $pid = ($linha.ToString().Trim() -split '\s+')[-1]
  Stop-Process -Id $pid -Force
```

---

## Quando NÃO usar

- Para teste unitário (mock de HTTP, sem browser real) → use `/poui-specialist:test`.
- Se o projeto não tem Protheus REST disponível no momento — o teste ainda roda, mas contra
  estado vazio/erro (comportamento real de produção, útil de qualquer forma).
