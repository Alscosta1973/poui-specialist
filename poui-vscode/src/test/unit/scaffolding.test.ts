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
  STYLES_SCSS,
  APP_VERSION_TS,
  TOTVS_LOGOS_ASSET,
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
    const withDemo = buildAppComponentTs(true, 'Meu Projeto');
    assert.ok(withDemo.includes("link: '/inicio'"));
  });

  it('omits the "Início" menu item without demo', () => {
    const withoutDemo = buildAppComponentTs(false, 'Meu Projeto');
    assert.ok(!withoutDemo.includes("link: '/inicio'"));
  });

  it('exports class App targeting app.html/app.scss — Angular CLI 21 generates app.ts/App, not app.component.ts/AppComponent, and main.ts already imports App from ./app/app', () => {
    const content = buildAppComponentTs(false, 'Meu Projeto');
    assert.ok(content.includes('export class App '), 'expected the class to be named App, not AppComponent');
    assert.ok(content.includes("templateUrl: './app.html'"));
    assert.ok(content.includes("styleUrl: './app.scss'"));
  });

  it('padrão TOTVS: title with the app version, profile from the Protheus thread (only inside Protheus) and menu collapsing on navigation', () => {
    const content = buildAppComponentTs(true, 'Meu Projeto');
    assert.ok(content.includes('readonly titulo = `Meu Projeto - v${APP_VERSION}`;'));
    assert.ok(content.includes("import { APP_VERSION } from './app-version';"));
    assert.ok(content.includes('defer(() => threadInfo.getUserInfoThread())'));
    assert.ok(/if \(this\.proAppConfigService\.insideProtheus\(\)\) \{\s*defer/.test(content), 'user lookup must be guarded by insideProtheus()');
    assert.ok(content.includes('this.poMenu().collapse()'));
    assert.ok(content.includes('e instanceof NavigationStart') && content.includes('this.navegando.set(true)'), 'Carregando na troca de tela');
  });

  it('padrão TOTVS: Animalia icons only (po-icon-* does not exist in PO-UI 21)', () => {
    const content = buildAppComponentTs(true, 'X');
    assert.ok(!content.includes('po-icon-'));
    assert.ok(content.includes("icon: 'an an-sign-out'"));
    assert.ok(content.includes("icon: 'an an-house-line'"));
  });
});

describe('buildAppComponentHtml', () => {
  it('padrão TOTVS: toolbar bound to title/profile and a collapsed menu that opens on hover with the TOTVS logos', () => {
    const html = buildAppComponentHtml();
    for (const piece of [
      '[p-title]="titulo"',
      '[p-profile]="perfil()"',
      '[p-profile-actions]="acoesPerfil"',
      '#poMenu',
      '[p-collapsed]="true"',
      '[p-automatic-toggle]="true"',
      '@if (navegando()) {',
      '<po-loading-overlay />',
      'p-logo="assets/logos/totvs.svg"',
      'p-short-logo="assets/logos/totvs-short-symbol.svg"',
    ]) {
      assert.ok(html.includes(piece), piece);
    }
  });
});

describe('STYLES_SCSS / APP_VERSION_TS', () => {
  it('padrão TOTVS: no extra font and no theme token overrides', () => {
    const codigo = STYLES_SCSS.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/Open\+?\s?Sans|@import\s+url|font-family/.test(codigo));
    assert.ok(!/--font-size-|--target-size-/.test(codigo));
    assert.ok(STYLES_SCSS.includes('text-align: right'), 'Quirk #17 fix stays');
  });

  it('exports the version constant used by the toolbar title', () => {
    assert.ok(APP_VERSION_TS.includes("export const APP_VERSION = '1.0.0';"));
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

describe('setAngularJsonStyles — TOTVS logos', () => {
  it('adds the @totvs/common-assets logos to build and test assets once, keeping existing entries', () => {
    const angularJson = {
      projects: {
        x: {
          architect: {
            build: { options: { styles: [], assets: [{ glob: '**/*', input: 'public' }] } },
            test: { options: { assets: [{ glob: '**/*', input: 'public' }] } },
          },
        },
      },
    };
    const once = setAngularJsonStyles(angularJson, 'x');
    const twice = setAngularJsonStyles(once, 'x');
    for (const target of ['build', 'test']) {
      const assets = twice.projects.x.architect[target].options.assets;
      assert.strictEqual(assets.length, 2, target);
      assert.deepStrictEqual(assets[0], { glob: '**/*', input: 'public' });
      assert.deepStrictEqual(assets[1], TOTVS_LOGOS_ASSET);
    }
    assert.strictEqual(angularJson.projects.x.architect.build.options.assets.length, 1, 'input is not mutated');
  });
});
