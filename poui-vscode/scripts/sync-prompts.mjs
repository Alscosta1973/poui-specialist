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

  // Família Formulários (Fase 2) — agente code-generator-forms.md
  ['agents/code-generator-forms.md', 'code-generator-forms.md'],
  ['skills/poui-components/dynamic-form-fields.md', 'dynamic-form-fields.md'],
  ['skills/poui-components/modal-dialog.md', 'modal-dialog.md'],
  // page-edit
  ['skills/poui-code-generation/templates-page-edit.md', 'templates-page-edit.md'],
  // page-detail
  ['skills/poui-code-generation/templates-page-detail.md', 'templates-page-detail.md'],
  // modal-crud
  ['skills/poui-code-generation/templates-modal-crud.md', 'templates-modal-crud.md'],
  // stepper-form
  ['skills/poui-code-generation/templates-stepper-form.md', 'templates-stepper-form.md'],

  // Família Infraestrutura (Fase 2) — agente code-generator-infra.md
  ['agents/code-generator-infra.md', 'code-generator-infra.md'],
  ['skills/poui-patterns/protheus-rest.md', 'protheus-rest.md'],
  // dashboard
  ['skills/poui-code-generation/templates-dashboard.md', 'templates-dashboard.md'],
  // tlpp-contract
  ['skills/poui-code-generation/templates-tlpp-contract.md', 'templates-tlpp-contract.md'],
  // auth-login
  ['skills/poui-code-generation/templates-auth-login.md', 'templates-auth-login.md'],

  // Fase 4 — 10 tipos que faltavam no /generate original do plugin
  // page-dynamic
  ['skills/poui-code-generation/templates-page-dynamic.md', 'templates-page-dynamic.md'],
  ['skills/poui-components/dynamic-pages.md', 'dynamic-pages.md'],
  // infinite-scroll
  ['skills/poui-code-generation/templates-infinite-scroll.md', 'templates-infinite-scroll.md'],
  // po-tree
  ['skills/poui-code-generation/templates-tree.md', 'templates-tree.md'],
  ['skills/poui-components/navigation-components.md', 'navigation-components.md'],
  // module
  ['skills/poui-code-generation/templates-module.md', 'templates-module.md'],
  ['skills/poui-patterns/module-structure.md', 'module-structure.md'],
  ['skills/poui-patterns/po-ui-patterns-i18n.md', 'po-ui-patterns-i18n.md'],
  // models
  ['skills/poui-code-generation/templates-models.md', 'templates-models.md'],
  // refactor
  ['skills/poui-code-generation/templates-refactor-from-tlpp.md', 'templates-refactor-from-tlpp.md'],
  ['skills/poui-patterns/po-ui-quirks-forms.md', 'po-ui-quirks-forms.md'],
  // http-interceptor
  ['skills/poui-code-generation/templates-http-interceptor.md', 'templates-http-interceptor.md'],
  // route-guard
  ['skills/poui-code-generation/templates-route-guard.md', 'templates-route-guard.md'],
  // standalone-migrate
  ['skills/poui-code-generation/templates-standalone-migrate.md', 'templates-standalone-migrate.md'],
  // upload
  ['skills/poui-code-generation/templates-upload.md', 'templates-upload.md'],

  // Fase 3 — /poui-specialist:test (skill poui-test)
  ['skills/poui-test/SKILL.md', 'poui-test-skill.md'],
  ['skills/poui-test/templates-test-base.md', 'templates-test-base.md'],
  ['skills/poui-test/templates-test-list.md', 'templates-test-list.md'],
  ['skills/poui-test/templates-test-form.md', 'templates-test-form.md'],
  ['skills/poui-test/templates-test-detail.md', 'templates-test-detail.md'],
  ['skills/poui-test/templates-test-complex.md', 'templates-test-complex.md'],
  ['skills/poui-test/templates-test-other.md', 'templates-test-other.md'],
  ['skills/poui-test/templates-test-advanced.md', 'templates-test-advanced.md'],

  // Fase 3 — /poui-specialist:review (agente code-reviewer)
  ['agents/code-reviewer.md', 'code-reviewer.md'],

  // Fase 3 — /poui-specialist:e2e (skill poui-e2e; reaproveita poui-test-skill.md já sincronizado acima)
  ['skills/poui-e2e/SKILL.md', 'poui-e2e-skill.md'],

  // Fase 4 — /poui-specialist:screenshot (skill poui-screenshot)
  ['skills/poui-screenshot/SKILL.md', 'poui-screenshot-skill.md'],

  // Fase 4 — /poui-specialist:connect (skill poui-connect)
  ['skills/poui-connect/SKILL.md', 'poui-connect-skill.md'],
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
