# Obsidian Memory System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar a pasta `memory/` do projeto poui-specialist como vault Obsidian e configurar acesso MCP para reduzir tokens e eliminar revisão de contexto manual a cada sessão.

**Architecture:** A pasta `memory/` existente se torna um vault Obsidian sem migração. Um servidor MCP filesystem (`@modelcontextprotocol/server-filesystem`) é registrado no `settings.json` global do Claude Code apontando para essa pasta. Uma nota `_contexto-atual.md` concentra o estado corrente da sessão. O `CLAUDE.md` global é atualizado para instruir o Claude a usar as ferramentas MCP quando disponíveis.

**Tech Stack:** Claude Code MCP, `@modelcontextprotocol/server-filesystem` (npx), Obsidian (UI), Markdown.

**Spec:** `docs/superpowers/specs/2026-06-11-obsidian-memory-design.md`

---

## Mapa de Arquivos

| Arquivo | Operação | Responsabilidade |
|---------|----------|-----------------|
| `C:\Users\andre\.claude\projects\C--TOTVS-Projetos-Claude-poui-specialist\memory\_contexto-atual.md` | Criar | Nota de estado corrente da sessão |
| `C:\Users\andre\.claude\settings.json` | Editar | Registrar servidor MCP filesystem |
| `C:\Users\andre\.claude\CLAUDE.md` | Editar | Instruções para usar MCP no acesso a memórias |

> Nenhum destes arquivos está em repositório git — não há commits neste plano.

---

### Task 1: Criar `_contexto-atual.md`

**Files:**
- Create: `C:\Users\andre\.claude\projects\C--TOTVS-Projetos-Claude-poui-specialist\memory\_contexto-atual.md`

- [ ] **Step 1: Verificar que a pasta memory existe**

```powershell
Test-Path "C:\Users\andre\.claude\projects\C--TOTVS-Projetos-Claude-poui-specialist\memory"
```

Esperado: `True`. Se `False`, a pasta foi movida — verificar o caminho correto antes de continuar.

- [ ] **Step 2: Criar o arquivo `_contexto-atual.md`**

Criar o arquivo com o seguinte conteúdo (o prefixo `_` garante que aparece no topo da listagem):

```markdown
---
name: contexto-atual
description: Estado corrente da sessão de trabalho — atualizar ao fim de cada sessão
metadata:
  type: project
---

## Projeto ativo
poui-specialist — plugin Angular PO-UI para Protheus

## Onde parei
<!-- Atualizar ao fim de cada sessão -->
- Última tarefa: Configuração do vault Obsidian e MCP (2026-06-11)
- Commit: 74fd523 docs: adiciona spec de integração Obsidian como memory system via MCP
- Branch: master

## Próximos passos
1. Validar que o MCP memory server funciona em nova sessão
2. Confirmar que `_contexto-atual.md` é lido via MCP ao início de sessão
3. Avaliar se Opção B (skills no Obsidian) vale a pena como fase 2

## Decisões abertas
- Token optimization das skill files (po-ui-quirks.md 600 linhas) — pendente

## Contexto rápido
Plugin poui-specialist v1.3.0. Acabamos de corrigir 4 bugs críticos no agent (po-table selection, 'tag' inválido) e adicionar stacked-browse/two-panel-browse/models/tlpp-contract ao /generate. Agora configurando Obsidian como memory system via MCP filesystem.
```

- [ ] **Step 3: Verificar criação**

```powershell
Test-Path "C:\Users\andre\.claude\projects\C--TOTVS-Projetos-Claude-poui-specialist\memory\_contexto-atual.md"
```

Esperado: `True`.

```powershell
Select-String -Path "C:\Users\andre\.claude\projects\C--TOTVS-Projetos-Claude-poui-specialist\memory\_contexto-atual.md" -Pattern "contexto-atual"
```

Esperado: linha com `name: contexto-atual`.

---

### Task 2: Configurar MCP server em `settings.json`

**Files:**
- Modify: `C:\Users\andre\.claude\settings.json`

