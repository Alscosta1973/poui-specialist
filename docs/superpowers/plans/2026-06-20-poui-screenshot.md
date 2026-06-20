# poui-screenshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a skill `/poui-specialist:screenshot` que analisa uma imagem (path local ou URL) com visão multimodal, infere tipo de componente PO-UI, campos e ações, exibe laudo + manifesto e pergunta se deseja gerar imediatamente via `/generate-batch`.

**Architecture:** Skill markdown (`skills/poui-screenshot/SKILL.md`) com fluxo de 4 passos: ler imagem (path ou URL), analisar com visão multimodal (tabela de 9 tipos + fallback), exibir laudo e manifesto pré-preenchido, confirmar e despachar generate-batch. Uma modificação pontual em `commands/generate.md` e publicação na página Workflow Avançado do site de docs.

**Tech Stack:** Markdown skill file, visão multimodal nativa do Claude (Read para path local, WebFetch para URL), plugin cache sync via `sync-to-cache.ps1`, MDX para docs.

## Global Constraints

- Plugin repo: `C:\TOTVS\Projetos\Claude\poui-specialist`
- Skill nova em: `skills/poui-screenshot/SKILL.md`
- Frontmatter obrigatório: `name: poui-screenshot` e `description:` de uma linha
- `stacked-browse` = "Duas tabelas empilhadas **horizontalmente**" (não verticalmente)
- Service sempre incluído no manifesto gerado (pelo menos 1 componente + 1 service)
- API_BASE padrão no manifesto: `/rest/api/custom/v1`
- Nunca modificar arquivos do projeto — skill é somente leitura/análise
- Após qualquer alteração em `skills/` ou `commands/`, executar `sync-to-cache.ps1`
- Commits: conventional commits sem co-author; autor: Andre Costa
- Docs repo: `C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs` (branch `main`)

---

### Task 1: Criar `skills/poui-screenshot/SKILL.md`

**Files:**
- Create: `skills/poui-screenshot/SKILL.md`

**Interfaces:**
- Consumes: nada (skill autônoma)
- Produces: skill `/poui-specialist:screenshot` disponível no plugin; despacha `/poui-specialist:generate-batch` quando confirmado

- [ ] **Step 1: Criar o diretório**

```powershell
New-Item -ItemType Directory -Path "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-screenshot" -Force
```

- [ ] **Step 2: Escrever o conteúdo completo do SKILL.md**

Criar `C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-screenshot\SKILL.md` com o seguinte conteúdo **verbatim**:

````markdown
---
name: poui-screenshot
description: Analyzes a screenshot or wireframe image (local path or URL) and generates a PO-UI Angular component manifest using multimodal vision — infers component type, fields, actions and module, then asks whether to generate immediately | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
---

# PO-UI Screenshot — Visual para Código

Analisa uma imagem de tela (screenshot, wireframe ou print) e gera automaticamente o manifesto de componentes PO-UI, usando visão multimodal para inferir tipo, campos e ações.

## Uso

```
/poui-specialist:screenshot <caminho-ou-url>
```

**Exemplos:**
```
/poui-specialist:screenshot C:\prints\tela-titulos.png
/poui-specialist:screenshot https://company.sharepoint.com/tela-parceiros.png
/poui-specialist:screenshot ./wireframes/cadastro.jpg
```

---

## Passo 1 — Ler a imagem

Determinar o tipo de entrada pelo argumento fornecido:

- **URL** (começa com `http://` ou `https://`): ler a imagem via ferramenta de fetch de URL (WebFetch ou navegador)
- **Path local** (qualquer outro valor): ler a imagem via ferramenta Read

Se não conseguir acessar a imagem, exibir e encerrar:

```
❌ Não foi possível acessar a imagem: <caminho-ou-url>
   Verifique se o arquivo existe e está acessível.
```

---

## Passo 2 — Analisar com visão multimodal

Analisar o conteúdo visual da imagem e inferir:

### Tipo de componente

