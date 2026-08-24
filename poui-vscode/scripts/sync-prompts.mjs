import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const destDir = path.resolve(here, '..', 'assets', 'agent-prompts');

const sources = [
  // Comuns a todos os tipos da família Lista/Browse (Fase 1)
  ['agents/code-generator-list.md', 'code-generator-list.md'],
  ['skills/poui-code-generation/templates-service.md', 'templates-service.md'],
  ['skills/poui-components/table-components.md', 'table-components.md'],
  ['skills/poui-patterns/po-ui-quirks-table.md', 'po-ui-quirks-table.md'],
  ['skills/poui-patterns/po-ui-quirks-onpush.md', 'po-ui-quirks-onpush.md'],
  // page-list
  ['skills/poui-code-generation/templates-page-list.md', 'templates-page-list.md'],
  // page-dynamic-search
  ['skills/poui-code-generation/templates-page-dynamic-search.md', 'templates-page-dynamic-search.md'],
  ['skills/poui-components/form-fields.md', 'form-fields.md'],
  // stacked-browse
  ['skills/poui-code-generation/templates-stacked-browse.md', 'templates-stacked-browse.md'],
  ['skills/poui-code-generation/templates-stacked-browse-ts.md', 'templates-stacked-browse-ts.md'],
  ['skills/poui-code-generation/templates-stacked-browse-html.md', 'templates-stacked-browse-html.md'],
  // two-panel-browse
  ['skills/poui-code-generation/templates-two-panel-browse.md', 'templates-two-panel-browse.md'],
  ['skills/poui-code-generation/templates-two-panel-browse-ts.md', 'templates-two-panel-browse-ts.md'],
  ['skills/poui-code-generation/templates-two-panel-browse-html.md', 'templates-two-panel-browse-html.md'],
  // action-list
  ['skills/poui-code-generation/templates-action-list.md', 'templates-action-list.md'],
  // master-detail
  ['skills/poui-code-generation/templates-master-detail.md', 'templates-master-detail.md'],
];

async function main() {
  await mkdir(destDir, { recursive: true });
  for (const [src, dest] of sources) {
    const from = path.join(repoRoot, src);
    const to = path.join(destDir, dest);
    await copyFile(from, to);
    console.log(`synced ${src} -> assets/agent-prompts/${dest}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