- [ ] **Step 1: Verificar estado atual do settings.json**

Ler o arquivo para confirmar que não existe bloco `mcpServers`:

```powershell
Select-String -Path "C:\Users\andre\.claude\settings.json" -Pattern "mcpServers"
```

Esperado: sem saída. Se aparecer, verificar se já existe configuração MCP antes de editar.

- [ ] **Step 2: Adicionar bloco `mcpServers` ao settings.json**

O `settings.json` atual termina com `"theme": "dark-ansi"` seguido de `}`. Substituir a linha final para adicionar o bloco MCP antes do fechamento:

Conteúdo final do arquivo (substituição completa para garantir JSON válido):

```json
{
  "skillListingMaxDescChars": 400,
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "playwright@claude-plugins-official": true,
    "prd-builder@mwguerra-marketplace": true,
    "taskmanager@mwguerra-marketplace": true,
    "advpl-specialist@advpl-specialist-marketplace": true,
    "claude-mem@thedotmack": true,
    "poui-specialist@poui-specialist-marketplace": true
  },
  "extraKnownMarketplaces": {
    "mwguerra-marketplace": {
      "source": {
        "source": "github",
        "repo": "mwguerra/claude-code-plugins"
      }
    },
    "advpl-specialist-marketplace": {
      "source": {
        "source": "github",
        "repo": "thalysjuvenal/advpl-specialist"
      }
    },
    "thedotmack": {
      "source": {
        "source": "github",
        "repo": "thedotmack/claude-mem"
      }
    },
    "poui-specialist-marketplace": {
      "source": {
        "source": "directory",
        "path": "C:\\TOTVS\\Projetos\\Claude\\poui-specialist"
      }
    }
  },
  "autoUpdatesChannel": "latest",
  "skipDangerousModePermissionPrompt": true,
  "theme": "dark-ansi",
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\andre\\.claude\\projects\\C--TOTVS-Projetos-Claude-poui-specialist\\memory"
      ]
    }
  }
}
```

- [ ] **Step 3: Verificar JSON válido**

```powershell
Get-Content "C:\Users\andre\.claude\settings.json" | ConvertFrom-Json | Select-Object -ExpandProperty mcpServers
```

Esperado: objeto com chave `memory` contendo `command` e `args`.

---

### Task 3: Abrir vault no Obsidian (passo manual)

**Files:** nenhum — passo de configuração da UI do Obsidian.

- [ ] **Step 1: Abrir o Obsidian**

Iniciar o Obsidian. Se for a primeira vez, a tela inicial pergunta "Open folder as vault" ou "Create new vault".

- [ ] **Step 2: Adicionar o vault existente**

Escolher **"Open folder as vault"** e navegar até:
```
C:\Users\andre\.claude\projects\C--TOTVS-Projetos-Claude-poui-specialist\memory
```

Se o Obsidian já estiver aberto com outro vault, ir em: `File → Open vault → Open folder as vault`.

- [ ] **Step 3: Verificar que o vault carregou os arquivos**

No painel esquerdo do Obsidian (Files), confirmar que os arquivos aparecem:
- `_contexto-atual.md` (deve aparecer no topo por causa do `_`)
- `MEMORY.md`
- `feedback-*.md`
- `project-*.md`
- `user-*.md`

- [ ] **Step 4: Confirmar graph view**

Ir em `View → Graph view` no Obsidian. Os arquivos com `[[backlinks]]` devem aparecer conectados no grafo.

---

### Task 4: Atualizar `CLAUDE.md` com instruções MCP

**Files:**
- Modify: `C:\Users\andre\.claude\CLAUDE.md`

- [ ] **Step 1: Localizar o final do arquivo**

O `CLAUDE.md` termina com a seção de `ADVPL/TLPP Coding Standards`. A nova seção deve ser adicionada imediatamente após a seção `# auto memory` existente (que já instrui como salvar memórias) e antes de qualquer outra seção final.

- [ ] **Step 2: Adicionar seção de acesso MCP**

Encontrar no arquivo a linha:

```
There are several discrete types of memory that you can store in your memory system:
```

