# Token Optimization Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir custo de tokens do plugin poui-specialist em sessões longas — comprimindo 12 arquivos de skill, criando a skill `generate-batch` e publicando página de documentação.

**Architecture:** Wave 1 comprime os 12 arquivos sem alterar estrutura, aplicando 3 regras mecânicas de remoção de redundância. Wave 2 cria a skill de orquestração que despacha subagentes isolados por componente. Wave 3 publica a página de documentação com o formato manifesto.

**Tech Stack:** Markdown/MDX (skill files), PowerShell (sync + validação de tamanho), MDX + Next.js (site de docs)

## Global Constraints

- Nenhum bloco de código TypeScript/HTML/SCSS correto pode ser alterado — apenas prosa e comentários
- Todos os valores numéricos (px, ms, limites) devem ser preservados verbatim
- Todos os avisos `⚠️` e blocos `Never use` devem ser preservados intactos
- Cada arquivo comprimido deve ter redução ≥ 40% de tamanho
- Plugin root: `C:\TOTVS\Projetos\Claude\poui-specialist`
- Docs site root: `C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs`
- Sync command: `pwsh -File "C:\TOTVS\Projetos\Claude\poui-specialist\sync-to-cache.ps1"`
- Skills path: `skills/` dentro do plugin root
- Convenção de commit: mensagem convencional em português, sem Co-Authored-By

---

## Task 1: Wave 1a — Comprimir reactive-forms.md e dynamic-form-fields.md

**Files:**
- Modify: `skills/poui-patterns/reactive-forms.md` (12,1 KB → meta ≤ 6 KB)
- Modify: `skills/poui-components/dynamic-form-fields.md` (11,8 KB → meta ≤ 6 KB)

**Interfaces:**
- Produces: arquivos comprimidos, sem código correto alterado, prontos para uso pelo plugin

As **3 regras de compressão** a aplicar em ambos os arquivos:

**Regra 1 — Remover blocos de código marcados como errados**
Blocos com `❌`, `✗ Wrong`, `<!-- errado -->`, ou equivalente devem ser removidos.
O texto circundante já explica o que evitar. O bloco correto permanece.

Exceção: se o símbolo errado É a informação principal (ex: `p-selected-rows não existe`), manter o bloco errado mas remover a explicação em prosa ao redor.

Exemplo do que remover:
```markdown
❌ Errado:
```typescript
// não faça assim
this.form.patchValue({ campo: valor });
```  ← REMOVER este bloco inteiro

✅ Correto:
```typescript
this.form.get('campo')?.setValue(valor);
```  ← MANTER
```

**Regra 2 — Root cause em 1–2 linhas**
Substituir parágrafos explicando a causa raiz por uma frase concisa preservando termos técnicos.

Exemplo:
```markdown
❌ Antes (3 parágrafos):
> O problema ocorre porque o Angular reactive forms utiliza internamente um mecanismo de
> detecção de mudanças baseado em referência de objeto. Quando você chama patchValue,
> o Angular não detecta a mudança porque... [mais 2 parágrafos]

✅ Depois (1 linha):
> Root cause: `patchValue` não dispara `valueChanges` se o objeto for a mesma referência.
```

**Regra 3 — Remover comentários que reafirmam o nome do código**
Remover comentários como `// retorna o formulário`, `// define o valor`, `// inicializa`.
Manter comentários com valores não-óbvios: offsets px, delays ms, razões de workaround.

```markdown
// ← REMOVER: só repete o que o nome já diz
this.form.reset();  // reseta o formulário

// ← MANTER: o delay de 50ms não é óbvio
setTimeout(() => this.cdr.markForCheck(), 50);  // NOT 0ms — DOM precisa de 1 tick
```

- [ ] **Step 1: Verificar tamanho atual de ambos os arquivos**

```powershell
$files = @(
  "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-patterns\reactive-forms.md",
  "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-components\dynamic-form-fields.md"
)
foreach ($f in $files) {
  $kb = [math]::Round((Get-Item $f).Length / 1KB, 1)
  Write-Host "$([System.IO.Path]::GetFileName($f)): $kb KB"
}
```

