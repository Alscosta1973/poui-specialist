# PO-UI 21.x Coherence + Release v1.9.0

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar o plugin poui-specialist para compatibilidade com PO-UI 21.22.0 (Angular 21), configurar `commit-and-tag-version` para releases automatizados, e lançar v1.9.0.

**Architecture:** O plugin em si não muda de API — apenas referências de versão e compatibilidade. O test project (Teste_poui) é atualizado para Angular 21 + PO-UI 21 para validar os templates. O `commit-and-tag-version` é adicionado via root `package.json` configurado para atualizar `plugin.json` além do próprio `package.json`.

**Tech Stack:** Angular 21, @po-ui/ng-components 21.22.0, Node.js, commit-and-tag-version (fork mantido do standard-version)

## Global Constraints

- Plugin root: `C:\totvs\projetos\claude\poui-specialist`
- Test project: `C:\totvs\projetos\claude\poui-specialist\Teste_poui`
- Versão atual do plugin: `1.8.0` (em `.claude-plugin/plugin.json`)
- Target: `1.9.0` (minor — compatibilidade Angular 21 é feature, não breaking change para o plugin)
- **Escopo HARD**: corrigir apenas erros de compilação reais — nenhum novo template, padrão ou feature
- Commits seguem Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Autor: Andre Costa (nunca Claude como co-autor)

---

## Task 1: Upgrade test project para Angular 21 + PO-UI 21.22.0

**Files:**
- Modify: `Teste_poui/package.json`

**Goal:** Atualizar todas as dependências para versões Angular 21 / PO-UI 21.

- [ ] **Step 1: Atualizar package.json**

Substituir o conteúdo de `Teste_poui/package.json` por:

```json
{
  "name": "teste-poui",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve --proxy-config proxy.conf.json",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^21.0.0",
    "@angular/common": "^21.0.0",
    "@angular/compiler": "^21.0.0",
    "@angular/core": "^21.0.0",
    "@angular/forms": "^21.0.0",
    "@angular/platform-browser": "^21.0.0",
    "@angular/platform-browser-dynamic": "^21.0.0",
    "@angular/router": "^21.0.0",
    "@angular/cdk": "^21.0.0",
    "@po-ui/ng-components": "^21.22.0",
    "@po-ui/ng-templates": "^21.22.0",
    "@totvs/po-theme": "^21.22.0",
    "@totvs/protheus-lib-core": "^21.0.0",
    "rxjs": "~7.8.0",
    "subsink": "^1.0.2",
    "tslib": "^2.6.0",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^21.0.0",
    "@angular/cli": "~21.0.0",
    "@angular/compiler-cli": "^21.0.0",
    "@types/jasmine": "^6.0.0",
    "jasmine-core": "^6.3.0",
    "karma": "^6.4.4",
    "karma-chrome-launcher": "^3.2.0",
    "karma-coverage": "^2.2.1",
    "karma-jasmine": "^5.1.0",
    "karma-jasmine-html-reporter": "^2.2.0",
    "playwright": "^1.60.0",
    "typescript": "~5.7.0"
  }
}
```

- [ ] **Step 2: Instalar dependências**

```powershell
cd Teste_poui
npm install
```

Expected: instala sem erros críticos (warnings de peer deps são OK).

- [ ] **Step 3: Rodar build para capturar erros reais**

```powershell
npx ng build 2>&1 | Tee-Object -FilePath "../build-errors-ng21.txt"
```

Expected: lista de erros de compilação OU "Build at: ... - Time: Xms".

- [ ] **Step 4: Documentar erros encontrados**

Abrir `build-errors-ng21.txt` e anotar apenas erros do tipo:
- `TS2339: Property 'X' does not exist`
- `NG8001: 'po-X' is not a known element`
- `NG8002: Can't bind to 'p-X' since it isn't a known property`
- `Module not found: Error: Can't resolve '@po-ui/...`

Ignorar: warnings, deprecation notices, performance hints.

- [ ] **Step 5: Commit parcial**

```bash
git -C .. add Teste_poui/package.json Teste_poui/package-lock.json
git -C .. commit -m "chore(deps): upgrade test project to Angular 21 + PO-UI 21.22.0"
```

