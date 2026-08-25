import * as assert from 'node:assert';
import { lintComponentPair } from '../../lintRules';
import { applyLintFixes } from '../../lintFixes';

describe('applyLintFixes', () => {
  it('L01: adds the OnPush property and imports ChangeDetectionStrategy', () => {
    const ts = `import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-x',\n})\nexport class XComponent {}\n`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    const result = applyLintFixes({ tsPath: 'x.component.ts', tsContent: ts }, findings);

    assert.ok(result.appliedFixIds.includes('L01'));
    assert.ok(result.tsContent!.includes('ChangeDetectionStrategy'));
    assert.ok(result.tsContent!.includes('changeDetection: ChangeDetectionStrategy.OnPush,'));
    assert.ok(/import \{ Component, ChangeDetectionStrategy \} from '@angular\/core';/.test(result.tsContent!));

    // Re-linting the fixed content must not raise L01 again.
    const findingsAfter = lintComponentPair({ tsPath: 'x.component.ts', tsContent: result.tsContent! });
    assert.ok(!findingsAfter.some((f) => f.id === 'L01'));
  });

  it('L01: adds a new @angular/core import when none exists', () => {
    const ts = `@Component({\n  selector: 'app-x',\n})\nexport class XComponent {}\n`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    const result = applyLintFixes({ tsPath: 'x.component.ts', tsContent: ts }, findings);

    assert.ok(/import \{ ChangeDetectionStrategy \} from '@angular\/core';/.test(result.tsContent!));
  });

  it('H03: inserts a track $index expression', () => {
    const ts = `@Component({ changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent {}`;
    const html = `@for (x of items()) { <tr>{{x}}</tr> }`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: ts, htmlPath: 'x.html', htmlContent: html });
    const result = applyLintFixes({ tsPath: 'x.ts', tsContent: ts, htmlPath: 'x.html', htmlContent: html }, findings);

    assert.ok(result.appliedFixIds.includes('H03'));
    assert.ok(result.htmlContent!.includes('track $index'));
    const findingsAfter = lintComponentPair({ tsPath: 'x.ts', tsContent: ts, htmlPath: 'x.html', htmlContent: result.htmlContent! });
    assert.ok(!findingsAfter.some((f) => f.id === 'H03'));
  });

  it('H04: removes the p-selected-rows attribute', () => {
    const ts = `@Component({ changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent {}`;
    const html = `<po-table p-selected-rows="rows" [p-height]="300"></po-table>`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: ts, htmlPath: 'x.html', htmlContent: html });
    const result = applyLintFixes({ tsPath: 'x.ts', tsContent: ts, htmlPath: 'x.html', htmlContent: html }, findings);

    assert.ok(result.appliedFixIds.includes('H04'));
    assert.ok(!result.htmlContent!.includes('p-selected-rows'));
    assert.ok(result.htmlContent!.includes('[p-height]="300"'));
  });

  it('H06: renames p-max-length to p-maxlength', () => {
    const ts = `@Component({ changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent {}`;
    const html = `<po-input p-max-length="100"></po-input>`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: ts, htmlPath: 'x.html', htmlContent: html });
    const result = applyLintFixes({ tsPath: 'x.ts', tsContent: ts, htmlPath: 'x.html', htmlContent: html }, findings);

    assert.ok(result.appliedFixIds.includes('H06'));
    assert.strictEqual(result.htmlContent, `<po-input p-maxlength="100"></po-input>`);
  });

  it('L02: adds ngAfterViewInit + ChangeDetectorRef injection for po-page-* templates', () => {
    const ts = `import { Component, ChangeDetectionStrategy } from '@angular/core';\n\n@Component({\n  changeDetection: ChangeDetectionStrategy.OnPush,\n})\nexport class XComponent {\n  value = 1;\n}\n`;
    const html = `<po-page-list p-title="X"></po-page-list>`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: ts, htmlPath: 'x.html', htmlContent: html });
    const result = applyLintFixes({ tsPath: 'x.ts', tsContent: ts, htmlPath: 'x.html', htmlContent: html }, findings);

    assert.ok(result.appliedFixIds.includes('L02'));
    assert.ok(result.tsContent!.includes('ngAfterViewInit'));
    assert.ok(result.tsContent!.includes('inject(ChangeDetectorRef)'));
    assert.ok(/import \{ Component, ChangeDetectionStrategy, AfterViewInit, ChangeDetectorRef, inject \} from '@angular\/core';/.test(result.tsContent!));
    assert.ok(/export class XComponent implements AfterViewInit/.test(result.tsContent!));

    const findingsAfter = lintComponentPair({ tsPath: 'x.ts', tsContent: result.tsContent!, htmlPath: 'x.html', htmlContent: html });
    assert.ok(!findingsAfter.some((f) => f.id === 'L02'));
  });

  it('L06: inserts an error stub into an object-form subscribe', () => {
    const ts = `load(): void {\n  this.service.list().subscribe({\n    next: (items) => { this.items.set(items); },\n  });\n}`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: ts });
    const result = applyLintFixes({ tsPath: 'x.ts', tsContent: ts }, findings);

    assert.ok(result.appliedFixIds.includes('L06'));
    assert.ok(result.tsContent!.includes('error: () => {},'));
    const findingsAfter = lintComponentPair({ tsPath: 'x.ts', tsContent: result.tsContent! });
    assert.ok(!findingsAfter.some((f) => f.id === 'L06'));
  });

  it('L07: inserts loading.set(false) into an empty-block error callback', () => {
    const ts = `load(): void {\n  this.service.list().subscribe({\n    next: (items) => {},\n    error: () => {},\n  });\n}`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: ts });
    const result = applyLintFixes({ tsPath: 'x.ts', tsContent: ts }, findings);

    assert.ok(result.appliedFixIds.includes('L07'));
    assert.ok(result.tsContent!.includes('this.loading.set(false);'));
    const findingsAfter = lintComponentPair({ tsPath: 'x.ts', tsContent: result.tsContent! });
    assert.ok(!findingsAfter.some((f) => f.id === 'L07'));
  });

  it('leaves non-fixable findings untouched and does not report them as applied', () => {
    const ts = `export class XComponent {\n  @Input() value!: string;\n}`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: ts });
    const result = applyLintFixes({ tsPath: 'x.ts', tsContent: ts }, findings);

    assert.ok(!result.appliedFixIds.includes('L04'));
    assert.ok(result.tsContent!.includes('@Input()'));
  });

  it('is a no-op when there are no findings', () => {
    const ts = `@Component({ changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent {}`;
    const result = applyLintFixes({ tsPath: 'x.ts', tsContent: ts }, []);
    assert.deepStrictEqual(result.appliedFixIds, []);
    assert.strictEqual(result.tsContent, ts);
  });
});
