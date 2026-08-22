import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const destDir = path.resolve(here, '..', 'assets', 'agent-prompts');

const sources = [
  ['agents/code-generator-list.md', 'code-generator-list.md'],
  ['skills/poui-code-generation/templates-page-list.md', 'templates-page-list.md'],
  ['skills/poui-code-generation/templates-service.md', 'templates-service.md'],
  ['skills/poui-components/table-components.md', 'table-components.md'],
  ['skills/poui-patterns/po-ui-quirks-table.md', 'po-ui-quirks-table.md'],
  ['skills/poui-patterns/po-ui-quirks-onpush.md', 'po-ui-quirks-onpush.md'],
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
