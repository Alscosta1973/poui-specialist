# poui-build-fix — Self-Correction Loop

**Date:** 2026-06-20
**Status:** Aprovado
**Scope:** Nova skill `/poui-specialist:build-fix` que compila o projeto Angular após geração, detecta erros TypeScript/template e os corrige automaticamente em até 3 tentativas, sem intervenção do usuário.

---

## Contexto e Motivação

O `code-generator` agent gera arquivos Angular corretos segundo os templates, mas erros sutis de tipagem, imports ou bindings podem ocorrer dependendo das customizações do projeto (tipos de campos, nomes de interfaces, versões de biblioteca). Atualmente o usuário só descobre esses erros ao rodar o build manualmente.

A skill `poui-build-fix` elimina essa etapa manual: compila automaticamente após cada geração e autocorrige os erros encontrados, entregando código compilável na primeira tentativa.

---

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `skills/poui-build-fix/SKILL.md` |
| Modificar | `commands/generate.md` — invocar build-fix como Phase 5 automática após Phase 4 |
| Modificar | `skills/poui-generate-batch/SKILL.md` — invocar build-fix como Passo 5 após todos os componentes |
| Sync | `sync-to-cache.ps1` após qualquer alteração |

---

## Ativação

**Via `/generate`:** automática, sem perguntar ao usuário. Roda imediatamente após a Phase 4 (Verify angular.json) do `code-generator` agent.

**Via `/generate-batch`:** automática, uma única vez ao final do batch — após o Passo 4 (Relatório de Geração em Lote), não após cada componente individual.

---

## Fluxo Completo

### Passo 1 — Localizar raiz do projeto Angular

Buscar `angular.json` subindo até 3 níveis a partir do diretório atual:

```powershell
Get-ChildItem -Path . -Filter angular.json -Recurse -Depth 3 | Select-Object -First 1 FullName
```

Se não encontrado: exibir aviso e encerrar sem erro:

```
⚠ Nenhum projeto Angular encontrado — build verification ignorada.
Os arquivos foram gerados mas não foram compilados.
```

### Passo 2 — Compilar o projeto

Na raiz do projeto Angular, rodar:

```powershell
ng build --configuration development 2>&1
```

Timeout: 120 segundos. Se timeout estourar:

```
⚠ Build demorou mais de 120s — verifique se o projeto tem erros de dependência.
```

### Passo 3 — Inspecionar o resultado

**Se exit code 0 (sem erros):**

```
## Build Verification

✅ Build passou na tentativa 1 — nenhum erro TypeScript ou de template.
   Arquivos gerados compilam sem erros.
```

Encerrar.

**Se exit code ≠ 0 (erros encontrados):**

Parsear o output linha a linha. Formato dos erros do Angular CLI:

```
ERROR in src/app/financeiro/titulos/titulos-list.component.ts:15:5
Property 'items' does not exist on type 'TitulosListComponent'.
```

Agrupar erros por arquivo. Identificar quais arquivos pertencem ao plugin (contêm o header `@generated  poui-specialist`) versus arquivos pré-existentes do projeto.

**Erros em arquivos pré-existentes:** registrar no relatório final mas NÃO tentar corrigir — esses arquivos não foram gerados pelo plugin.

**Erros em arquivos gerados pelo plugin:** corrigir no Passo 4.

### Passo 4 — Loop de correção (até 3 tentativas)

Para cada arquivo gerado com erros:

1. `Read` o arquivo completo
2. Ler as mensagens de erro associadas a esse arquivo
3. Aplicar a correção diretamente (`Edit` ou `Write`)
4. Registrar o que foi corrigido

**Tipos de erro que a skill corrige:**

| Erro | Correção |
|------|----------|
| `Property 'x' does not exist on type 'Y'` | Adicionar propriedade à interface ou corrigir referência |
| `Cannot find module '...'` | Corrigir path do import ou adicionar import ausente |
| `Type 'string' is not assignable to type 'number'` | Corrigir casting ou tipo na interface |
| `Property 'x' does not exist on type 'Y'` para inputs PO-UI | Verificar nome correto do input segundo `agents/code-generator.md` |
| `Expected N arguments, but got M` | Ajustar chamada do método |

Após corrigir todos os arquivos com erro, rodar o build novamente (Passo 2).

Repetir até:
- Build passar (exit code 0) → sucesso
- 3 tentativas esgotadas → exibir relatório de erros restantes

### Passo 5 — Relatório final

**Sucesso após N tentativas:**

```
## Build Verification

✅ Build passou na tentativa N — todos os erros foram corrigidos automaticamente.

   Correções aplicadas:
   - titulos-list.component.ts: propriedade 'isLoading' adicionada à interface
   - titulos-edit.component.ts: import 'PoNotificationService' corrigido
```

**Erros restantes após 3 tentativas:**

```
## Build Verification

⚠ 2 erros corrigidos automaticamente nas tentativas 1-2.
❌ 1 erro restante após 3 tentativas — requer atenção manual:

   src/app/financeiro/titulos/titulos-edit.component.ts:42:3
   Argument of type 'string' is not assignable to parameter of type 'number'.
   → Campo 'valor' está mapeado como string mas o modelo espera number.
     Verifique a interface TituloModel e o tipo do campo no manifesto.
```

**Erros em arquivos pré-existentes (não corrigidos):**

```
⚠ Erros encontrados em arquivos pré-existentes do projeto (não modificados pelo plugin):
   src/app/app.routes.ts:5:3 — ...
   Estes erros existiam antes da geração e precisam de correção manual.
```

---

## Restrições

- **Nunca modificar** arquivos sem o header `@generated  poui-specialist` — apenas corrige o que o plugin gerou
- **Nunca modificar** `angular.json`, `tsconfig.json`, `package.json`
- **Máximo 3 tentativas** — após isso, exibir erros restantes e encerrar sem loop infinito
- **Timeout 120s por build** — se estourar, encerrar com aviso

---

## Integração com `commands/generate.md`

Adicionar no final do `commands/generate.md`, após o bloco atual da Phase 4:

```markdown
## Phase 5: Build Verification (automática)

Após confirmar os arquivos gerados, invocar automaticamente a skill `poui-specialist:build-fix`.
Não perguntar ao usuário — executar direto.
```

## Integração com `skills/poui-generate-batch/SKILL.md`

Adicionar como Passo 5 após o Passo 4 (Relatório final):

```markdown
### Passo 5 — Verificação de build

Após o relatório de geração, invocar `/poui-specialist:build-fix` para compilar todos
os componentes gerados e corrigir erros automaticamente.
```

---

## Checklist de Validação

- [ ] Localiza `angular.json` corretamente
- [ ] Roda `ng build --configuration development` e captura o output completo
- [ ] Build limpo encerra com mensagem de sucesso na primeira tentativa
- [ ] Erros são parseados e agrupados por arquivo
- [ ] Apenas arquivos com header `@generated  poui-specialist` são modificados
- [ ] Corrige erros de propriedade ausente, import, tipo incompatível e argumento
- [ ] Após correção, roda o build novamente
- [ ] Loop respeita o máximo de 3 tentativas
- [ ] Relatório de sucesso lista as correções aplicadas
- [ ] Relatório de falha exibe erros restantes com mensagem de diagnóstico
- [ ] Erros em arquivos pré-existentes são listados mas não modificados
- [ ] Timeout de 120s por build tratado com aviso
- [ ] Integração em `generate.md` automática (sem prompt ao usuário)
- [ ] Integração em `generate-batch` ao final do batch (não por componente)
