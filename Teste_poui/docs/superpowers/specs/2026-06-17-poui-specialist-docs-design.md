# Design: Site de Documentação poui-specialist

**Data:** 2026-06-17
**Status:** Aprovado

---

## Contexto

O plugin `poui-specialist` (repo privado `Alscosta1973/poui-specialist`) precisa de uma página pública de divulgação e documentação, similar ao site do `advpl-specialist` em `thalysjuvenal.github.io/advpl-specialist`. O objetivo é tornar o plugin descobrível e documentar agentes, comandos e templates para usuários.

---

## Decisões

| Questão | Decisão |
|---------|---------|
| Repo | Novo repo público `Alscosta1973/poui-specialist-docs` |
| Stack | Next.js 15 + Fumadocs 16 + Tailwind 4 |
| Cor primária | `#0C6C94` (PO-UI blue / Portinari) |
| Hospedagem | GitHub Pages (branch `gh-pages`) |
| URL final | `https://alscosta1973.github.io/poui-specialist-docs` |
| Conteúdo | Híbrido: páginas-chave escritas manualmente, templates/componentes/padrões sincronizados via CI do plugin privado |
| Idioma | Português brasileiro |

---

## Arquitetura

```
Alscosta1973/poui-specialist (privado)   Alscosta1973/poui-specialist-docs (público)
  └─ skills/poui-code-generation/  ──────────────► content/docs/templates/
  └─ skills/poui-components/       ──────────────► content/docs/componentes/
  └─ skills/poui-patterns/         ──────────────► content/docs/padroes/
  └─ CHANGELOG.md                  (lido na implementação inicial)
```

O repo `poui-specialist-docs` é o source de verdade do site. O plugin privado é source de verdade do conteúdo técnico (templates, componentes, padrões).

---

## Estrutura do Repo `poui-specialist-docs`

```
poui-specialist-docs/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # build + publish gh-pages
│       └── sync-plugin.yml     # copia .md do plugin privado
├── app/
│   ├── layout.tsx
│   ├── page.tsx                # landing page
│   ├── global.css              # tema azul PO-UI
│   ├── api/search/route.ts
│   └── docs/
│       ├── layout.tsx
│       └── [[...slug]]/page.tsx
├── components/
│   └── mdx.tsx
├── content/
│   └── docs/
│       ├── meta.json
│       ├── index.mdx           # home
│       ├── instalacao.mdx
│       ├── changelog.mdx
│       ├── agentes/
│       │   ├── meta.json
│       │   ├── code-generator.mdx
│       │   └── code-reviewer.mdx
│       ├── comandos/
│       │   ├── meta.json
│       │   ├── generate.mdx
│       │   ├── docs.mdx
│       │   └── review.mdx
│       ├── templates/          ← sincronizado via CI (16 arquivos)
│       │   └── meta.json
│       ├── componentes/        ← sincronizado via CI (11 arquivos)
│       │   └── meta.json
│       └── padroes/            ← sincronizado via CI (4 arquivos)
│           └── meta.json
├── lib/
│   └── layout.shared.ts
├── source.config.ts
├── next.config.mjs
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

## Landing Page (`app/page.tsx`)

Seções em ordem:

1. **Nav** — logo `poui-specialist` + links (Docs, Agentes, Templates, ⌘K busca, GitHub)
2. **Hero** — badges (v1.3.0, MIT, Claude Code, PO-UI · Portinari) + título + subtítulo + botões "Começar" / "GitHub"
3. **Stats cards** — 2 Agentes / 3 Comandos / 16 Templates
4. **Para quem** — dois cards: "Para Desenvolvedores Angular" e "Para Integradores Protheus"
5. **Instalação rápida** — bloco de código com os dois comandos `/plugin`
6. **Footer** — "Criado por Andre Costa | LinkedIn" + disclaimer TOTVS

Tema: dark por padrão com suporte a light. Cor primária `#0C6C94`, badges com `border: 1px solid #0c6c9450`, botão CTA com `background: #0C6C94`.

---

## Navegação de Docs (sidebar)

```
📖 Documentação
  ├── Início
  ├── Instalação
  ├── Changelog
  ├── Agentes
  │   ├── Code Generator
  │   └── Code Reviewer
  ├── Comandos
  │   ├── /generate
  │   ├── /docs
  │   └── /review
  ├── Templates          (16 páginas, via CI)
  ├── Componentes PO-UI  (11 páginas, via CI)
  └── Padrões            (4 páginas, via CI)
```

---

## Páginas de Conteúdo

### Escritas na implementação inicial (não entram no sync automático)

| Arquivo | Fonte do conteúdo |
|---------|-------------------|
| `instalacao.mdx` | Comando de install, pré-requisitos Angular/Claude Code |
| `agentes/code-generator.mdx` | `agents/code-generator.md` do plugin |
| `agentes/code-reviewer.mdx` | `agents/code-reviewer.md` do plugin |
| `comandos/generate.mdx` | `commands/generate.md` do plugin |
| `comandos/docs.mdx` | `commands/docs.md` do plugin |
| `comandos/review.mdx` | `commands/review.md` do plugin |
| `changelog.mdx` | `CHANGELOG.md` do plugin |

### Sincronizadas via CI

| Destino | Fonte | Arquivos |
|---------|-------|----------|
| `content/docs/templates/` | `skills/poui-code-generation/*.md` | 16 |
| `content/docs/componentes/` | `skills/poui-components/*.md` | 11 |
| `content/docs/padroes/` | `skills/poui-patterns/*.md` | 4 |

O script de sync adiciona frontmatter MDX mínimo (`title`, `description`) extraído da primeira linha H1 e do primeiro parágrafo de cada arquivo.

---

## Workflows GitHub Actions

### `deploy.yml` — Build e Publish

```yaml
# Dispara em push para main
# Jobs: checkout → setup-node → npm ci → npm run build → deploy gh-pages
```

Usa `peaceiris/actions-gh-pages` para publicar o diretório `/out` (Next.js static export) na branch `gh-pages`.

### `sync-plugin.yml` — Sync do Plugin

```yaml
# Dispara: workflow_dispatch (manual) OU webhook do repo privado
# Secrets necessários: PLUGIN_DEPLOY_KEY (deploy key read-only no poui-specialist)
```

Passos:
1. Clona `poui-specialist` com a deploy key
2. Copia `skills/poui-code-generation/*.md` → `content/docs/templates/`
3. Copia `skills/poui-components/*.md` → `content/docs/componentes/`
4. Copia `skills/poui-patterns/*.md` → `content/docs/padroes/`
5. Adiciona frontmatter MDX em cada arquivo copiado
6. `git commit && git push` → dispara `deploy.yml` automaticamente

---

## Configuração Necessária (pós-criação do repo)

1. Criar deploy key read-only no repo privado `poui-specialist` (Settings → Deploy keys)
2. Adicionar a chave privada como secret `PLUGIN_DEPLOY_KEY` no repo `poui-specialist-docs`
3. Habilitar GitHub Pages na branch `gh-pages` (Settings → Pages)
4. (Opcional) Configurar webhook no repo privado para disparar `sync-plugin.yml` automaticamente

---

## Tema / Customização Fumadocs

Sobrescrever variáveis CSS no `app/global.css`:

```css
:root {
  --color-fd-primary: #0C6C94;
  --color-fd-primary-foreground: #ffffff;
}
```

Configurar `source.config.ts` com `fumadocs-mdx` e rota de busca em `app/api/search/route.ts`.

---

## Fora de Escopo

- Internacionalização (site somente em PT-BR)
- Autenticação ou área restrita
- Blog ou release notes além do changelog
- Integração com npm/registry