Esperado: `reactive-forms.md: 12,1 KB` e `dynamic-form-fields.md: 11,8 KB`

- [ ] **Step 2: Comprimir reactive-forms.md — ler e identificar instâncias das 3 regras**

Ler o arquivo completo. Para cada seção:
1. Localizar todos os blocos `❌` ou `✗` → anotar linha de início e fim
2. Localizar parágrafos de root cause com mais de 2 linhas → resumir
3. Localizar comentários que só repetem o nome da variável/método → marcar para remoção

- [ ] **Step 3: Comprimir reactive-forms.md — aplicar as 3 regras e salvar**

Editar o arquivo aplicando as remoções identificadas no Step 2. Preservar intacto todo bloco de código correto (TypeScript, HTML, SCSS).

- [ ] **Step 4: Verificar redução em reactive-forms.md**

```powershell
$f = "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-patterns\reactive-forms.md"
$kb = [math]::Round((Get-Item $f).Length / 1KB, 1)
Write-Host "reactive-forms.md: $kb KB"
if ($kb -gt 7.3) { Write-Warning "ATENÇÃO: redução < 40%. Revisar Regras 1-3." }
```

Esperado: ≤ 7,3 KB (40% de redução sobre 12,1 KB)

- [ ] **Step 5: Comprimir dynamic-form-fields.md — aplicar as 3 regras**

Repetir Steps 2-4 para `skills/poui-components/dynamic-form-fields.md`.
Meta: ≤ 7,1 KB (40% de redução sobre 11,8 KB)

- [ ] **Step 6: Commit**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add skills/poui-patterns/reactive-forms.md skills/poui-components/dynamic-form-fields.md
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "perf(skills): comprimir reactive-forms e dynamic-form-fields — redução ~50% tokens"
```

---

## Task 2: Wave 1b — Comprimir dynamic-pages.md e navigation-components.md

**Files:**
- Modify: `skills/poui-components/dynamic-pages.md` (10,9 KB → meta ≤ 6,5 KB)
- Modify: `skills/poui-components/navigation-components.md` (12,8 KB → meta ≤ 7,7 KB)

**Interfaces:**
- Consumes: mesmas 3 regras de compressão da Task 1
- Produces: arquivos comprimidos preservando todo código correto

- [ ] **Step 1: Verificar tamanho atual**

```powershell
$files = @(
  "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-components\dynamic-pages.md",
  "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-components\navigation-components.md"
)
foreach ($f in $files) {
  $kb = [math]::Round((Get-Item $f).Length / 1KB, 1)
  Write-Host "$([System.IO.Path]::GetFileName($f)): $kb KB"
}
```

- [ ] **Step 2: Comprimir dynamic-pages.md — aplicar Regras 1, 2 e 3**

Ler o arquivo. Aplicar:
- Regra 1: remover blocos com prefixo `❌` / `✗`
- Regra 2: condensar parágrafos de root cause para 1–2 linhas
- Regra 3: remover comentários que só repetem o nome do identificador

Meta: ≤ 6,5 KB

- [ ] **Step 3: Comprimir navigation-components.md — aplicar Regras 1, 2 e 3**

Ler o arquivo. Aplicar as mesmas 3 regras.
Meta: ≤ 7,7 KB

- [ ] **Step 4: Verificar reduções**

```powershell
$checks = @(
  @{ path="skills/poui-components/dynamic-pages.md"; max=6.5 },
  @{ path="skills/poui-components/navigation-components.md"; max=7.7 }
)
$root = "C:\TOTVS\Projetos\Claude\poui-specialist"
foreach ($c in $checks) {
  $kb = [math]::Round((Get-Item (Join-Path $root $c.path)).Length / 1KB, 1)
  $status = if ($kb -le $c.max) { "OK" } else { "ACIMA DA META — revisar" }
  Write-Host "$([System.IO.Path]::GetFileName($c.path)): $kb KB — $status"
}
```

- [ ] **Step 5: Commit**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add skills/poui-components/dynamic-pages.md skills/poui-components/navigation-components.md
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "perf(skills): comprimir dynamic-pages e navigation-components — redução ~40% tokens"
```

