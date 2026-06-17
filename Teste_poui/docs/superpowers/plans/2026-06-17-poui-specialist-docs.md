# poui-specialist-docs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o repo público `Alscosta1973/poui-specialist-docs` com site Next.js + Fumadocs para divulgação e documentação do plugin `poui-specialist`, hospedado em GitHub Pages.

**Architecture:** Site estático gerado com Next.js 16 + Fumadocs 16 + Tailwind 4. Páginas-chave (home, instalação, agentes, comandos, changelog) escritas manualmente; páginas de templates/componentes/padrões sincronizadas automaticamente do repo privado via GitHub Actions. Deploy automático na branch `gh-pages` a cada push em `main`.

**Tech Stack:** Next.js 16, Fumadocs 16 (fumadocs-ui + fumadocs-mdx + fumadocs-core), Tailwind CSS 4, MDX, GitHub Actions, GitHub Pages.

**IMPORTANTE:** Este plano cria um novo repo `poui-specialist-docs`. Todos os arquivos listados ficam nesse novo repo, não no `Teste_poui`. Execute cada tarefa dentro da pasta clonada do novo repo.

---

## Mapa de Arquivos

```
poui-specialist-docs/
├── .github/workflows/
│   ├── deploy.yml              # build + publish gh-pages
│   └── sync-plugin.yml         # copia .md do plugin privado
├── app/
│   ├── layout.tsx              # RootProvider + i18n PT-BR
│   ├── page.tsx                # landing page completa
│   ├── global.css              # imports Fumadocs + override #0C6C94
│   ├── api/search/route.ts     # busca estática
│   └── docs/
│       ├── layout.tsx          # DocsLayout com sidebar
│       └── [[...slug]]/page.tsx # renderer de cada .mdx
├── components/mdx.tsx          # getMDXComponents
├── lib/
│   ├── layout.shared.tsx       # baseOptions (nav + github url)
│   └── source.ts               # fumadocs source loader
├── content/docs/
│   ├── meta.json               # navegação raiz
│   ├── index.mdx               # página de introdução
│   ├── instalacao.mdx
│   ├── changelog.mdx
│   ├── agentes/
│   │   ├── meta.json
│   │   ├── code-generator.mdx
│   │   └── code-reviewer.mdx
│   ├── comandos/
│   │   ├── meta.json
│   │   ├── generate.mdx
│   │   ├── docs.mdx
│   │   └── review.mdx
│   ├── templates/
│   │   ├── meta.json
│   │   └── index.mdx           # visão geral (placeholder até sync)
│   ├── componentes/
│   │   ├── meta.json
│   │   └── index.mdx
│   └── padroes/
│       ├── meta.json
│       └── index.mdx
├── scripts/
│   └── sync-from-plugin.sh     # chamado pelo workflow de sync
├── source.config.ts
├── next.config.mjs
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

## Task 1: Criar repo GitHub e scaffold inicial

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `source.config.ts`
- Create: `postcss.config.mjs`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `.gitignore`

- [ ] **Step 1: Criar o repo público no GitHub**

```bash
gh repo create Alscosta1973/poui-specialist-docs \
  --public \
  --description "Site de documentação do plugin poui-specialist para Claude Code" \
  --clone
cd poui-specialist-docs
```

- [ ] **Step 2: Criar `package.json`**

```json
{
  "name": "poui-specialist-docs",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@tailwindcss/postcss": "^4.2.1",
    "@types/mdx": "^2.0.13",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "fumadocs-core": "^16.6.17",
    "fumadocs-mdx": "^14.2.10",
    "fumadocs-ui": "^16.6.17",
    "next": "^16.1.7",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3"
  },
  "devDependencies": {
    "@types/node": "25.5.0"
  }
}
```

- [ ] **Step 3: Instalar dependências**

```bash
npm install
```

Expected: node_modules criado, sem erros.

- [ ] **Step 4: Criar `next.config.mjs`**

```js
import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/poui-specialist-docs',
  images: {
    unoptimized: true,
  },
};

const withMDX = createMDX();