| O que a imagem mostra | Tipo inferido |
|---|---|
| Tabela/grid com busca simples no topo | `page-list` |
| Tabela com filtros avançados (datas, selects, múltiplos campos) | `page-dynamic-search` |
| Formulário em página inteira (muitos campos, botão Salvar na página) | `page-edit` |
| Formulário em janela/modal sobreposta à tabela | `modal-crud` |
| Formulário em etapas com abas ou numeração (Passo 1, Passo 2…) | `stepper-form` |
| Duas tabelas empilhadas horizontalmente | `stacked-browse` |
| Duas tabelas lado a lado para conciliação/matching | `two-panel-browse` |
| Cards com números/KPIs e gráficos | `dashboard` |
| Tela de detalhe somente leitura (sem botão Salvar) | `page-detail` |
| Tipo não reconhecível | `page-list` (fallback — indicar aviso no laudo) |

### Campos visíveis

Para cada campo/label identificado na imagem:
- **Nome**: converter label visível para camelCase (ex: "Cód. Fornecedor" → `codFor`, "Nome Cliente" → `nomCli`)
- **Obrigatoriedade**: campo com `*` ou label em vermelho/negrito → marcar como `(req)`
- **Tipos especiais**:
  - Campo com ícone de calendário ou formato `DD/MM/YYYY` → adicionar REGRA: `<campo>: usar po-datepicker`
  - Campo com símbolo `R$` ou formato monetário → adicionar REGRA: `<campo>: formatar como moeda BRL`
  - Select/combo com opções visíveis → adicionar REGRA: `<campo>: <opções visíveis>`

### Módulo sugerido

Inferir de título da página, breadcrumb ou texto visível na imagem:
- Exemplo: "Financeiro > Títulos" → `financeiro/titulos`
- Se não encontrado: usar `<modulo>` como placeholder

### Ações customizadas

- Botões padrão ("Novo", "Salvar", "Cancelar", "Excluir") → não listar em REGRAS (incluídos automaticamente pelo template)
- Botões customizados visíveis → adicionar REGRA: `Ação customizada: "<nome>" no <tabela/formulário>`

### Nome da classe e endpoint

- Classe: entidade em PascalCase + sufixo do tipo (ex: `TitulosListComponent` para `page-list`)
- Endpoint: entidade em kebab-case com `/` inicial (ex: `/titulos`)
- Se não detectado: usar `<Entidade>Component` e `/<entidade>` como placeholder

---

## Passo 3 — Exibir laudo e manifesto

```
## Análise da imagem

Tipo detectado: <tipo>
Módulo inferido: <modulo>

Campos identificados:
- <campo1> [(obrigatório — label com *)]
- <campo2>
- <campo3> → REGRA: <inferência>

Ações customizadas detectadas:
- "<nome-botão>" → REGRA: ação customizada no <tabela/formulário>

[Incluir se tipo foi fallback:]
⚠ Tipo de tela não reconhecido com certeza — usando page-list como padrão. Ajuste o tipo no manifesto se necessário.

[Incluir se imagem tem baixa qualidade:]
⚠ Imagem com baixa resolução — algumas inferências podem ser imprecisas. Revise o manifesto antes de gerar.

---

Manifesto gerado:

MODULO: <modulo>
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/<modulo>

COMPONENTES:
| tipo    | classe              | endpoint    | campos                              |
|---------|---------------------|-------------|-------------------------------------|
| <tipo>  | <Entidade>Component | /<entidade> | <campos com (req) onde aplicável>   |
| service | <Entidade>Service   | /<entidade> | -                                   |

REGRAS:
- <regra1>
- <regra2>

---
Ajuste o manifesto se necessário, então confirme.
Deseja gerar os componentes agora? [S/n]
```

Se não houver REGRAS inferidas, omitir a seção `REGRAS:` do manifesto.

---

## Passo 4 — Confirmar e gerar