---

## Task 3: Wave 1c — Comprimir 3 templates de formulário

**Files:**
- Modify: `skills/poui-code-generation/templates-master-detail.md` (9,9 KB → meta ≤ 5,9 KB)
- Modify: `skills/poui-code-generation/templates-stepper-form.md` (8,5 KB → meta ≤ 5,1 KB)
- Modify: `skills/poui-code-generation/templates-modal-crud.md` (9,0 KB → meta ≤ 5,4 KB)

**Interfaces:**
- Consumes: mesmas 3 regras de compressão da Task 1
- Produces: templates comprimidos; todos os placeholders `{{ComponentClass}}`, `{{kebab-name}}` etc. preservados intactos

**Atenção especial para templates:** Os arquivos de template contêm código Angular completo que serve como base de geração. A Regra 3 se aplica apenas a comentários acima/abaixo do código, NUNCA dentro de blocos de código TypeScript/HTML/SCSS.

- [ ] **Step 1: Verificar tamanho atual**

```powershell
$root = "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-code-generation"
$files = @("templates-master-detail.md","templates-stepper-form.md","templates-modal-crud.md")
foreach ($f in $files) {
  $kb = [math]::Round((Get-Item (Join-Path $root $f)).Length / 1KB, 1)
  Write-Host "$f: $kb KB"
}
```

- [ ] **Step 2: Comprimir templates-master-detail.md**

Ler o arquivo. Aplicar as 3 regras apenas na prosa de explicação (fora dos blocos de código).
Preservar intactos todos os blocos TypeScript, HTML e SCSS.
Meta: ≤ 5,9 KB

- [ ] **Step 3: Comprimir templates-stepper-form.md**

Ler o arquivo. Mesma abordagem — prosa comprimida, código preservado.
Meta: ≤ 5,1 KB

- [ ] **Step 4: Comprimir templates-modal-crud.md**

Ler o arquivo. Mesma abordagem.
Meta: ≤ 5,4 KB

- [ ] **Step 5: Verificar reduções**

```powershell
$root = "C:\TOTVS\Projetos\Claude\poui-specialist"
$checks = @(
  @{ path="skills/poui-code-generation/templates-master-detail.md"; max=5.9 },
  @{ path="skills/poui-code-generation/templates-stepper-form.md"; max=5.1 },
  @{ path="skills/poui-code-generation/templates-modal-crud.md"; max=5.4 }
)
foreach ($c in $checks) {
  $kb = [math]::Round((Get-Item (Join-Path $root $c.path)).Length / 1KB, 1)
  $status = if ($kb -le $c.max) { "OK" } else { "ACIMA DA META" }
  Write-Host "$([System.IO.Path]::GetFileName($c.path)): $kb KB — $status"
}
```