---

## Task 2: Corrigir erros de compilação nos templates

**Files:**
- Modify: arquivos listados nos erros de `build-errors-ng21.txt`
- Escopo: **APENAS** erros `NG8001`, `NG8002`, `TS2339` — sem tocar em nada mais

**Goal:** Templates compilam corretamente no Angular 21 + PO-UI 21.

- [ ] **Step 1: Para cada erro NG8001/NG8002 (componente desconhecido)**

Verificar se o import module mudou. Padrão de investigação:

```powershell
# Verificar se seletor existe no @po-ui/ng-components 21
cd Teste_poui
node -e "const m = require('@po-ui/ng-components'); console.log(Object.keys(m).filter(k => k.toLowerCase().includes('NOME_COMPONENTE')))"
```

Corrigir o import no template afetado dentro do plugin.

- [ ] **Step 2: Para cada erro TS2339 (propriedade inexistente)**

Verificar se Input/Output foi renomeado ou removido:

```powershell
node -e "
const m = require('@po-ui/ng-components');
// Inspecionar a classe do componente afetado
"
```

Atualizar o template correspondente em `skills/poui-code-generation/templates-*.md`.

- [ ] **Step 3: Verificar se `@totvs/po-theme` e `@totvs/protheus-lib-core` existem na versão 21**

```powershell
npm show @totvs/po-theme@21 version 2>$null
npm show @totvs/protheus-lib-core@21 version 2>$null
```

Se não existir versão 21 de algum pacote TOTVS:
- Manter a versão anterior (`^17.0.0`) e documentar no CHANGELOG como "TOTVS libs mantidas em v17 até disponibilidade de v21"
- Atualizar o `package.json` de volta para a versão disponível desse pacote específico

- [ ] **Step 4: Rodar build de verificação**

```powershell
npx ng build
```

Expected: compilação limpa (`Build successful`). Se ainda houver erros, repetir Steps 1-3 para cada erro restante.

- [ ] **Step 5: Commit dos fixes**

```bash
git -C .. add skills/ agents/ Teste_poui/
git -C .. commit -m "fix(templates): align with PO-UI 21.x APIs — update imports and removed properties"
```

---

## Task 3: Atualizar referências de versão no plugin

**Files:**
- Modify: `README.md`
- Modify: `skills/poui-code-generation/SKILL.md`
- Modify: `agents/code-generator.md`
- Modify: `skills/poui-components/SKILL.md`

**Goal:** Todas as referências a "Angular 17+" passam a dizer "Angular 17–21+" para comunicar suporte amplo.

- [ ] **Step 1: Atualizar README.md**

Localizar e substituir (todas as ocorrências):
- `"Angular 17+"` → `"Angular 17–21+"`
- `"@po-ui/ng-components ^17"` → `"@po-ui/ng-components ^17 | ^19 | ^21"`
- `"Angular 17.3+"` → `"Angular 17.3–21+"`

- [ ] **Step 2: Atualizar SKILL.md do code-generation**

No arquivo `skills/poui-code-generation/SKILL.md`, substituir:
- Qualquer menção a `^17.0.0` como version de referência por `^21.22.0`
- Manter `Angular 17+` apenas onde for compatibilidade mínima

- [ ] **Step 3: Atualizar agents/code-generator.md**

Na linha de description do frontmatter e no texto:
- `Angular 17+` → `Angular 17–21+`

- [ ] **Step 4: Commit**

```bash
git -C .. add README.md skills/poui-code-generation/SKILL.md agents/code-generator.md skills/poui-components/SKILL.md
git -C .. commit -m "docs: update Angular/PO-UI version range to 17-21+ throughout plugin"
```

---

## Task 4: Configurar commit-and-tag-version

**Files:**
- Create: `package.json` (root do plugin)
- Create: `.versionrc.json`

**Goal:** `npx commit-and-tag-version` substitui o bumping manual — detecta tipo de bump pelo git log, atualiza CHANGELOG.md, bump `plugin.json` e `package.json`, cria tag git.

