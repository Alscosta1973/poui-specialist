import * as assert from 'node:assert';
import { parseComponentCategories, findComponentReferenceFile, buildDocsUserPrompt } from '../../docsPromptBuilder';

const SAMPLE_SKILL_MD = `
## Component Reference Files

- **Page layout components** (po-page-list, po-page-edit, po-page-detail, po-page-default, po-page-login): see \`page-components.md\`
- **Data table** (po-table, PoTableColumn, PoTableAction): see \`table-components.md\`
- **Form fields** (po-input, po-select, po-lookup, po-datepicker): see \`form-fields.md\`
- **Navigation** (po-button, po-search, po-menu, po-tree-view): see \`navigation-components.md\`
`;

describe('parseComponentCategories', () => {
  it('extracts every category with its component list and reference file', () => {
    const categories = parseComponentCategories(SAMPLE_SKILL_MD);

    assert.strictEqual(categories.length, 4);
    const pageLayout = categories.find((c) => c.file === 'page-components.md')!;
    assert.ok(pageLayout.components.includes('popagelist'));
    assert.ok(pageLayout.components.includes('popagelogin'));
  });

  it('normalizes entries to lowercase so lookups are case-insensitive', () => {
    const categories = parseComponentCategories(SAMPLE_SKILL_MD);
    const table = categories.find((c) => c.file === 'table-components.md')!;
    assert.ok(table.components.includes('potablecolumn'));
    assert.ok(!table.components.includes('PoTableColumn'));
  });
});

describe('findComponentReferenceFile', () => {
  const categories = parseComponentCategories(SAMPLE_SKILL_MD);

  it('finds the exact reference file for a known component', () => {
    assert.strictEqual(findComponentReferenceFile(categories, 'po-table'), 'table-components.md');
    assert.strictEqual(findComponentReferenceFile(categories, 'po-tree-view'), 'navigation-components.md');
  });

  it('is case-insensitive and tolerant of PascalCase input', () => {
    assert.strictEqual(findComponentReferenceFile(categories, 'PoTable'), 'table-components.md');
  });

  it('returns undefined for an unknown component', () => {
    assert.strictEqual(findComponentReferenceFile(categories, 'po-does-not-exist'), undefined);
  });
});

describe('buildDocsUserPrompt', () => {
  it('asks for full docs (inputs/outputs/types/example) for the component', () => {
    const prompt = buildDocsUserPrompt('po-table');
    assert.ok(prompt.includes('po-table'));
    assert.ok(prompt.toLowerCase().includes('inputs'));
    assert.ok(prompt.toLowerCase().includes('outputs'));
  });

  it('tells the model to list available components and suggest the closest match when not found', () => {
    const prompt = buildDocsUserPrompt('po-table');
    assert.ok(prompt.toLowerCase().includes('não encontrado') || prompt.toLowerCase().includes('mais próximo'));
  });
});