- [ ] **Step 6: Commit**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add skills/poui-code-generation/templates-master-detail.md skills/poui-code-generation/templates-stepper-form.md skills/poui-code-generation/templates-modal-crud.md
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "perf(skills): comprimir templates master-detail, stepper-form e modal-crud"
```

---

## Task 4: Wave 1d — Comprimir 5 arquivos menores restantes

**Files:**
- Modify: `skills/poui-patterns/module-structure.md` (8,3 KB → meta ≤ 5 KB)
- Modify: `skills/poui-code-generation/templates-page-edit.md` (5,7 KB → meta ≤ 3,4 KB)
- Modify: `skills/poui-code-generation/templates-page-detail.md` (6,7 KB → meta ≤ 4 KB)
- Modify: `skills/poui-code-generation/templates-page-dynamic-search.md` (6,7 KB → meta ≤ 4 KB)
- Modify: `skills/poui-components/feedback-components.md` (5,9 KB → meta ≤ 3,5 KB)

**Interfaces:**
- Consumes: mesmas 3 regras de compressão da Task 1
- Produces: 5 arquivos comprimidos sem código correto alterado

- [ ] **Step 1: Verificar tamanho atual dos 5 arquivos**

```powershell
$root = "C:\TOTVS\Projetos\Claude\poui-specialist"
$files = @(
  "skills/poui-patterns/module-structure.md",
  "skills/poui-code-generation/templates-page-edit.md",
  "skills/poui-code-generation/templates-page-detail.md",
  "skills/poui-code-generation/templates-page-dynamic-search.md",
  "skills/poui-components/feedback-components.md"
)
foreach ($f in $files) {
  $kb = [math]::Round((Get-Item (Join-Path $root $f)).Length / 1KB, 1)
  Write-Host "$([System.IO.Path]::GetFileName($f)): $kb KB"
}
```

- [ ] **Step 2: Comprimir os 5 arquivos aplicando as 3 regras**

Para cada arquivo:
1. Ler o conteúdo
2. Regra 1: remover blocos `❌`/`✗`
3. Regra 2: condensar root cause para 1–2 linhas
4. Regra 3: remover comentários que só repetem o nome do código
5. Salvar o arquivo

- [ ] **Step 3: Verificar reduções**

```powershell
$root = "C:\TOTVS\Projetos\Claude\poui-specialist"
$checks = @(
  @{ path="skills/poui-patterns/module-structure.md"; max=5.0 },
  @{ path="skills/poui-code-generation/templates-page-edit.md"; max=3.4 },
  @{ path="skills/poui-code-generation/templates-page-detail.md"; max=4.0 },
  @{ path="skills/poui-code-generation/templates-page-dynamic-search.md"; max=4.0 },
  @{ path="skills/poui-components/feedback-components.md"; max=3.5 }
)
foreach ($c in $checks) {
  $kb = [math]::Round((Get-Item (Join-Path $root $c.path)).Length / 1KB, 1)
  $status = if ($kb -le $c.max) { "OK" } else { "ACIMA DA META" }
  Write-Host "$([System.IO.Path]::GetFileName($c.path)): $kb KB — $status"
}
```

- [ ] **Step 4: Relatório final Wave 1**

```powershell
$root = "C:\TOTVS\Projetos\Claude\poui-specialist"
$allFiles = @(
  @{ path="skills/poui-patterns/reactive-forms.md"; antes=12.1 },
  @{ path="skills/poui-components/dynamic-form-fields.md"; antes=11.8 },
  @{ path="skills/poui-components/dynamic-pages.md"; antes=10.9 },
  @{ path="skills/poui-components/navigation-components.md"; antes=12.8 },
  @{ path="skills/poui-code-generation/templates-master-detail.md"; antes=9.9 },
  @{ path="skills/poui-code-generation/templates-stepper-form.md"; antes=8.5 },
  @{ path="skills/poui-code-generation/templates-modal-crud.md"; antes=9.0 },
  @{ path="skills/poui-patterns/module-structure.md"; antes=8.3 },
  @{ path="skills/poui-code-generation/templates-page-edit.md"; antes=5.7 },
  @{ path="skills/poui-code-generation/templates-page-detail.md"; antes=6.7 },
  @{ path="skills/poui-code-generation/templates-page-dynamic-search.md"; antes=6.7 },
  @{ path="skills/poui-components/feedback-components.md"; antes=5.9 }
)
$totalAntes = 0; $totalDepois = 0
foreach ($f in $allFiles) {
  $depois = [math]::Round((Get-Item (Join-Path $root $f.path)).Length / 1KB, 1)
  $pct = [math]::Round((1 - $depois / $f.antes) * 100)
  Write-Host "$([System.IO.Path]::GetFileName($f.path)): $($f.antes) KB → $depois KB (-$pct%)"
  $totalAntes += $f.antes; $totalDepois += $depois
}
$pctTotal = [math]::Round((1 - $totalDepois / $totalAntes) * 100)
Write-Host "`nTotal Wave 1: $totalAntes KB → $([math]::Round($totalDepois,1)) KB (-$pctTotal%)"
```

- [ ] **Step 5: Commit**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add skills/poui-patterns/module-structure.md skills/poui-code-generation/templates-page-edit.md skills/poui-code-generation/templates-page-detail.md skills/poui-code-generation/templates-page-dynamic-search.md skills/poui-components/feedback-components.md
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "perf(skills): comprimir 5 templates restantes — Wave 1 concluída"
```

