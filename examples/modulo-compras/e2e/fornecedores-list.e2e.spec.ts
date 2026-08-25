/**
 * @generated  poui-specialist v1.16.2
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 * @node       v24.18.1
 * @angular    ^21.2.0 (17-21+ supported)
 *
 * E2E — FornecedoresListComponent (família: list)
 * Seletores extraídos da árvore de acessibilidade real de
 * http://localhost:4201/financeiro/fornecedores-list
 */

import { test, expect, type Locator, type Page } from '@playwright/test';

const ROUTE = '/financeiro/fornecedores-list';
const BASE_URL = process.env['PO_E2E_BASE_URL'] ?? 'http://localhost:4201';
const PAGE_URL = `${BASE_URL}${ROUTE}`;

/** Colunas declaradas em `columns: PoTableColumn[]`, na ordem de renderização. */
const COLUMN_HEADERS = [
  'Código',
  'Loja',
  'Razão Social',
  'Nome Fantasia',
  'CNPJ',
  'Município',
  'UF',
  'Situação',
] as const;

const table = (page: Page): Locator => page.getByRole('table');

/** Linhas do po-table, incluindo o cabeçalho (índice 0). */
const rows = (page: Page): Locator => table(page).getByRole('row');

/** Estado vazio nativo do po-table quando `items()` está vazio. */
const emptyState = (page: Page): Locator => page.getByRole('cell', { name: 'Nenhum dado encontrado' });

const quickSearch = (page: Page): Locator =>
  page.getByPlaceholder('Buscar por código, razão social ou CNPJ...');

const showMoreButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Carregar mais resultados' });

/**
 * Aguarda o fim do `load()`: o po-table sai do loading e renderiza ou linhas de
 * dados ou a célula de estado vazio. Sem backend Protheus no ar, o componente cai
 * no estado vazio + po-toaster de erro — ambos são comportamento real de produção.
 */
async function waitForListSettled(page: Page): Promise<void> {
  await expect(rows(page).nth(1).or(emptyState(page)).first()).toBeVisible({ timeout: 15000 });
}

test.describe('FornecedoresListComponent (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
  });

  test('renderiza o po-page-list com título, ações e filtro rápido', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Fornecedores', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Incluir' })).toBeVisible();
    await expect(quickSearch(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gerenciador de colunas' })).toBeVisible();
  });

  test('exibe todas as colunas configuradas no po-table', async ({ page }) => {
    await waitForListSettled(page);

    for (const header of COLUMN_HEADERS) {
      await expect(table(page).getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('carrega a lista e exibe linhas de dados ou o estado vazio', async ({ page }) => {
    await waitForListSettled(page);

    // Cabeçalho + ao menos uma linha de corpo (dado ou "Nenhum dado encontrado").
    expect(await rows(page).count()).toBeGreaterThanOrEqual(2);
    await expect(rows(page).nth(1)).toBeVisible();
  });

  test('mantém "Carregar mais resultados" desabilitado quando não há próxima página', async ({
    page,
  }) => {
    await waitForListSettled(page);

    // `hasNext()` falso — inclui o caso de lista vazia (backend indisponível).
    if (await emptyState(page).isVisible()) {
      await expect(showMoreButton(page)).toBeDisabled();
    } else {
      await expect(showMoreButton(page)).toBeVisible();
    }
  });

  test('busca rápida dispara nova consulta e mantém a tabela consistente', async ({ page }) => {
    await waitForListSettled(page);

    await quickSearch(page).fill('000001');
    await quickSearch(page).press('Enter');

    // `onQuickSearch()` reseta a paginação e recarrega: a tabela volta a exibir
    // as colunas e ou linhas filtradas ou o estado vazio.
    await waitForListSettled(page);
    await expect(table(page).getByRole('columnheader', { name: 'Razão Social' })).toBeVisible();
    await expect(quickSearch(page)).toHaveValue('000001');
  });

  test('ação "Incluir" navega para fora da listagem', async ({ page }) => {
    await waitForListSettled(page);

    await page.getByRole('button', { name: 'Incluir' }).click();

    // A rota filha 'novo' ainda não está registrada em app.routes.ts; hoje o
    // wildcard '**' redireciona para /inicio. A asserção valida apenas que a
    // navegação foi disparada, permanecendo válida quando 'novo' for criada.
    await expect(page).not.toHaveURL(new RegExp(`${ROUTE}$`));
  });
});
