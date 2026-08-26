import * as assert from 'node:assert';
import {
  checkNodeVersion,
  titleCase,
  buildAppComponentTs,
  buildAppComponentHtml,
  buildAppRoutesTs,
  buildIndexHtmlTitle,
  buildProxyConfigJson,
  buildHomeComponentTs,
  fixTsconfigStrictness,
  setAngularJsonStyles,
} from '../../scaffolding';

describe('checkNodeVersion', () => {
  it('accepts Node >= 20.11.0', () => {
    assert.strictEqual(checkNodeVersion('v20.11.0').ok, true);
    assert.strictEqual(checkNodeVersion('v22.23.2').ok, true);
    assert.strictEqual(checkNodeVersion('v21.0.0').ok, true);
  });

  it('rejects Node below 20.11.0, with a helpful message', () => {
    const result = checkNodeVersion('v20.10.0');
    assert.strictEqual(result.ok, false);
    assert.ok(result.message?.includes('20.11'));
  });

  it('rejects Node 18.x (below major 20)', () => {
    assert.strictEqual(checkNodeVersion('v18.19.0').ok, false);
  });
});

describe('titleCase', () => {
  it('title-cases a kebab-case project name', () => {
    assert.strictEqual(titleCase('meu-projeto'), 'Meu Projeto');
  });

  it('title-cases a single word', () => {
    assert.strictEqual(titleCase('vendas'), 'Vendas');
  });
});

describe('buildAppComponentTs', () => {
  it('includes the "Início" menu item when demo is included', () => {
    const withDemo = buildAppComponentTs(true);
    assert.ok(withDemo.includes("link: '/inicio'"));
  });

  it('omits the "Início" menu item without demo', () => {
    const withoutDemo = buildAppComponentTs(false);
    assert.ok(!withoutDemo.includes("link: '/inicio'"));
  });

  it('exports class App targeting app.html/app.scss — Angular CLI 21 generates app.ts/App, not app.component.ts/AppComponent, and main.ts already imports App from ./app/app', () => {
    const content = buildAppComponentTs(false);
    assert.ok(content.includes('export class App '), 'expected the class to be named App, not AppComponent');
    assert.ok(content.includes("templateUrl: './app.html'"));
    assert.ok(content.includes("styleUrl: './app.scss'"));
  });
});

describe('buildAppComponentHtml', () => {
  it('substitutes the project title into po-toolbar', () => {
    const html = buildAppComponentHtml('Meu Projeto');
    assert.ok(html.includes('p-title="Meu Projeto"'));
  });
});

describe('buildAppRoutesTs', () => {
  it('adds the inicio route when demo is included', () => {
    const routes = buildAppRoutesTs(true);
    assert.ok(routes.includes("path: 'inicio'"));
    assert.ok(routes.includes('home.component'));
  });

  it('has a bare redirect without demo', () => {
    const routes = buildAppRoutesTs(false);
    assert.ok(!routes.includes('home.component'));
    assert.ok(routes.includes("redirectTo: 'inicio'"));
  });
});

describe('buildIndexHtmlTitle', () => {
  it('replaces the <title> content, leaving the rest of index.html untouched', () => {
    const original = '<!doctype html><html><head><title>MeuProjeto</title></head><body><app-root></app-root></body></html>';
    const result = buildIndexHtmlTitle(original, 'Meu Projeto');
    assert.ok(result.includes('<title>Meu Projeto</title>'));
    assert.ok(result.includes('<app-root></app-root>'));
  });
});

describe('buildProxyConfigJson', () => {
  it('targets the given Protheus URL with debug log level', () => {
    const config = JSON.parse(buildProxyConfigJson('http://localhost:8086'));
    assert.strictEqual(config['/rest'].target, 'http://localhost:8086');
    assert.strictEqual(config['/rest'].logLevel, 'debug');
  });
});

describe('buildHomeComponentTs', () => {
  it('embeds the Protheus URL in the generated demo page', () => {
    const content = buildHomeComponentTs('http://192.168.1.10:8086');
    assert.ok(content.includes('http://192.168.1.10:8086'));
  });
});

describe('fixTsconfigStrictness', () => {
  it('relaxes strict and noPropertyAccessFromIndexSignature to false, as plain text — tsconfig.json from `ng new` has leading /* */ comments that break JSON.parse', () => {
    const original = [
      '/* To learn more about Typescript configuration file: https://... */',
      '{',
      '  "compilerOptions": {',
      '    "strict": true,',
      '    "noPropertyAccessFromIndexSignature": true,',
      '    "target": "ES2022"',
      '  }',
      '}',
      '',
    ].join('\n');

    const fixed = fixTsconfigStrictness(original);

    assert.ok(fixed.includes('"strict": false'));
    assert.ok(fixed.includes('"noPropertyAccessFromIndexSignature": false'));
    assert.ok(fixed.includes('"target": "ES2022"'));
    assert.ok(fixed.startsWith('/* To learn more'));
  });
});

describe('setAngularJsonStyles', () => {
  it('sets the exact TOTVS theme style order, dropping any ng add-injected community theme entry', () => {
    const angularJson = {
      projects: {
        x: {
          architect: {
            build: {
              options: {
                styles: ['./node_modules/@po-ui/style/css/po-theme-default.min.css', 'src/styles.scss'],
              },
            },
          },
        },
      },
    };

    const fixed = setAngularJsonStyles(angularJson, 'x');

    assert.deepStrictEqual(fixed.projects.x.architect.build.options.styles, [
      'node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css',
      'node_modules/@totvs/po-theme/css/po-theme-default.min.css',
      'node_modules/@po-ui/style/css/po-theme-core.min.css',
      'src/styles.scss',
    ]);
  });
});