---

## Task 5: Wave 2a — Criar skill generate-batch

**Files:**
- Create: `skills/poui-generate-batch/SKILL.md`

**Interfaces:**
- Produces: skill `poui-specialist:generate-batch` disponível no plugin após sync

- [ ] **Step 1: Criar o diretório e o arquivo SKILL.md**

Criar `C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-generate-batch\SKILL.md` com o conteúdo exato abaixo:

```markdown
---
name: poui-generate-batch
description: Use to generate multiple PO-UI components in one command — parses a structured manifest and dispatches one isolated subagent per component, keeping token cost fixed regardless of session length | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
---

# PO-UI Generate Batch — Orquestrador de Geração em Lote

Gera múltiplos componentes Angular/PO-UI a partir de um manifesto estruturado, despachando um subagente isolado por componente para manter custo fixo de tokens independentemente do tamanho da sessão.

## Formato do Manifesto

```
MODULO: <pasta-feature/sub-pasta>
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/<modulo>

COMPONENTES:
| tipo              | classe                  | endpoint        | campos                              |
|-------------------|-------------------------|-----------------|-------------------------------------|
| page-list         | {{Classe}}ListComponent | /recurso        | campo1, campo2, campo3              |
| page-edit         | {{Classe}}EditComponent | /recurso/{id}   | campo1(req), campo2(req), campo3    |
| service           | {{Classe}}Service       | /recurso        | -                                   |

REGRAS:
- <regra de negócio 1>
- <regra de negócio 2>
```

## Convenções

| Elemento | Significado |
|---|---|
| `(req)` após campo | Campo obrigatório no formulário |
| `-` em campos | Sem campos específicos — usar padrão do template |
| `REGRAS:` | Apenas regras que afetam código gerado (status, formatação, validações) |

## Tipos Válidos

`page-list` · `page-edit` · `page-detail` · `page-dynamic-search` · `page-dynamic` · `modal-crud` · `stepper-form` · `master-detail` · `stacked-browse` · `two-panel-browse` · `service` · `dashboard`

## Processo

### Passo 1 — Validar manifesto

Antes de despachar qualquer subagente, verificar:
1. `PASTA_DESTINO` existe no sistema de arquivos
2. Todos os `tipo` na tabela são valores da lista de Tipos Válidos acima
3. Todos os `endpoint` começam com `/`

Se qualquer validação falhar, reportar o erro e encerrar sem gerar código.

### Passo 2 — Despachar subagente por componente

Para cada linha da tabela `COMPONENTES`, montar o prompt do subagente:

```
Gere um componente PO-UI Angular 17+ com as seguintes especificações:

Tipo: <tipo>
Classe: <classe>
Endpoint: <API_BASE><endpoint>
Módulo: <MODULO>
Pasta destino: <PASTA_DESTINO>
Campos: <campos>
  - Campos marcados com (req) são obrigatórios no formulário

Regras de negócio:
<REGRAS>

Salve todos os arquivos gerados em PASTA_DESTINO.
```

Despachar como subagente `poui-specialist:code-generator`.

**Importante:** Despachar UM subagente por vez, aguardar conclusão antes de despachar o próximo. Não despachar em paralelo — cada componente pode depender do service gerado anteriormente.

### Passo 3 — Registrar resultado de cada componente

Para cada componente, registrar:
- ✅ Sucesso: listar arquivos gerados com caminho completo
- ⚠️ Aviso: subagente concluiu mas reportou problema (falha de lint, arquivo existente sobrescrito etc.)
- ❌ Falha: subagente falhou — registrar erro e continuar com o próximo componente

### Passo 4 — Relatório final

Após concluir todos os componentes, exibir:

```
## Relatório de Geração em Lote

Módulo: <MODULO>
Pasta: <PASTA_DESTINO>

| Componente           | Status | Arquivos gerados                      |
|----------------------|--------|---------------------------------------|
| <classe>             | ✅     | <lista de arquivos com caminho>       |