> **Nota:** `commit-and-tag-version` é o fork mantido de `standard-version` (que foi descontinuado em Set/2022). Mesmos conceitos, mesma CLI, mesma configuração.

- [ ] **Step 1: Criar root package.json**

Criar `package.json` na raiz do plugin:

```json
{
  "name": "poui-specialist",
  "version": "1.8.0",
  "description": "Claude Code plugin — PO-UI Angular 17–21+ specialist for TOTVS Protheus",
  "private": true,
  "scripts": {
    "release": "commit-and-tag-version",
    "release:minor": "commit-and-tag-version --release-as minor",
    "release:patch": "commit-and-tag-version --release-as patch",
    "release:major": "commit-and-tag-version --release-as major",
    "bump": "node scripts/bump-version.js"
  },
  "devDependencies": {
    "commit-and-tag-version": "^12.0.0"
  }
}
```

- [ ] **Step 2: Instalar commit-and-tag-version**

```powershell
cd C:\totvs\projetos\claude\poui-specialist
npm install
```

Expected: cria `node_modules/` e `package-lock.json`.

- [ ] **Step 3: Criar .versionrc.json**

```json
{
  "types": [
    { "type": "feat",     "section": "Features" },
    { "type": "fix",      "section": "Bug Fixes" },
    { "type": "docs",     "section": "Documentation" },
    { "type": "chore",    "section": "Chores", "hidden": false },
    { "type": "refactor", "section": "Refactors", "hidden": false },
    { "type": "perf",     "section": "Performance", "hidden": false }
  ],
  "bumpFiles": [
    { "filename": "package.json", "type": "json" },
    { "filename": ".claude-plugin/plugin.json", "type": "json" }
  ],
  "tagPrefix": "v",
  "commitAll": false,
  "skip": {
    "commit": false,
    "tag": false
  }
}
```

- [ ] **Step 4: Adicionar node_modules ao .gitignore**

Verificar se `node_modules` já está no `.gitignore` do plugin root:

```bash
grep -n "node_modules" /c/totvs/projetos/claude/poui-specialist/.gitignore
```

Se não estiver, adicionar:
```
node_modules/
package-lock.json
```

- [ ] **Step 5: Verificar dry-run**

```powershell
npx commit-and-tag-version --dry-run
```

Expected: mostra preview com versão bumped, CHANGELOG entry, sem criar arquivos. Verificar que:
- Versão detectada: `1.8.0`
- Bump correto baseado nos commits desde o último tag

- [ ] **Step 6: Commit do setup de tooling**

```bash
git add package.json .versionrc.json .gitignore
git commit -m "chore(tooling): add commit-and-tag-version for automated release management"
```

---

## Task 5: Verificar coerência do CHANGELOG atual e preparar release

**Files:**
- Modify: `CHANGELOG.md` (manual review, não pelo script)

**Goal:** CHANGELOG está coerente antes de rodar o release — sem entradas duplicadas, seções bem formadas.

- [ ] **Step 1: Revisar o CHANGELOG.md atual**

Abrir `CHANGELOG.md` e verificar:
- [ ] Última entrada é `[1.8.0]`
- [ ] Todas as features do Sprint B+C estão documentadas
- [ ] Nenhuma entrada `[Unreleased]` pendente

Se houver `[Unreleased]` com conteúdo: mover o conteúdo para dentro da seção `[1.9.0]` manualmente antes do release.

- [ ] **Step 2: Verificar se existe tag git v1.8.0**

```bash
git -C /c/totvs/projetos/claude/poui-specialist tag | grep "1.8.0"
```

Se a tag não existir (commit-and-tag-version usa a última tag para saber desde quando gerar o CHANGELOG):

```bash
git -C /c/totvs/projetos/claude/poui-specialist tag v1.8.0 8711f20
```

(SHA do commit `chore(release): bump version to 1.8.0`)

- [ ] **Step 3: Checar o que commit-and-tag-version vai incluir**

```powershell
npx commit-and-tag-version --dry-run 2>&1
```

Validar que o output inclui as features de Angular 21 dos commits Tasks 1–4. Se o tipo de bump for `patch` mas deveria ser `minor`, usar `--release-as minor` explicitamente na Task 6.