E adicionar imediatamente ANTES dessa linha:

```markdown
## Memory Access — Usar MCP quando disponível

Quando o servidor MCP `memory` estiver disponível (ferramentas `read_file`, `write_file`, `list_directory`):

- **Início de sessão:** chamar `read_file` com path `_contexto-atual.md` para recuperar o estado corrente do projeto em vez de rever múltiplos arquivos
- **Acesso a memória específica:** chamar `read_file` com o nome do arquivo (ex: `feedback-plugin-no-project-refs.md`)
- **Descoberta de memórias:** chamar `list_directory` com path `/` para listar todas as notas disponíveis
- **Salvar memória nova:** chamar `write_file` com o path e conteúdo no formato frontmatter padrão
- **Atualizar contexto ao fim da sessão:** chamar `write_file` em `_contexto-atual.md` com o estado atualizado (onde parou, próximos passos, decisões abertas)
- **Preferência:** usar sempre as ferramentas MCP acima em vez de Read/Write/Edit para o diretório `memory/`

```

- [ ] **Step 3: Verificar a adição**

```powershell
Select-String -Path "C:\Users\andre\.claude\CLAUDE.md" -Pattern "Memory Access"
```

Esperado: linha com `## Memory Access — Usar MCP quando disponível`.

---

### Task 5: Validar MCP end-to-end

**Files:** nenhum — passo de validação.

- [ ] **Step 1: Reiniciar o Claude Code**

Fechar e reabrir o Claude Code (ou a sessão atual). O servidor MCP é inicializado na abertura de uma nova conversa.

- [ ] **Step 2: Verificar que o servidor MCP iniciou**

No início de uma nova conversa, o Claude Code exibe os servidores MCP conectados. Confirmar que `memory` aparece na lista de ferramentas disponíveis.

Se não aparecer, verificar:
1. Node.js está instalado: `node --version` (esperado: v18+)
2. O JSON do `settings.json` é válido: `Get-Content C:\Users\andre\.claude\settings.json | ConvertFrom-Json`
3. O caminho da pasta memory existe: `Test-Path "C:\Users\andre\.claude\projects\C--TOTVS-Projetos-Claude-poui-specialist\memory"`

- [ ] **Step 3: Testar leitura via MCP**

Em uma nova conversa, pedir ao Claude:

> "Usando a ferramenta MCP memory, leia o arquivo `_contexto-atual.md` e me diga onde o projeto parou."

Esperado: Claude usa `read_file("_contexto-atual.md")` e retorna o conteúdo da nota sem usar a ferramenta Read do filesystem.

- [ ] **Step 4: Testar listagem via MCP**

Pedir ao Claude:

> "Liste todos os arquivos de memória disponíveis via MCP."

Esperado: Claude usa `list_directory("/")` e retorna a lista de `.md` files.

- [ ] **Step 5: Testar escrita via MCP**

Pedir ao Claude:

> "Atualize o campo 'Onde parei' em `_contexto-atual.md` via MCP para registrar que o MCP foi validado com sucesso hoje."

Esperado: Claude usa `write_file("_contexto-atual.md", ...)` e a nota é atualizada (verificar no Obsidian que o arquivo mudou).

---

## Self-Review

**Cobertura do spec:**
- Vault = pasta memory/ sem migração → Task 1 (criação do `_contexto-atual.md`, não há migração) ✓
- MCP configurado em `~/.claude/settings.json` → Task 2 ✓
- Abrir vault no Obsidian → Task 3 ✓
- `_contexto-atual.md` como ponto de entrada → Task 1 + Task 5 ✓
- Claude usa MCP search para memórias detalhadas → Task 4 (CLAUDE.md) ✓
- Validação end-to-end → Task 5 ✓

**Placeholders:** nenhum. Todos os steps têm comandos e conteúdo exatos.

**Consistência:** o caminho `C:\Users\andre\.claude\projects\C--TOTVS-Projetos-Claude-poui-specialist\memory` é usado identicamente em Task 1, Task 2 e Task 3.