Total: X gerados · Y com aviso · Z com falha
```
```

- [ ] **Step 2: Verificar que o arquivo foi criado corretamente**

```powershell
$path = "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-generate-batch\SKILL.md"
if (Test-Path $path) {
  $kb = [math]::Round((Get-Item $path).Length / 1KB, 1)
  Write-Host "SKILL.md criado: $kb KB"
} else {
  Write-Error "Arquivo não encontrado!"
}
```

Esperado: arquivo existe com > 2 KB

- [ ] **Step 3: Sincronizar com o cache do plugin**

```powershell
pwsh -File "C:\TOTVS\Projetos\Claude\poui-specialist\sync-to-cache.ps1"
```

Esperado: `OK  skills` para ambas as versões (1.0.0 e 1.3.0)

- [ ] **Step 4: Verificar que a skill aparece no cache**

```powershell
$path1 = "C:\Users\andre\.claude\plugins\cache\poui-specialist-marketplace\poui-specialist\1.3.0\skills\poui-generate-batch\SKILL.md"
if (Test-Path $path1) { Write-Host "Cache 1.3.0: OK" } else { Write-Error "Não encontrado em cache 1.3.0" }
```

- [ ] **Step 5: Commit**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add skills/poui-generate-batch/
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "feat(skill): adicionar generate-batch — orquestração de geração com subagentes isolados"
```

---

## Task 6: Wave 2b — Atualizar commands/generate.md com referência cruzada

**Files:**
- Modify: `commands/generate.md`

**Interfaces:**
- Consumes: skill `poui-generate-batch` criada na Task 5
- Produces: comando `/generate` com seção de referência para geração em lote

- [ ] **Step 1: Ler o final do arquivo generate.md**

Ler `C:\TOTVS\Projetos\Claude\poui-specialist\commands\generate.md` e identificar onde termina o conteúdo principal (antes de qualquer seção de notas ou ao final do arquivo).

- [ ] **Step 2: Adicionar seção de referência cruzada no final do arquivo**

Adicionar ao final de `commands/generate.md`:

```markdown

## Geração em Lote

Para gerar múltiplos componentes com custo fixo por componente (sem acúmulo de contexto por sessão), use o comando `/poui-specialist:generate-batch` com o formato manifesto.

Exemplo:
```
/poui-specialist:generate-batch

MODULO: financeiro/titulos
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/financeiro/titulos

COMPONENTES:
| tipo      | classe               | endpoint      | campos                        |
|-----------|----------------------|---------------|-------------------------------|
| page-list | TitulosListComponent | /titulos      | codTit, nomCli, valor, status |
| service   | TitulosService       | /titulos      | -                             |

REGRAS:
- Status: A=Aberto B=Baixado
```

