# Obsidian como Memory System — Design Spec
**Data:** 2026-06-11
**Escopo:** Integrar Obsidian via MCP ao sistema de memória do projeto poui-specialist para reduzir consumo de tokens e eliminar revisão de contexto manual a cada sessão

---

## Problema

Dois pontos de desperdício de tokens no fluxo atual:

1. **Contexto de sessão:** cada nova conversa exige revisão manual de múltiplos arquivos de memória para reconstruir onde o projeto está (o que foi feito, decisões abertas, próximos passos).
2. **Leitura de memórias detalhadas:** ao acessar uma memória específica, o Claude carrega o arquivo inteiro (100-300 linhas) mesmo precisando de apenas uma seção.

---

## Solução

Usar o servidor MCP `mcp-obsidian` apontado para a pasta `memory/` existente do projeto. O vault Obsidian é a própria pasta — sem migração. O Claude passa a usar ferramentas MCP para buscar e escrever memórias em vez das ferramentas Read/Write/Edit.

---

## Arquitetura

### Vault

```
C:\Users\andre\.claude\projects\
  C--TOTVS-Projetos-Claude-poui-specialist\
    memory\                         ← vault Obsidian (pasta existente, sem mudança)
      MEMORY.md                     ← índice leve, continua injetado pelo harness
      feedback-*.md                 ← notas existentes, válidas sem alteração
      project-*.md
      user-*.md
      reference-*.md
      _contexto-atual.md            ← NOVO: nota de estado da sessão corrente
```

### Ferramentas MCP disponíveis

| Ferramenta | Uso |
|------------|-----|
| `search` | Busca full-text por conteúdo sem precisar do nome do arquivo |
| `get_file_contents` | Lê nota específica quando o nome é conhecido |
| `create_or_update_file` | Cria ou sobrescreve uma nota |
| `patch_content` | Append em nota existente |
| `list_files_in_vault` | Lista todas as notas disponíveis |

### Mudança no fluxo

| Ação | Antes | Com Obsidian MCP |
|------|-------|-----------------|
| Ler memória específica | `Read("memory/feedback-xyz.md")` — arquivo inteiro | `search("feedback sobre X")` — só o trecho relevante |
| Escrever memória | `Write` / `Edit` | `create_or_update_file` via MCP |
| Revisar estado da sessão | Lê MEMORY.md + vários arquivos | Lê `_contexto-atual.md` (~30 linhas) |
| Usuário gerenciar memórias | Editor de texto | Interface Obsidian com graph view, backlinks, search |

---

## Arquivo `_contexto-atual.md`

Nota nova na raiz do vault. Ponto de entrada de cada sessão — substitui a revisão manual de múltiplos arquivos.

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
- Última tarefa: 
- Commit: 
- Branch: 

## Próximos passos
1. 
2. 

## Decisões abertas
- 

## Contexto rápido
<!-- 2-3 linhas do que importa saber para retomar -->
```

**Comportamento do Claude:**
- **Início de sessão:** `search("contexto atual")` → lê `_contexto-atual.md`
- **Fim de sessão:** `patch_content` atualiza a nota com o que foi feito e próximos passos
- **Durante a sessão:** memórias detalhadas acessadas via `search` quando relevantes, não carregadas proativamente

---

## Configuração

### 1. Abrir vault no Obsidian

Abrir o Obsidian e adicionar vault apontando para:
```
C:\Users\andre\.claude\projects\C--TOTVS-Projetos-Claude-poui-specialist\memory
```

### 2. Configurar MCP em `~/.claude/settings.json`

Adicionar ao bloco `mcpServers`:
```json
{
  "mcpServers": {
    "obsidian-memory": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-obsidian",
        "C:\\Users\\andre\\.claude\\projects\\C--TOTVS-Projetos-Claude-poui-specialist\\memory"
      ]
    }
  }
}
```

**Pré-requisito:** Node.js instalado (`npx` disponível). O `mcp-obsidian` é baixado automaticamente via `npx -y` na primeira execução. O Obsidian precisa estar aberto com o vault configurado.

### 3. Atualizar `CLAUDE.md` global (após validar o MCP)

Adicionar ao bloco de instruções de memória:
```
Quando o MCP `obsidian-memory` estiver disponível:
- Usar `search` e `get_file_contents` para ler memórias
- Usar `create_or_update_file` para escrever memórias novas
- Usar `patch_content` para atualizar `_contexto-atual.md`
- Preferir MCP sobre as ferramentas Read/Write/Edit para o diretório memory/
```

---

## Fora do Escopo

- Cobertura global (outros projetos além do poui-specialist)
- Migração das notas para um vault separado
- Integração das skills do plugin com Obsidian (Opção B/C — fase futura)
- Plugins Obsidian adicionais (Dataview, Templater, etc.)

---

## Critérios de Sucesso

1. Claude consegue responder "onde paramos?" no início de uma sessão lendo apenas `_contexto-atual.md` via MCP search
2. Ao salvar uma nova memória, Claude usa `create_or_update_file` via MCP em vez de Write
3. Usuário consegue visualizar e editar memórias no Obsidian com graph view funcional
4. Tokens gastos em acesso a memórias detalhadas reduzem ≥50% (search vs. read de arquivo inteiro)