export default withMDX(config);
```

- [ ] **Step 5: Criar `source.config.ts`**

```ts
import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig();
```

- [ ] **Step 6: Criar `postcss.config.mjs`**

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 7: Criar `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "collections/*": ["./.source/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".source/**/*.ts",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 8: Criar `.gitignore`**

```
node_modules/
.next/
out/
.source/
```

- [ ] **Step 9: Criar `next-env.d.ts`** (gerado automaticamente pelo `npm run build`, mas necessário para TypeScript)

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 10: Commit inicial**

```bash
git add .
git commit -m "chore: scaffold Next.js + Fumadocs project"
```

---

## Task 2: Infraestrutura de app (layout, source, search, MDX)

**Files:**
- Create: `lib/layout.shared.tsx`
- Create: `lib/source.ts`
- Create: `components/mdx.tsx`
- Create: `app/api/search/route.ts`
- Create: `app/docs/layout.tsx`
- Create: `app/docs/[[...slug]]/page.tsx`

- [ ] **Step 1: Criar `lib/layout.shared.tsx`**

```tsx
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'poui-specialist',
    },
    githubUrl: 'https://github.com/Alscosta1973/poui-specialist',
  };
}
```

- [ ] **Step 2: Criar `lib/source.ts`**

```ts
import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
```

- [ ] **Step 3: Criar `components/mdx.tsx`**

```tsx
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
```

- [ ] **Step 4: Criar `app/api/search/route.ts`**

```ts
import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const search = createFromSource(source);

export const revalidate = false;

export function GET() {
  return search.staticGET();
}
```

- [ ] **Step 5: Criar `app/docs/layout.tsx`**

```tsx
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      sidebar={{
        footer: (
          <div className="text-xs text-fd-muted-foreground text-center py-2 border-t">
            Criado por{' '}
            <a
              href="https://github.com/Alscosta1973"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-fd-foreground hover:underline"
            >
              Andre Costa
            </a>
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
```

- [ ] **Step 6: Criar `app/docs/[[...slug]]/page.tsx`**

```tsx
import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/ components/ app/api/ app/docs/
git commit -m "feat: add app infrastructure (layout, source, search, MDX)"
```

---

## Task 3: Tema PO-UI azul e root layout

**Files:**
- Create: `app/global.css`
- Create: `app/layout.tsx`

- [ ] **Step 1: Criar `app/global.css`**

```css
@import 'tailwindcss';
@import 'fumadocs-ui/css/neutral.css';
@import 'fumadocs-ui/css/preset.css';

:root {
  --color-fd-primary: #0c6c94;
  --color-fd-primary-foreground: #ffffff;
  --color-fd-ring: #0c6c94;
}

.dark {
  --color-fd-primary: #0c6c94;
  --color-fd-primary-foreground: #ffffff;
  --color-fd-ring: #0c6c94;
}
```

- [ ] **Step 2: Criar `app/layout.tsx`**

```tsx
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './global.css';

export const metadata: Metadata = {
  title: {
    default: 'poui-specialist',
    template: '%s | poui-specialist',
  },
  description:
    'Plugin para Claude Code especializado em PO-UI (Portinari) para projetos Angular integrados ao TOTVS Protheus',
  openGraph: {
    title: 'poui-specialist',
    description:
      'Plugin para Claude Code especializado em PO-UI Angular para TOTVS Protheus. 2 agentes, 3 comandos, 16 templates.',
    url: 'https://alscosta1973.github.io/poui-specialist-docs',
    siteName: 'poui-specialist',
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider
          theme={{ defaultTheme: 'dark' }}
          search={{
            options: {
              type: 'static',
              api: '/poui-specialist-docs/api/search',
            },
          }}
          i18n={{
            locale: 'pt-BR',
            translations: {
              search: 'Pesquisar',
              searchNoResult: 'Nenhum resultado encontrado',
              toc: 'Nesta página',
              tocNoHeadings: 'Sem tópicos',
              lastUpdate: 'Última atualização',
              chooseLanguage: 'Escolher idioma',
              nextPage: 'Próxima',
              previousPage: 'Anterior',
              chooseTheme: 'Alternar tema',
              editOnGithub: 'Editar no GitHub',
            },
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Expected: build completa sem erros TypeScript (pode ter warnings sobre páginas ainda não criadas — ok).

- [ ] **Step 4: Commit**

```bash
git add app/global.css app/layout.tsx
git commit -m "feat: apply PO-UI blue theme and root layout"
```

---

## Task 4: Landing page

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 1: Criar `app/page.tsx`**

```tsx
import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

const PLUGIN_VERSION = 'v1.3.0';

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 py-20 md:py-32 gap-6 max-w-4xl mx-auto">
        <div className="flex gap-2 flex-wrap justify-center">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-fd-muted-foreground">
            {PLUGIN_VERSION}
          </span>
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-fd-muted-foreground">
            MIT License
          </span>
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-fd-muted-foreground">
            Claude Code
          </span>
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-fd-muted-foreground">
            PO-UI · Portinari
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          poui-specialist
        </h1>

        <p className="text-lg text-fd-muted-foreground max-w-2xl md:text-xl">
          Plugin para Claude Code especializado em{' '}
          <strong className="text-fd-foreground">PO-UI (Portinari)</strong> para projetos{' '}
          <strong className="text-fd-foreground">Angular</strong> integrados ao{' '}
          <strong className="text-fd-foreground">TOTVS Protheus</strong>
        </p>

        <div className="flex gap-3 mt-2">
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-lg bg-fd-primary text-fd-primary-foreground px-6 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
          >
            Começar
          </Link>
          <a
            href="https://github.com/Alscosta1973/poui-specialist"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center rounded-lg border bg-fd-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-4 pb-12">
        <div className="flex flex-col items-center text-center rounded-xl border bg-fd-card p-6 gap-2">
          <span className="text-3xl font-bold">2</span>
          <span className="text-sm font-medium">Agentes</span>
          <span className="text-xs text-fd-muted-foreground">
            Especializados em geração e review
          </span>
        </div>
        <div className="flex flex-col items-center text-center rounded-xl border bg-fd-card p-6 gap-2">
          <span className="text-3xl font-bold">3</span>
          <span className="text-sm font-medium">Comandos</span>
          <span className="text-xs text-fd-muted-foreground">
            Invocáveis diretamente no Claude Code
          </span>
        </div>
        <div className="flex flex-col items-center text-center rounded-xl border bg-fd-card p-6 gap-2">
          <span className="text-3xl font-bold">16</span>
          <span className="text-sm font-medium">Templates</span>
          <span className="text-xs text-fd-muted-foreground">
            Prontos para adaptar ao seu projeto
          </span>
        </div>
      </section>

      {/* Para quem */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-fd-card p-6">
            <h3 className="text-lg font-semibold mb-3">Para Desenvolvedores Angular</h3>
            <ul className="text-sm text-fd-muted-foreground space-y-2">
              <li>Geração de components PO-UI completos (standalone + OnPush)</li>
              <li>Templates page-list, page-edit, modal-crud, stepper, dashboard</li>
              <li>Integração com REST Protheus — contrato e service prontos</li>
              <li>Review de código com regras de boas práticas, performance e acessibilidade</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-fd-card p-6">
            <h3 className="text-lg font-semibold mb-3">Para Integradores Protheus</h3>
            <ul className="text-sm text-fd-muted-foreground space-y-2">
              <li>Contrato TLPP backend gerado automaticamente</li>
              <li>Padrões de deploy: build, pasta .app, rdmake, appserver.ini</li>
              <li>Referência completa de componentes PO-UI com inputs/outputs</li>
              <li>Quirks e armadilhas documentadas de produção</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Quick Install */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="rounded-xl border bg-fd-card p-6 text-center">
          <h3 className="text-lg font-semibold mb-3">Instalação rápida</h3>
          <div className="bg-fd-background rounded-lg border p-4 text-left font-mono text-sm overflow-x-auto">
            <div className="text-fd-muted-foreground"># Dentro do Claude Code</div>
            <div>/plugin marketplace add Alscosta1973/poui-specialist</div>
            <div>/plugin install poui-specialist@Alscosta1973-poui-specialist</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-fd-muted-foreground space-y-3">
        <p>
          Criado por{' '}
          <a
            href="https://github.com/Alscosta1973"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-fd-foreground hover:underline"
          >
            Andre Costa
          </a>
        </p>
        <p className="text-xs max-w-2xl mx-auto">
          PO-UI, Portinari, TOTVS e Protheus são produtos e marcas registradas de propriedade da TOTVS S.A.
          Este plugin é um projeto independente e não possui vínculo com a TOTVS, suas franquias ou representantes.
        </p>
      </footer>
    </HomeLayout>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: sem erros. A landing page deve compilar corretamente.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add landing page with PO-UI blue theme"
```

---

## Task 5: Estrutura de navegação (meta.json e content/docs/index.mdx)

**Files:**
- Create: `content/docs/meta.json`
- Create: `content/docs/index.mdx`
- Create: `content/docs/agentes/meta.json`
- Create: `content/docs/comandos/meta.json`
- Create: `content/docs/templates/meta.json`
- Create: `content/docs/componentes/meta.json`
- Create: `content/docs/padroes/meta.json`

- [ ] **Step 1: Criar `content/docs/meta.json`**

```json
{
  "title": "Documentação",
  "pages": [
    "---Início---",
    "index",
    "instalacao",
    "---Agentes---",
    "agentes",
    "---Comandos---",
    "comandos",
    "---Templates---",
    "templates",
    "---Componentes PO-UI---",
    "componentes",
    "---Padrões---",
    "padroes",
    "---Extras---",
    "changelog"
  ]
}
```

- [ ] **Step 2: Criar `content/docs/index.mdx`**

```mdx
---
title: Visão Geral
description: Plugin para Claude Code especializado em PO-UI Angular para TOTVS Protheus
---

# poui-specialist

Plugin para Claude Code especializado em **PO-UI (Portinari)** — o design system da TOTVS — para projetos Angular integrados ao Protheus.

## O que ele faz

Adiciona ao Claude Code conhecimento profundo de:

- **Geração de código** — templates prontos para page-list, page-edit, modal-crud, stepper, dashboard e mais 10 tipos
- **Referência de componentes** — inputs, outputs e exemplos de todos os componentes PO-UI
- **Padrões de integração** — como consumir REST Protheus, estrutura de módulos, deploy
- **Review de código** — regras de boas práticas, performance e acessibilidade específicas para PO-UI + Angular

## Estrutura do plugin

| Grupo | Conteúdo |
|-------|----------|
| **Agentes** | `code-generator`, `code-reviewer` |
| **Comandos** | `/generate`, `/docs`, `/review` |
| **Templates** | 16 templates de geração de código |
| **Componentes** | Referência de 11 grupos de componentes PO-UI |
| **Padrões** | Deploy, estrutura de módulos, quirks, REST Protheus |

## Próximos passos

- [Instalação](/docs/instalacao) — como instalar o plugin no Claude Code
- [/generate](/docs/comandos/generate) — gerar um componente PO-UI
- [Code Generator](/docs/agentes/code-generator) — agente de geração de código
```

- [ ] **Step 3: Criar `content/docs/agentes/meta.json`**

```json
{
  "title": "Agentes",
  "pages": ["code-generator", "code-reviewer"]
}
```

- [ ] **Step 4: Criar `content/docs/comandos/meta.json`**

```json
{
  "title": "Comandos",
  "pages": ["generate", "docs", "review"]
}
```

- [ ] **Step 5: Criar `content/docs/templates/meta.json`**

```json
{
  "title": "Templates"
}
```

Sem `pages` — Fumadocs auto-descobre todos os `.mdx` da pasta, incluindo os que o sync vai gerar.

- [ ] **Step 6: Criar `content/docs/componentes/meta.json`**

```json
{
  "title": "Componentes PO-UI"
}
```

- [ ] **Step 7: Criar `content/docs/padroes/meta.json`**

```json
{
  "title": "Padrões"
}
```

- [ ] **Step 8: Commit**

```bash
git add content/
git commit -m "feat: add docs navigation structure and index page"
```

---

## Task 6: Página de instalação

**Files:**
- Create: `content/docs/instalacao.mdx`

- [ ] **Step 1: Criar `content/docs/instalacao.mdx`**

```mdx
---
title: Instalação
description: Como instalar o plugin poui-specialist no Claude Code
---

# Instalação

## Pré-requisitos

- [Claude Code](https://claude.ai/code) instalado e autenticado
- Projeto Angular com `@totvs/po-ui` ou `@po-ui/ng-components` instalado
- Node.js 18+ (para o projeto Angular)

## Instalar o plugin

Execute os dois comandos dentro do Claude Code (não no terminal do sistema):

```bash
/plugin marketplace add Alscosta1973/poui-specialist
/plugin install poui-specialist@Alscosta1973-poui-specialist
```

O primeiro comando adiciona o repositório ao marketplace local. O segundo instala e ativa o plugin na sessão atual.

## Verificar instalação

Após instalar, confirme que os comandos estão disponíveis:

```bash
/poui-specialist:generate --help
/poui-specialist:docs po-table
/poui-specialist:review --help
```

Se os comandos responderem, o plugin está ativo.

## Atualizar o plugin

Para atualizar para uma versão mais recente:

```bash
/plugin update poui-specialist@Alscosta1973-poui-specialist
```

## Desinstalar

```bash
/plugin uninstall poui-specialist@Alscosta1973-poui-specialist
```

## Primeiro uso

Após instalar, o ponto de partida mais comum é gerar um componente:

```bash
/poui-specialist:generate page-list Pedidos --module vendas
```

Veja a página [/generate](/docs/comandos/generate) para todos os tipos disponíveis.
```

- [ ] **Step 2: Commit**

```bash
git add content/docs/instalacao.mdx
git commit -m "docs: add instalacao page"
```

---

## Task 7: Páginas de agentes

**Files:**
- Create: `content/docs/agentes/code-generator.mdx`
- Create: `content/docs/agentes/code-reviewer.mdx`

- [ ] **Step 1: Criar `content/docs/agentes/code-generator.mdx`**

```mdx
---
title: Code Generator
description: Agente especializado em geração de código PO-UI Angular 17+ para TOTVS Protheus
---

# Code Generator

Agente especializado em gerar artifacts Angular 17+ com componentes PO-UI, integrados à API REST do TOTVS Protheus.

## Quando usar

O agente é ativado automaticamente quando você:

- Invoca `/poui-specialist:generate` com qualquer tipo
- Pede para gerar ou criar um componente, página ou service PO-UI
- Fornece um arquivo `.prw` ou `.tlpp` e pede para converter para PO-UI

## Princípios de geração

Todos os artifacts gerados seguem estas regras sem exceção:

| Regra | Detalhe |
|-------|---------|
| **Standalone** | Sempre `standalone: true` — nunca NgModule-based |
| **OnPush** | `changeDetection: ChangeDetectionStrategy.OnPush` em todo componente |
| **Signals** | `signal<T>()` para estado local, `input()` para inputs, `output()` para outputs |
| **Sem `any`** | Interfaces TypeScript definidas para todos os tipos de resposta Protheus |
| **Contrato Protheus** | Services esperam `{ items: T[], hasNext: boolean }` |

## Tipos disponíveis

### Páginas de lista

| Tipo | Quando usar |
|------|-------------|
| `page-list` | Lista simples com busca rápida |
| `page-dynamic-search` | Lista + busca avançada + disclaimers (padrão Protheus) |
| `page-dynamic` | Zero-boilerplate via `PoPageDynamicTableComponent` |
| `master-detail` | Lista com linhas filho expansíveis (pedido/itens) |
| `stacked-browse` | Dois po-table empilhados com navegação por teclado |
| `two-panel-browse` | Dois po-table lado a lado para conciliação/matching |

### Páginas de edição / detalhe

| Tipo | Quando usar |
|------|-------------|
| `page-edit` | Formulário com muitos campos, navega via rota |
| `page-detail` | Detalhe read-only, rota `:id/detalhe` |
| `modal-crud` | Tudo-em-um: lista + modal add/edit (até ~10 campos) |
| `stepper-form` | Formulário wizard multi-etapas com `po-stepper` |

### Outros

| Tipo | Quando usar |
|------|-------------|
| `service` | Service HttpClient consumindo Protheus REST |
| `module` | Estrutura de módulo (routing, barrel) |
| `dashboard` | KPIs com `po-widget` + `po-chart` |
| `models` | Interfaces TypeScript (simples, chave composta, flat relational) |
| `tlpp-contract` | Contrato REST backend com skeleton WsRestFul |
| `refactor` | Converte `.prw`/`.tlpp` existente para PO-UI |

## Exemplo de uso

```bash
# Gerar uma lista de pedidos no módulo vendas
/poui-specialist:generate page-list Pedidos --module vendas

# Gerar formulário de edição
/poui-specialist:generate page-edit EditarPedido --module vendas

# Converter ADVPL existente para PO-UI
/poui-specialist:generate refactor FATA001.prw
```

## O que o agente entrega

Após a geração, você recebe:

1. Lista prévia dos arquivos que serão criados (confirmação antes de escrever)
2. Arquivos `.ts`, `.html` e `.scss` com todo o código funcional
3. Sugestão da rota a adicionar em `app.routes.ts`
4. Verificação automática das entradas de tema PO-UI no `angular.json`
```

- [ ] **Step 2: Criar `content/docs/agentes/code-reviewer.mdx`**

```mdx
---
title: Code Reviewer
description: Agente especializado em review de código PO-UI Angular para boas práticas, performance e acessibilidade
---

# Code Reviewer

Agente especializado em revisar código Angular com componentes PO-UI, identificando problemas de boas práticas, performance e acessibilidade com sugestões de correção acionáveis.

## Quando usar

O agente é ativado automaticamente quando você:

- Invoca `/poui-specialist:review` com um arquivo ou diretório
- Pede para revisar, verificar ou auditar código PO-UI Angular

## Categorias de review

### Boas Práticas (BP)

| ID | Severidade | Regra |
|----|-----------|-------|
| BP-001 | CRITICAL | `ChangeDetectionStrategy.OnPush` ausente |
| BP-002 | WARNING | Uso de tipo `any` |
| BP-003 | WARNING | Observable subscrito sem cleanup (`takeUntilDestroyed`) |
| BP-004 | INFO | `@Input()` legado em vez de `input()` signal |
| BP-005 | INFO | `@Output()/EventEmitter` em vez de `output()` signal |
| BP-006 | WARNING | Manipulação direta do DOM |
| BP-007 | WARNING | Erro ao usuário via `console` ou `alert` em vez de `PoNotificationService` |

### Performance (PERF)

| ID | Severidade | Regra |
|----|-----------|-------|
| PERF-001 | CRITICAL | `track` ausente em `@for` / `trackBy` ausente em `*ngFor` |
| PERF-002 | WARNING | Método que retorna Observable usado diretamente no template |
| PERF-003 | WARNING | Rota eagerly loaded (não lazy) |
| PERF-004 | INFO | Chamada HTTP no constructor em vez de `ngOnInit` |

### Acessibilidade (A11Y)

| ID | Severidade | Regra |
|----|-----------|-------|
| A11Y-001 | WARNING | Campo PO-UI sem `p-label` |
| A11Y-002 | WARNING | `PoTableAction` sem `label` |
| A11Y-003 | INFO | Botão com ícone sem `aria-label` |

## Exemplo de uso

```bash
# Revisar um arquivo
/poui-specialist:review src/app/financeiro/pedidos-list/pedidos-list.component.ts

# Revisar um diretório inteiro
/poui-specialist:review src/app/financeiro/

# Revisar com foco específico
/poui-specialist:review src/app/ --focus performance
/poui-specialist:review src/app/ --focus acessibilidade
```

## Formato do relatório

O agente produz um relatório por arquivo com severidade, localização (linha aproximada), código atual e sugestão de correção:

```
## Review: pedidos-list.component.ts

### CRITICAL (1)
1. **[BP-001]** linha 8 — OnPush ausente
   Atual:    @Component({ standalone: true, ... })
   Sugestão: @Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, ... })

### Resumo: 1 critical, 1 warning, 0 info
```
```

- [ ] **Step 3: Commit**

```bash
git add content/docs/agentes/
git commit -m "docs: add agentes pages (code-generator, code-reviewer)"
```

---

## Task 8: Páginas de comandos

**Files:**
- Create: `content/docs/comandos/generate.mdx`
- Create: `content/docs/comandos/docs.mdx`
- Create: `content/docs/comandos/review.mdx`

- [ ] **Step 1: Criar `content/docs/comandos/generate.mdx`**

```mdx
---
title: /generate
description: Gera artifacts Angular 17+ com PO-UI para integração com TOTVS Protheus
---

# /poui-specialist:generate

Gera artifacts Angular 17+ com componentes PO-UI integrados à API REST do TOTVS Protheus.

## Sintaxe

```bash
/poui-specialist:generate <tipo> <Nome> [--module <modulo>]
```

## Tipos disponíveis

```bash
# Páginas de lista
page-list            # Lista simples com busca rápida
page-dynamic-search  # Lista + busca avançada (padrão Protheus)
page-dynamic         # Zero-boilerplate via PoPageDynamicTableComponent
master-detail        # Lista com linhas filho expansíveis
stacked-browse       # Dois po-table empilhados com teclado ArrowUp/Down
two-panel-browse     # Dois po-table lado a lado para conciliação

# Edição e detalhe
page-edit            # Formulário completo em página separada
page-detail          # Detalhe read-only (rota :id/detalhe)
modal-crud           # Lista + modal add/edit em um componente
stepper-form         # Formulário wizard multi-etapas

# Utilitários
service              # Service HttpClient para Protheus REST
module               # Estrutura de módulo (routing + barrel)
dashboard            # KPIs com po-widget + po-chart
models               # Interfaces TypeScript
tlpp-contract        # Contrato REST backend (WsRestFul)
refactor             # Converte .prw/.tlpp para PO-UI
```

## Exemplos

```bash
# Lista de pedidos no módulo vendas
/poui-specialist:generate page-list Pedidos --module vendas

# Busca avançada de clientes
/poui-specialist:generate page-dynamic-search Clientes --module cadastros

# Formulário de edição de produto
/poui-specialist:generate page-edit EditarProduto --module estoque

# Modal de cadastro rápido
/poui-specialist:generate modal-crud CadastroFornecedor --module compras

# Dashboard com KPIs
/poui-specialist:generate dashboard PainelFinanceiro --module financeiro

# Converter ADVPL para PO-UI
/poui-specialist:generate refactor FATA001.prw

# Contrato TLPP backend
/poui-specialist:generate tlpp-contract Pedidos --module vendas
```

## Fluxo de geração

1. **Planejamento** — o agente apresenta a lista de arquivos que serão criados e pede confirmação
2. **Geração** — escreve os arquivos com código funcional e atribuição `@generated poui-specialist`
3. **Pós-verificação** — verifica entradas do tema PO-UI no `angular.json` e reporta ajustes necessários

## Convenções de nomenclatura

| Elemento | Convenção | Exemplo (nome: `PedidosList`, módulo: `vendas`) |
|----------|-----------|--------------------------------------------------|
| Seletor CSS | `app-` + kebab-case | `app-pedidos-list` |
| Classe | PascalCase + sufixo | `PedidosListComponent` |
| Arquivo | kebab-case.component.ts | `pedidos-list.component.ts` |
| Diretório | `src/app/<modulo>/<kebab>/` | `src/app/vendas/pedidos-list/` |
```

- [ ] **Step 2: Criar `content/docs/comandos/docs.mdx`**

```mdx
---
title: /docs
description: Consulta documentação de componentes PO-UI diretamente no Claude Code
---

# /poui-specialist:docs

Consulta a documentação de componentes PO-UI a partir da skill de referência embutida no plugin — sem precisar abrir o browser.

## Sintaxe

```bash
/poui-specialist:docs <nome-do-componente>
```

## Exemplos

```bash
/poui-specialist:docs po-table
/poui-specialist:docs po-lookup
/poui-specialist:docs po-page-edit
/poui-specialist:docs po-input
/poui-specialist:docs po-select
/poui-specialist:docs po-modal
/poui-specialist:docs po-dynamic-form
/poui-specialist:docs po-chart
```

## O que retorna

Para cada componente, o comando retorna:

- **Descrição** — o que o componente faz e quando usar
- **Inputs** (`@Input()`) — todos os atributos com tipo, obrigatoriedade e descrição
- **Outputs** (`@Output()`) — todos os eventos com tipo do payload
- **Exemplo de uso** — código HTML e TypeScript prontos para copiar
- **Quirks** — comportamentos não óbvios documentados de produção (quando existem)

## Cobertura

O comando cobre todos os componentes PO-UI documentados na skill `poui-components`:

- Campos de formulário (`po-input`, `po-select`, `po-combo`, `po-lookup`, `po-datepicker`, etc.)
- Tabelas (`po-table`, `po-dynamic-table`)
- Páginas (`po-page-list`, `po-page-edit`, `po-page-default`, `po-page-detail`)
- Modais e overlays (`po-modal`, `po-dialog`, `po-popover`)
- Navegação (`po-menu`, `po-breadcrumb`, `po-tabs`, `po-stepper`)
- Feedback (`po-notification`, `po-loading`, `po-progress`)
- Formulários dinâmicos (`po-dynamic-form`, `po-dynamic-view`)
- Utilitários (`po-divider`, `po-widget`, `po-chart`, `po-tag`)
```

- [ ] **Step 3: Criar `content/docs/comandos/review.mdx`**

```mdx
---
title: /review
description: Revisa código PO-UI Angular para boas práticas, performance e acessibilidade
---

# /poui-specialist:review

Revisa código Angular com componentes PO-UI contra regras estabelecidas de boas práticas, performance e acessibilidade.

## Sintaxe

```bash
/poui-specialist:review <arquivo|diretório> [--focus <categoria>]
```

## Categorias de foco

| Flag | Regras aplicadas |
|------|-----------------|
| `boas-praticas` | OnPush, tipagem, signals, unsubscribe |
| `performance` | trackBy, AsyncPipe, lazy loading |
| `acessibilidade` | p-label, aria-label |
| `all` | Todas as categorias (padrão) |

## Exemplos

```bash
# Revisar um arquivo específico
/poui-specialist:review src/app/financeiro/pedidos-list/pedidos-list.component.ts

# Revisar um módulo inteiro
/poui-specialist:review src/app/financeiro/

# Focar apenas em performance
/poui-specialist:review src/app/ --focus performance

# Focar em acessibilidade
/poui-specialist:review src/app/ --focus acessibilidade
```

## Severidades

| Severidade | Significado |
|-----------|-------------|
| **CRITICAL** | Causa bug em produção ou degradação severa de performance |
| **WARNING** | Viola boas práticas estabelecidas, pode causar problemas futuros |
| **INFO** | Sugestão de modernização (Angular 17+ signals, etc.) |

Veja o agente [Code Reviewer](/docs/agentes/code-reviewer) para a lista completa de regras.
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add content/docs/comandos/
git commit -m "docs: add comandos pages (generate, docs, review)"
```

---

## Task 9: Changelog e páginas placeholder das seções sincronizadas

**Files:**
- Create: `content/docs/changelog.mdx`
- Create: `content/docs/templates/index.mdx`
- Create: `content/docs/componentes/index.mdx`
- Create: `content/docs/padroes/index.mdx`

- [ ] **Step 1: Criar `content/docs/changelog.mdx`**

```mdx
---
title: Changelog
description: Histórico de versões do plugin poui-specialist
---

# Changelog

## [1.3.0] — 2026-06-11

### Fixed
- Corrige instrução incorreta de `p-selected-rows` no agente (propriedade não existe na biblioteca)
- Remove `'tag'` da lista de tipos válidos de `PoTableColumn`
- Adiciona `stacked-browse` e `two-panel-browse` ao comando `/generate`
- Adiciona `deploy-protheus.md` ao índice da skill `poui-patterns`

### Added
- Tipos `models` e `tlpp-contract` listados no comando `/generate` com exemplos
- Este arquivo de Changelog

## [1.2.0] — 2026-06-09

### Added
- Template `stacked-browse` — dois po-table empilhados com navegação por teclado (ArrowUp/Down, Tab)
- Template `two-panel-browse` — painéis lado a lado para conciliação/matching
- Template `refactor-from-tlpp` — converte `.prw`/`.tlpp` existente para PO-UI
- `po-ui-quirks.md` com quirks documentados de produção
- `deploy-protheus.md` — build, pasta `.app`, rdmake, `appserver.ini`
- Template `tlpp-contract` — contrato REST backend com skeleton WsRestFul
- Template `models` — interfaces TypeScript (simples, chave composta, flat relational)

## [1.1.0] — 2026-06-03

### Added
- Skill `poui-components` com 9 arquivos de referência de componentes
- Skill `poui-patterns` com `module-structure.md`, `protheus-rest.md`, `po-ui-quirks.md`
- Template `master-detail` — lista com linhas filho expansíveis via `po-table detail`
- Template `stepper-form` — formulário wizard multi-etapas com `po-stepper`
- Template `page-detail` — tela de detalhe read-only com rota `:id`
- Template `page-dynamic` — lista zero-boilerplate via `PoPageDynamicTableComponent`
- Template `dashboard` — página de analytics com `po-widget` + `po-chart`

## [1.0.0] — 2026-05-28

### Added
- Versão inicial do plugin
- Templates: `page-list`, `page-dynamic-search`, `page-edit`, `modal-crud`, `service`, `module`
- Skill `poui-code-generation` com guia de seleção de template e regras críticas
- Agentes `code-generator` e `code-reviewer`
- Comandos `/generate`, `/review`, `/docs`
```

- [ ] **Step 2: Criar `content/docs/templates/index.mdx`**

```mdx
---
title: Templates
description: Templates de geração de código PO-UI Angular para TOTVS Protheus
---

# Templates

Esta seção é sincronizada automaticamente a partir da skill `poui-code-generation` do plugin.

Os templates disponíveis cobrem todos os tipos suportados pelo comando [/generate](/docs/comandos/generate).

> **Nota:** O conteúdo detalhado de cada template é sincronizado via CI. Após o primeiro sync, cada tipo terá sua própria página nesta seção.

## Tipos disponíveis

| Template | Descrição |
|----------|-----------|
| `page-list` | Lista com busca rápida (`po-page-list`) |
| `page-dynamic-search` | Lista + busca avançada (padrão Protheus) |
| `page-dynamic` | Zero-boilerplate via `PoPageDynamicTableComponent` |
| `master-detail` | Lista com linhas filho expansíveis |
| `stacked-browse` | Dois po-table empilhados com teclado |
| `two-panel-browse` | Dois po-table lado a lado para conciliação |
| `page-edit` | Formulário com rota separada |
| `page-detail` | Detalhe read-only |
| `modal-crud` | Lista + modal add/edit |
| `stepper-form` | Formulário wizard multi-etapas |
| `service` | Service HttpClient para REST Protheus |
| `module` | Estrutura de módulo (routing + barrel) |
| `dashboard` | KPIs com po-widget + po-chart |
| `models` | Interfaces TypeScript |
| `tlpp-contract` | Contrato REST backend WsRestFul |
| `refactor-from-tlpp` | Converte ADVPL existente para PO-UI |
```

- [ ] **Step 3: Criar `content/docs/componentes/index.mdx`**

```mdx
---
title: Componentes PO-UI
description: Referência de inputs, outputs e exemplos dos componentes PO-UI
---

# Componentes PO-UI

Esta seção é sincronizada automaticamente a partir da skill `poui-components` do plugin.

Após o primeiro sync, cada grupo de componentes terá sua própria página com inputs, outputs e exemplos de uso.

## Grupos de componentes

| Grupo | Componentes principais |
|-------|----------------------|
| **Campos de formulário** | `po-input`, `po-select`, `po-combo`, `po-lookup`, `po-datepicker`, `po-decimal` |
| **Tabelas** | `po-table`, `po-dynamic-table` |
| **Páginas** | `po-page-list`, `po-page-edit`, `po-page-default`, `po-page-detail` |
| **Modais e overlays** | `po-modal`, `po-dialog`, `po-popover` |
| **Navegação** | `po-menu`, `po-breadcrumb`, `po-tabs`, `po-stepper` |
| **Feedback** | `po-notification`, `po-loading`, `po-progress` |
| **Formulários dinâmicos** | `po-dynamic-form`, `po-dynamic-view` |
| **Páginas dinâmicas** | `po-page-dynamic-table`, `po-page-dynamic-edit`, `po-page-dynamic-detail` |
| **Utilitários** | `po-divider`, `po-widget`, `po-chart`, `po-tag`, `po-avatar` |

Use o comando [/docs](/docs/comandos/docs) para consultar qualquer componente diretamente no Claude Code.
```

- [ ] **Step 4: Criar `content/docs/padroes/index.mdx`**

```mdx
---
title: Padrões
description: Padrões de integração, estrutura de módulos e deploy para projetos PO-UI + Protheus
---

# Padrões

Esta seção é sincronizada automaticamente a partir da skill `poui-patterns` do plugin.

## Conteúdo

| Padrão | Descrição |
|--------|-----------|
| **deploy-protheus** | Build Angular, pasta `.app`, rdmake e configuração do `appserver.ini` |
| **module-structure** | Estrutura recomendada de módulos Angular para projetos Protheus |
| **protheus-rest** | Padrões de consumo da API REST Protheus — autenticação, paginação, erros |
| **po-ui-quirks** | Comportamentos não óbvios documentados de produção — armadilhas conhecidas |
```

- [ ] **Step 5: Verificar build final**

```bash
npm run build
```

Expected: build sem erros, diretório `out/` gerado com todos os arquivos estáticos.

- [ ] **Step 6: Commit**

```bash
git add content/docs/changelog.mdx content/docs/templates/ content/docs/componentes/ content/docs/padroes/
git commit -m "docs: add changelog and placeholder pages for synced sections"
```

---

## Task 10: Script de sync do plugin

**Files:**
- Create: `scripts/sync-from-plugin.sh`

- [ ] **Step 1: Criar `scripts/sync-from-plugin.sh`**

```bash
#!/usr/bin/env bash
# Copia skills do plugin privado (clonado em $1) para content/docs/
# Uso: ./scripts/sync-from-plugin.sh <caminho-do-plugin-clonado>
set -euo pipefail

PLUGIN_DIR="${1:?Informe o diretório do plugin clonado}"
DOCS_DIR="$(dirname "$0")/../content/docs"

add_frontmatter() {
  local src="$1"
  local dest="$2"
  local title description

  # Extrai título da primeira linha H1
  title=$(grep -m1 '^# ' "$src" | sed 's/^# //' || echo "$(basename "$src" .md)")
  # Extrai descrição do primeiro parágrafo não-vazio após o título
  description=$(awk '/^# /{found=1;next} found && /^[^#\-\|]/ && NF>0{print;exit}' "$src" \
    | sed 's/["`*_]//g' | cut -c1-120 || echo "")

  {
    echo "---"
    echo "title: $title"
    [ -n "$description" ] && echo "description: \"$description\""
    echo "---"
    echo ""
    cat "$src"
  } > "$dest"
}

# Templates (poui-code-generation)
mkdir -p "$DOCS_DIR/templates"
for f in "$PLUGIN_DIR/skills/poui-code-generation"/*.md; do
  [ -f "$f" ] || continue
  name=$(basename "$f" .md)
  [ "$name" = "SKILL" ] && continue
  dest="$DOCS_DIR/templates/${name}.mdx"
  add_frontmatter "$f" "$dest"
  echo "Synced: templates/${name}.mdx"
done

# Componentes (poui-components)
mkdir -p "$DOCS_DIR/componentes"
for f in "$PLUGIN_DIR/skills/poui-components"/*.md; do
  [ -f "$f" ] || continue
  name=$(basename "$f" .md)
  [ "$name" = "SKILL" ] && continue
  dest="$DOCS_DIR/componentes/${name}.mdx"
  add_frontmatter "$f" "$dest"
  echo "Synced: componentes/${name}.mdx"
done

# Padrões (poui-patterns)
mkdir -p "$DOCS_DIR/padroes"
for f in "$PLUGIN_DIR/skills/poui-patterns"/*.md; do
  [ -f "$f" ] || continue
  name=$(basename "$f" .md)
  [ "$name" = "SKILL" ] && continue
  dest="$DOCS_DIR/padroes/${name}.mdx"
  add_frontmatter "$f" "$dest"
  echo "Synced: padroes/${name}.mdx"
done

echo "Sync concluído."
```

- [ ] **Step 2: Tornar o script executável e testar a sintaxe**

```bash
chmod +x scripts/sync-from-plugin.sh
bash -n scripts/sync-from-plugin.sh
```

Expected: sem erros de sintaxe.

- [ ] **Step 3: Commit**

```bash
git add scripts/
git commit -m "feat: add sync-from-plugin.sh script"
```

---

## Task 11: GitHub Actions — Deploy

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Criar `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
          publish_branch: gh-pages
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add deploy workflow for GitHub Pages"
```

---

## Task 12: GitHub Actions — Sync do Plugin

**Files:**
- Create: `.github/workflows/sync-plugin.yml`

- [ ] **Step 1: Criar `.github/workflows/sync-plugin.yml`**

```yaml
name: Sync from Plugin

on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Motivo do sync (ex: release v1.4.0)'
        required: false
        default: 'manual sync'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout docs repo
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup SSH for plugin repo
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.PLUGIN_DEPLOY_KEY }}

      - name: Clone plugin repo (read-only)
        run: |
          git clone git@github.com:Alscosta1973/poui-specialist.git /tmp/poui-specialist

      - name: Run sync script
        run: |
          bash scripts/sync-from-plugin.sh /tmp/poui-specialist

      - name: Commit synced files
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add content/docs/templates/ content/docs/componentes/ content/docs/padroes/
          if git diff --cached --quiet; then
            echo "Nenhuma mudança detectada."
          else
            git commit -m "chore(sync): atualiza templates/componentes/padrões do plugin"
            git push
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/sync-plugin.yml
git commit -m "ci: add sync-plugin workflow"
```

---

## Task 13: Configurar GitHub Pages e fazer deploy

- [ ] **Step 1: Push de tudo para o repo remoto**

```bash
git push origin main
```

- [ ] **Step 2: Habilitar GitHub Pages no repositório**

Acesse: `https://github.com/Alscosta1973/poui-specialist-docs/settings/pages`

Configuração:
- **Source:** Deploy from a branch
- **Branch:** `gh-pages`
- **Folder:** `/ (root)`

Clique **Save**.

- [ ] **Step 3: Aguardar o workflow de deploy**

```bash
gh run list --repo Alscosta1973/poui-specialist-docs --limit 5
```

Aguarde o workflow `Deploy to GitHub Pages` completar (status: `completed`).

- [ ] **Step 4: Verificar o site**

Abra `https://alscosta1973.github.io/poui-specialist-docs` no browser.

Expected: landing page com tema azul PO-UI, stats cards (2 Agentes, 3 Comandos, 16 Templates), links de docs funcionando.

- [ ] **Step 5: Criar a deploy key para o repo privado (para o sync)**

```bash
# Gerar par de chaves (sem passphrase)
ssh-keygen -t ed25519 -C "poui-specialist-docs-sync" -f ~/.ssh/poui_sync_key -N ""

# Exibir a chave pública (vai para o repo privado)
cat ~/.ssh/poui_sync_key.pub

# Exibir a chave privada (vai para o secret do repo docs)
cat ~/.ssh/poui_sync_key
```

- [ ] **Step 6: Adicionar a chave pública ao repo privado**

Acesse: `https://github.com/Alscosta1973/poui-specialist/settings/keys`
- Clique **Add deploy key**
- Title: `poui-specialist-docs sync`
- Key: cole o conteúdo de `~/.ssh/poui_sync_key.pub`
- **Allow write access:** desmarcado (read-only)
- Clique **Add key**

- [ ] **Step 7: Adicionar a chave privada como secret no repo docs**

Acesse: `https://github.com/Alscosta1973/poui-specialist-docs/settings/secrets/actions`
- Clique **New repository secret**
- Name: `PLUGIN_DEPLOY_KEY`
- Value: cole o conteúdo de `~/.ssh/poui_sync_key`
- Clique **Add secret**

- [ ] **Step 8: Testar o workflow de sync manualmente**

```bash
gh workflow run sync-plugin.yml \
  --repo Alscosta1973/poui-specialist-docs \
  --field reason="primeiro sync"
```

Aguarde completar e verifique o site atualizado com as páginas de templates, componentes e padrões.

---

## Verificação Final

- [ ] Landing page abre em `https://alscosta1973.github.io/poui-specialist-docs`
- [ ] Tema azul PO-UI (#0C6C94) visível nos botões e badges
- [ ] Dark mode ativo por padrão
- [ ] Navegação de docs funciona (Instalação, Agentes, Comandos, Templates, Componentes, Padrões, Changelog)
- [ ] Busca (⌘K) retorna resultados
- [ ] Páginas de agentes e comandos carregam com conteúdo correto
- [ ] Workflow de sync rodou e gerou páginas em templates/, componentes/, padroes/
- [ ] Link "GitHub" no nav aponta para `https://github.com/Alscosta1973/poui-specialist`
