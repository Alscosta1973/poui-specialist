import * as assert from 'node:assert';
import { lintComponentPair, LintFinding } from '../../lintRules';

function idsOf(findings: LintFinding[]): string[] {
  return findings.map((f) => f.id);
}

const CLEAN_TS = `
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TitulosService } from './titulos.service';

@Component({
  selector: 'app-titulos-list',
  templateUrl: './titulos-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitulosListComponent {
  private readonly service = inject(TitulosService);

  load(): void {
    this.service.list().subscribe({
      next: (items) => { this.items.set(items); },
      error: () => { this.loading.set(false); },
    });
  }
}
`;

const CLEAN_HTML = `
<po-table [p-columns]="columns" [p-items]="items()" [p-height]="300"></po-table>
`;

describe('lintComponentPair — clean component', () => {
  it('reports no findings for a fully compliant component', () => {
    const findings = lintComponentPair({
      tsPath: 'src/app/financeiro/titulos-list/titulos-list.component.ts',
      tsContent: CLEAN_TS,
      htmlPath: 'src/app/financeiro/titulos-list/titulos-list.component.html',
      htmlContent: CLEAN_HTML,
    });
    assert.deepStrictEqual(findings, []);
  });
});

describe('lintComponentPair — TS checks', () => {
  it('L01: flags missing ChangeDetectionStrategy.OnPush', () => {
    const ts = `@Component({ selector: 'app-x' })\nexport class XComponent {}`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    assert.ok(idsOf(findings).includes('L01'));
    const finding = findings.find((f) => f.id === 'L01')!;
    assert.strictEqual(finding.severity, 'ERROR');
    assert.strictEqual(finding.fixable, true);
  });

  it('L02: flags po-page-* template without ngAfterViewInit', () => {
    const ts = `@Component({ selector: 'app-x', changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent {}`;
    const html = `<po-page-list p-title="X"></po-page-list>`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts, htmlPath: 'x.component.html', htmlContent: html });
    assert.ok(idsOf(findings).includes('L02'));
  });

  it('L02: does not flag when ngAfterViewInit is present', () => {
    const ts = `@Component({ changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent { ngAfterViewInit(): void {} }`;
    const html = `<po-page-list></po-page-list>`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts, htmlPath: 'x.component.html', htmlContent: html });
    assert.ok(!idsOf(findings).includes('L02'));
  });

  it('L03: flags public field not wrapped in signal()', () => {
    const ts = `export class XComponent {\n  public loading = false;\n}`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    assert.ok(idsOf(findings).includes('L03'));
    assert.strictEqual(findings.find((f) => f.id === 'L03')!.fixable, false);
  });

  it('L03: does not flag a public field wrapped in signal()', () => {
    const ts = `export class XComponent {\n  public loading = signal(false);\n}`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    assert.ok(!idsOf(findings).includes('L03'));
  });

  it('L04: flags @Input() usage', () => {
    const ts = `export class XComponent {\n  @Input() value!: string;\n}`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    assert.ok(idsOf(findings).includes('L04'));
  });

  it('L05: flags a fat constructor with no inject()', () => {
    const ts = `export class XComponent {\n  constructor(private a: A, private b: B, private c: C) {}\n}`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    assert.ok(idsOf(findings).includes('L05'));
  });

  it('L05: does not flag when inject() is already used', () => {
    const ts = `export class XComponent {\n  private a = inject(A);\n  constructor(private b: B, private c: C, private d: D) {}\n}`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    assert.ok(!idsOf(findings).includes('L05'));
  });

  it('L06: flags an object-form subscribe with no error callback', () => {
    const ts = `load(): void {\n  this.service.list().subscribe({\n    next: (items) => { this.items.set(items); },\n  });\n}`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    assert.ok(idsOf(findings).includes('L06'));
  });

  it('L07: flags an error callback that never calls loading.set(false)', () => {
    const ts = `load(): void {\n  this.service.list().subscribe({\n    next: (items) => {},\n    error: () => { this.notification.error('x'); },\n  });\n}`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    assert.ok(idsOf(findings).includes('L07'));
  });

  it('L07: does not flag when the error callback sets loading false', () => {
    const ts = `load(): void {\n  this.service.list().subscribe({\n    next: (items) => {},\n    error: () => { this.loading.set(false); },\n  });\n}`;
    const findings = lintComponentPair({ tsPath: 'x.component.ts', tsContent: ts });
    assert.ok(!idsOf(findings).includes('L07'));
  });
});

describe('lintComponentPair — HTML checks', () => {
  const baseTs = `@Component({ changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent {}`;

  it('H01: flags *ngIf usage', () => {
    const html = `<div *ngIf="cond">x</div>`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: baseTs, htmlPath: 'x.html', htmlContent: html });
    assert.ok(idsOf(findings).includes('H01'));
    assert.strictEqual(findings.find((f) => f.id === 'H01')!.fixable, false);
  });

  it('H02: flags *ngFor usage', () => {
    const html = `<tr *ngFor="let x of items">x</tr>`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: baseTs, htmlPath: 'x.html', htmlContent: html });
    assert.ok(idsOf(findings).includes('H02'));
  });

  it('H03: flags @for without a track expression', () => {
    const html = `@for (x of items()) { <tr>{{x}}</tr> }`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: baseTs, htmlPath: 'x.html', htmlContent: html });
    assert.ok(idsOf(findings).includes('H03'));
    assert.strictEqual(findings.find((f) => f.id === 'H03')!.fixable, true);
  });

  it('H03: does not flag @for that already has track', () => {
    const html = `@for (x of items(); track x.id) { <tr>{{x}}</tr> }`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: baseTs, htmlPath: 'x.html', htmlContent: html });
    assert.ok(!idsOf(findings).includes('H03'));
  });

  it('H04: flags p-selected-rows on po-table', () => {
    const html = `<po-table p-selected-rows="rows"></po-table>`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: baseTs, htmlPath: 'x.html', htmlContent: html });
    assert.ok(idsOf(findings).includes('H04'));
    assert.strictEqual(findings.find((f) => f.id === 'H04')!.fixable, true);
  });

  it('H05: flags po-table without [p-height] in an OnPush component', () => {
    const html = `<po-table [p-columns]="columns"></po-table>`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: baseTs, htmlPath: 'x.html', htmlContent: html });
    assert.ok(idsOf(findings).includes('H05'));
    assert.strictEqual(findings.find((f) => f.id === 'H05')!.fixable, false);
  });

  it('H06: flags p-max-length attribute', () => {
    const html = `<po-input p-max-length="100"></po-input>`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: baseTs, htmlPath: 'x.html', htmlContent: html });
    assert.ok(idsOf(findings).includes('H06'));
    assert.strictEqual(findings.find((f) => f.id === 'H06')!.fixable, true);
  });

  it('H07: flags (p-value-change) on po-dynamic-form', () => {
    const html = `<po-dynamic-form (p-value-change)="onChange($event)"></po-dynamic-form>`;
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: baseTs, htmlPath: 'x.html', htmlContent: html });
    assert.ok(idsOf(findings).includes('H07'));
    assert.strictEqual(findings.find((f) => f.id === 'H07')!.fixable, false);
  });

  it('skips all HTML checks when there is no html content (inline template)', () => {
    const findings = lintComponentPair({ tsPath: 'x.ts', tsContent: baseTs });
    assert.deepStrictEqual(findings.filter((f) => f.id.startsWith('H')), []);
  });
});