- **S** (ou Enter): despachar `/poui-specialist:generate-batch` com o manifesto exato exibido no Passo 3
- **n**: encerrar. O manifesto permanece visível para o usuário copiar manualmente se desejar

---

## Restrições

- **Nunca modificar** arquivos do projeto — a skill é somente de análise e geração de manifesto
- **Service sempre incluído** — todo manifesto gerado inclui pelo menos 1 componente principal + 1 service
- **API_BASE padrão** — usar `/rest/api/custom/v1`; o usuário ajusta no manifesto se necessário
- **Fallback explícito** — se o tipo não for reconhecível, usar `page-list` e avisar no laudo
- **Imagem ilegível** — tentar inferir o máximo possível; avisar sobre baixa qualidade mas não encerrar
````

- [ ] **Step 3: Verificar que as seções obrigatórias estão presentes**

```powershell
$file = "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-screenshot\SKILL.md"
$content = Get-Content $file -Raw

$checks = @(
    "name: poui-screenshot",
    "http.*https|https.*http",
    "page-list",
    "page-dynamic-search",
    "modal-crud",
    "stacked-browse.*horizontal",
    "two-panel-browse",
    "dashboard",
    "req.*obrigat|obrigat.*req",
    "po-datepicker",
    "moeda BRL",
    "generate-batch",
    "S/n",
    "Nunca modificar"
)

$failed = @()
foreach ($check in $checks) {
    if ($content -notmatch $check) { $failed += $check }
}

if ($failed.Count -eq 0) {
    Write-Host "✅ Todas as seções verificadas ($($checks.Count)/$($checks.Count))"
} else {
    Write-Host "❌ Seções ausentes:"
    $failed | ForEach-Object { Write-Host "  - $_" }
}
```

Esperado: `✅ Todas as seções verificadas (14/14)`

- [ ] **Step 4: Sincronizar cache**

```powershell
& "C:\TOTVS\Projetos\Claude\poui-specialist\sync-to-cache.ps1"
```

Esperado: `OK  skills` para versões 1.0.0 e 1.3.0 e `Sincronizacao concluida.`

- [ ] **Step 5: Commitar**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add skills/poui-screenshot/SKILL.md
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "feat(skill): adicionar poui-screenshot — screenshot-to-code com visão multimodal"
```

---

### Task 2: Integrar em `commands/generate.md` + publicar no site de docs + push

**Files:**
- Modify: `commands/generate.md` — mencionar `/screenshot` como alternativa ao `/discover`
- Modify: `poui-specialist-docs/content/docs/workflow-avancado.mdx` — nova seção "Screenshot para Código"

**Interfaces:**
- Consumes: `skills/poui-screenshot/SKILL.md` criada na Task 1

- [ ] **Step 1: Editar `commands/generate.md` — adicionar referência ao `/screenshot`**

Abrir `C:\TOTVS\Projetos\Claude\poui-specialist\commands\generate.md`.

Localizar o bloco exato:

```
> **Pré-passo opcional:** Se o projeto Angular já tem serviços e rotas cadastradas, execute `/poui-specialist:context` antes para gerar um snapshot de contexto e evitar duplicatas.
```

Substituir por:

```
> **Pré-passo opcional:** Se o projeto Angular já tem serviços e rotas cadastradas, execute `/poui-specialist:context` antes para gerar um snapshot de contexto e evitar duplicatas.
> 
> **Geração a partir de imagem:** Se tiver um screenshot ou wireframe da tela, use `/poui-specialist:screenshot <caminho-ou-url>` para gerar o manifesto automaticamente por visão, sem precisar escrever o manifesto à mão.
```

- [ ] **Step 2: Verificar a modificação**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\commands\generate.md" -Pattern "poui-specialist:screenshot" | Select-Object -First 1
```

Esperado: linha contendo `poui-specialist:screenshot`.

- [ ] **Step 3: Sincronizar cache**

```powershell
& "C:\TOTVS\Projetos\Claude\poui-specialist\sync-to-cache.ps1"
```