---

## Task 6: Cortar release v1.9.0

**Files:**
- Modify: `CHANGELOG.md` (auto-update via commit-and-tag-version)
- Modify: `package.json` (auto-update)
- Modify: `.claude-plugin/plugin.json` (auto-update via bumpFiles config)

**Goal:** Release v1.9.0 com tag git, CHANGELOG atualizado, plugin.json atualizado.

- [ ] **Step 1: Garantir working tree limpa**

```bash
git -C /c/totvs/projetos/claude/poui-specialist status
```

Expected: `nothing to commit, working tree clean`.

- [ ] **Step 2: Rodar release**

```powershell
cd C:\totvs\projetos\claude\poui-specialist
npx commit-and-tag-version --release-as minor
```

Expected output:
```
✔ bumping version in package.json from 1.8.0 to 1.9.0
✔ bumping version in .claude-plugin/plugin.json from 1.8.0 to 1.9.0
✔ outputting changes to CHANGELOG.md
✔ committing package.json and CHANGELOG.md
✔ tagging release v1.9.0
```

- [ ] **Step 3: Verificar arquivos atualizados**

```bash
grep '"version"' /c/totvs/projetos/claude/poui-specialist/.claude-plugin/plugin.json
grep '"version"' /c/totvs/projetos/claude/poui-specialist/package.json
head -20 /c/totvs/projetos/claude/poui-specialist/CHANGELOG.md
```

Expected: ambos mostram `"version": "1.9.0"` e CHANGELOG tem entrada `## [1.9.0]`.

- [ ] **Step 4: Atualizar @generated nos agents e skills via bump-version.js**

O `commit-and-tag-version` atualiza `package.json` e `plugin.json`, mas os `@generated` headers nos arquivos `.md` são atualizados pelo `bump-version.js` existente:

```powershell
node scripts/bump-version.js 1.9.0
```

Expected: lista de arquivos atualizados com `@generated poui-specialist v1.9.0`.

- [ ] **Step 5: Adicionar arquivos `.md` atualizados ao commit de release**

> Atenção: o commit de release já foi feito pelo commit-and-tag-version. Os `.md` updates são um commit adicional.

```bash
git -C /c/totvs/projetos/claude/poui-specialist add agents/ skills/
git -C /c/totvs/projetos/claude/poui-specialist commit -m "chore(release): update @generated headers to v1.9.0"
```

- [ ] **Step 6: Push com tags**

```bash
git -C /c/totvs/projetos/claude/poui-specialist push origin master --follow-tags
```

Expected: push do branch + tag `v1.9.0`.

- [ ] **Step 7: Sincronizar para cache local**

```powershell
.\sync-to-cache.ps1
```

Expected: plugin atualizado no cache do Claude Code.

---

## Self-Review

### Spec coverage check:
- ✅ Upgrade Angular 21 + PO-UI 21 → Task 1
- ✅ Fix compilation errors → Task 2
- ✅ Atualizar referências de versão → Task 3
- ✅ Configurar commit-and-tag-version → Task 4
- ✅ Verificar CHANGELOG → Task 5
- ✅ Cortar release → Task 6

### Scope guard (o que NÃO está neste plano):
- ❌ Novos templates
- ❌ Novos padrões de documentação
- ❌ Atualização do site poui-specialist-docs
- ❌ Migração do test project para nova syntax @for/@if
- ❌ Correção de warnings (apenas erros)

### Riscos:
1. `@totvs/protheus-lib-core` pode não ter versão 21 → Task 2 Step 3 cobre isso com fallback para manter v17
2. `commit-and-tag-version` pode detectar bump errado se não houver tag v1.8.0 → Task 5 Step 2 cobre isso
3. `bump-version.js` e `commit-and-tag-version` ambos tentam atualizar `plugin.json` → commit-and-tag-version atualiza via bumpFiles, bump-version.js atualiza @generated headers — não há conflito pois fazem coisas diferentes

---

*Plano criado em 2026-07-01 | Escopo: HARD — nenhuma expansão durante execução*