Consulte a [documentação de Otimização de Tokens](https://alscosta1973.github.io/poui-specialist-docs/docs/otimizacao-tokens) para o formato completo.
```

- [ ] **Step 3: Sincronizar cache**

```powershell
pwsh -File "C:\TOTVS\Projetos\Claude\poui-specialist\sync-to-cache.ps1"
```

- [ ] **Step 4: Commit**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add commands/generate.md
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "docs(commands): adicionar referência cruzada para generate-batch em generate.md"
```

---

## Task 7: Wave 3 — Criar página de documentação otimizacao-tokens.mdx

**Files:**
- Create: `poui-specialist-docs/content/docs/otimizacao-tokens.mdx`
- Modify: `poui-specialist-docs/content/docs/meta.json`

**Interfaces:**
- Produces: página publicada no site de documentação com formato manifesto completo e exemplos

- [ ] **Step 1: Fazer git pull no repo de docs para sincronizar com o remote**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs" pull --rebase origin main
```

Esperado: sem conflitos. Se houver conflitos, resolver antes de continuar.

- [ ] **Step 2: Criar o arquivo otimizacao-tokens.mdx**

Criar `C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs\content\docs\otimizacao-tokens.mdx` com o conteúdo exato abaixo:

```mdx
---
title: Otimização de Tokens
description: Como usar o formato manifesto para gerar múltiplos componentes PO-UI com custo fixo de tokens por sessão
---

# Otimização de Tokens

## Por que otimizar?

Ao usar o `/poui-specialist:generate` em uma sessão com múltiplos componentes, o contexto acumula tokens a cada turno:

| Turno | Contexto acumulado |
|---|---|
| 1º componente | ~25 KB |
| 3º componente | ~60 KB |
| 5º componente | ~120 KB+ |

Com o `/poui-specialist:generate-batch`, cada componente é gerado em um subagente com contexto isolado e descartável. O custo por componente é fixo, independentemente de quantos você gerar na mesma sessão.

## Prompt Manifesto

O manifesto é um formato estruturado que descreve todos os componentes a gerar em um único prompt. Você preenche uma vez — o plugin gera tudo em sequência.

```
/poui-specialist:generate-batch

MODULO: financeiro/contas-receber        ← pasta dentro de src/app/
API_BASE: /rest/api/custom/v1            ← prefixo comum a todos os endpoints
PASTA_DESTINO: src/app/financeiro/contas-receber

COMPONENTES:
| tipo      | classe                  | endpoint      | campos                                                     |
|-----------|-------------------------|---------------|------------------------------------------------------------|
| page-list | TitulosListComponent    | /titulos      | codTit, nomCli, valor, vencto, status                      |
| page-edit | TitulosEditComponent    | /titulos/{id} | codTit(req), nomCli(req), valor(req), vencto(req), obs     |
| service   | TitulosService          | /titulos      | -                                                          |

REGRAS:
- Status: A=Aberto B=Baixado C=Cancelado
- Apenas status=A pode ser editado
- Valor formatado como moeda BRL
```

### Convenções

| Elemento | Significado | Exemplo |
|---|---|---|
| `(req)` após campo | Campo obrigatório no formulário | `nome(req)` |
| `-` em campos | Sem campos específicos | `service` sempre usa `-` |
| `REGRAS:` | Apenas regras que afetam código gerado | Status, formatação, validações |

## Tipos de Componente

| Tipo | Quando usar |
|---|---|
| `page-list` | Lista simples com busca rápida |
| `page-dynamic-search` | Lista + filtros avançados + disclaimers (padrão Protheus) |
| `page-dynamic` | Lista zero-boilerplate via `PoPageDynamicTable` |
| `page-edit` | Formulário com muitos campos, navegação por rota |
| `page-detail` | Tela de detalhe somente leitura |
| `modal-crud` | Lista + modal de adição/edição (até ~10 campos) |
| `stepper-form` | Formulário com 3+ seções ou etapas |
| `master-detail` | Lista com linhas filho expansíveis (pedido/itens) |
| `stacked-browse` | Dois `po-table` empilhados com navegação por teclado |
| `two-panel-browse` | Dois `po-table` lado a lado para conciliação/matching |
| `service` | Apenas o serviço Angular + interface do modelo |
| `dashboard` | Analytics, KPIs, gráficos |

## Exemplos Completos

### Módulo de Parceiros

```
/poui-specialist:generate-batch

MODULO: cadastros/parceiros
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/cadastros/parceiros

COMPONENTES:
| tipo      | classe                 | endpoint        | campos                                       |
|-----------|------------------------|-----------------|----------------------------------------------|
| page-list | ParceirosListComponent | /parceiros      | codPar, nomPar, cgcCpf, email, ativo         |
| page-edit | ParceirosEditComponent | /parceiros/{id} | codPar(req), nomPar(req), cgcCpf(req), email, telefone, ativo |
| service   | ParceirosService       | /parceiros      | -                                            |

REGRAS:
- cgcCpf deve ser validado como CPF ou CNPJ
- Ativo: 1=Sim 2=Não
```

### Módulo Financeiro Completo

```
/poui-specialist:generate-batch

MODULO: financeiro/titulos
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/financeiro/titulos

COMPONENTES:
| tipo                | classe                 | endpoint        | campos                                                 |
|---------------------|------------------------|-----------------|--------------------------------------------------------|
| page-dynamic-search | TitulosListComponent   | /titulos        | codTit, nomCli, valor, vencto, status                  |
| page-edit           | TitulosEditComponent   | /titulos/{id}   | codTit(req), nomCli(req), valor(req), vencto(req), obs |
| page-detail         | TitulosDetailComponent | /titulos/{id}   | codTit, nomCli, valor, vencto, status, obs             |
| service             | TitulosService         | /titulos        | -                                                      |

REGRAS:
- Status: A=Aberto B=Baixado C=Cancelado
- Apenas status=A pode ser editado
- Valor formatado como moeda BRL
- vencto é data no formato DD/MM/YYYY
```

## Boas Práticas

**Descreva apenas o que afeta o código gerado:**

```
❌ REGRAS:
- Sistema migrado do Protheus 11 para 12 em 2024
- Aprovado pelo time de arquitetura em reunião de maio

✅ REGRAS:
- Status: A=Aberto B=Baixado
- Valor em BRL, máximo 15 dígitos inteiros
```

**Use `(req)` apenas em campos realmente obrigatórios no formulário:**

```
campos: codTit(req), nomCli(req), valor(req), obs, complemento
```
Os campos `obs` e `complemento` acima serão opcionais no formulário gerado.

**Para serviços, use sempre `-` em campos — o service não tem formulário:**

```
| service | ParceirosService | /parceiros | - |
```

**Mantenha regras em uma linha cada:**

```
REGRAS:
- Status: A=Aberto B=Baixado C=Cancelado
- Apenas status=A pode ser editado
- Valor formatado como moeda BRL
```
```

- [ ] **Step 3: Atualizar meta.json para incluir a nova página**

Ler `C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs\content\docs\meta.json` e adicionar `"otimizacao-tokens"` na seção `"---Extras---"`:

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
    "otimizacao-tokens",
    "changelog"
  ]
}
```

- [ ] **Step 4: Verificar que o arquivo MDX foi criado**

```powershell
$path = "C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs\content\docs\otimizacao-tokens.mdx"
if (Test-Path $path) {
  $kb = [math]::Round((Get-Item $path).Length / 1KB, 1)
  Write-Host "otimizacao-tokens.mdx: $kb KB — OK"
} else {
  Write-Error "Arquivo não encontrado!"
}
```

- [ ] **Step 5: Build local do site para verificar que o MDX não tem erros de parse**

```powershell
Set-Location "C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs"
npm run build 2>&1 | Select-String -Pattern "error|Error|warn" | Select-Object -First 20
```

Esperado: saída sem erros de parse MDX. Se houver erro de sintaxe MDX, corrigir antes de commitar.

- [ ] **Step 6: Commit e push no repo de docs**

```powershell
$docsRoot = "C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs"
git -C $docsRoot add content/docs/otimizacao-tokens.mdx content/docs/meta.json
git -C $docsRoot commit -m "docs: adicionar página de otimização de tokens com formato manifesto e exemplos"
git -C $docsRoot push origin main
```

Esperado: push bem-sucedido. O GitHub Actions fará o deploy automaticamente.

- [ ] **Step 7: Commit final no repo do plugin**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" push origin master
```

---

## Checklist de Validação Final

### Wave 1 — Compressão
- [ ] Todos os 12 arquivos têm redução ≥ 40% de tamanho
- [ ] Nenhum bloco de código TypeScript/HTML/SCSS correto foi alterado
- [ ] Todos os valores numéricos (px, ms) preservados
- [ ] Todos os avisos `⚠️` e `Never use` preservados

### Wave 2 — Skill generate-batch
- [ ] `skills/poui-generate-batch/SKILL.md` existe no plugin e no cache
- [ ] `commands/generate.md` contém a seção "Geração em Lote"
- [ ] Skill aparece no system-reminder de uma nova sessão do Claude Code

### Wave 3 — Documentação
- [ ] Build do site passa sem erros de parse MDX
- [ ] Página `otimizacao-tokens` aparece na navegação lateral do site
- [ ] Todos os exemplos de manifesto são copiáveis e formatados corretamente
- [ ] Deploy do GitHub Pages conclui sem erros