Esperado: `OK  commands` e `Sincronizacao concluida.`

- [ ] **Step 4: Commitar e push no plugin repo**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add commands/generate.md
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "feat(commands): mencionar /screenshot como alternativa ao /discover para geração a partir de imagem"
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" push origin master
```

Esperado: push bem-sucedido sem erros.

- [ ] **Step 5: Adicionar seção no site de docs — `workflow-avancado.mdx`**

Abrir `C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs\content\docs\workflow-avancado.mdx`.

Localizar o bloco exato (final da seção Auto-Discovery):

```
Ajuste `MODULO` e `PASTA_DESTINO` antes de confirmar (ex: `financeiro/titulos`). Os demais campos são preenchidos automaticamente.

---

## Geração Codebase-Aware
```

Inserir **entre** esses dois blocos:

```

---

## Screenshot para Código

Se tiver um screenshot, wireframe ou print de sistema legado, use `/poui-specialist:screenshot` para gerar o manifesto automaticamente por visão — sem endpoint de API e sem escrever o manifesto à mão.

```
/poui-specialist:screenshot <caminho-ou-url>
```

**Exemplos:**
```
/poui-specialist:screenshot C:\prints\tela-titulos.png
/poui-specialist:screenshot https://company.sharepoint.com/tela-parceiros.png
```

O plugin:
1. Lê a imagem via path local ou URL
2. Analisa com visão multimodal — infere tipo de componente, campos, ações e módulo
3. Exibe laudo com o que foi detectado + manifesto pré-preenchido
4. Pergunta se deseja gerar os componentes agora — se sim, despacha o `generate-batch` direto

### Tipos de tela reconhecidos

| O que a imagem mostra | Tipo gerado |
|---|---|
| Tabela com busca simples | `page-list` |
| Tabela com filtros avançados | `page-dynamic-search` |
| Formulário em página inteira | `page-edit` |
| Formulário em modal sobre tabela | `modal-crud` |
| Formulário em etapas numeradas | `stepper-form` |
| Duas tabelas empilhadas horizontalmente | `stacked-browse` |
| Duas tabelas lado a lado para conciliação | `two-panel-browse` |
| Cards com KPIs e gráficos | `dashboard` |
| Tela de detalhe somente leitura | `page-detail` |

### O que é inferido automaticamente

| Elemento visual | Inferência |
|---|---|
| Label com `*` ou cor vermelha | Campo marcado como `(req)` |
| Campo com ícone de calendário | REGRA: `usar po-datepicker` |
| Campo com `R$` ou formato monetário | REGRA: `formatar como moeda BRL` |
| Select/combo com opções visíveis | REGRA: `<campo>: <opções>` |
| Botão customizado (não Novo/Salvar/Cancelar) | REGRA: `Ação customizada: "<nome>"` |
| Título da página ou breadcrumb | Módulo inferido automaticamente |

### Diferença entre `/discover` e `/screenshot`

| | `/discover` | `/screenshot` |
|---|---|---|
| Entrada | Endpoint de API ativo | Imagem (screenshot ou wireframe) |
| Quando usar | API já implementada no backend | Protótipo, wireframe ou sistema legado |
| Dados dos campos | Reais (da resposta JSON) | Inferidos da imagem |

```

- [ ] **Step 6: Verificar a modificação no docs**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs\content\docs\workflow-avancado.mdx" -Pattern "Screenshot para Código" | Select-Object -First 1
```

Esperado: linha contendo `Screenshot para Código`.

- [ ] **Step 7: Commitar e push no docs repo**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs" add content/docs/workflow-avancado.mdx
git -C "C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs" commit -m "docs: adicionar seção Screenshot para Código — skill /poui-specialist:screenshot"
git -C "C:\TOTVS\Projetos\Claude\poui-specialist\poui-specialist-docs" push origin main
```

Esperado: push bem-sucedido para `https://github.com/Alscosta1973/poui-specialist-docs.git`.
