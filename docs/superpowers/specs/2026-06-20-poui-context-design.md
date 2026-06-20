# poui-context — Codebase-Aware Generation

**Date:** 2026-06-20
**Status:** Aprovado
**Scope:** Nova skill `/poui-specialist:context` que escaneia o projeto Angular, detecta rotas registradas e serviços existentes, e produz um snapshot de contexto reutilizável para injetar nas próximas gerações da sessão.

---

## Contexto e Motivação

O `code-generator` agent gera código correto segundo os templates, mas sem consciência do projeto existente. Isso causa:
- Serviços duplicados (novo `TitulosService` quando já existe um)
- Rotas sugeridas que já estão registradas no `app.routes.ts`
- Nomenclatura divergente do padrão real do projeto

A skill `poui-context` resolve isso com um scan explícito e barato — lê apenas dois tipos de arquivo — e produz um snapshot que o usuário injeta no manifesto de geração.

---

## Ativação

**Comando explícito:** `/poui-specialist:context`

Não roda automaticamente. O usuário invoca uma vez por sessão, revisa o snapshot e decide se ativa para as próximas gerações.

---

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `skills/poui-context/SKILL.md` |
| Modificar | `commands/generate.md` — mencionar `/context` como pré-passo opcional |
| Modificar | `skills/poui-generate-batch/SKILL.md` — documentar bloco `CONTEXTO_PROJETO:` no manifesto |
| Modificar | `agents/code-generator.md` — seção "Project Context" com instruções de uso |
| Sync | `sync-to-cache.ps1` após qualquer alteração |

---

## Fluxo Completo

### Passo 1 — Localizar raiz do projeto Angular

Subir até 3 níveis procurando `angular.json`:

```powershell
$angularRoot = $null
$dir = (Get-Location).Path
for ($i = 0; $i -lt 4; $i++) {
    if (Test-Path (Join-Path $dir "angular.json")) {
        $angularRoot = $dir
        break
    }
    $dir = Split-Path $dir -Parent
}
```

Se não encontrado: exibir e encerrar:

```
⚠ Nenhum projeto Angular encontrado — scan de contexto ignorado.
```

### Passo 2 — Scan dirigido (2 fontes)

**Fonte 1 — Rotas registradas:**

Ler `$angularRoot/src/app/app.routes.ts` e extrair todos os valores de `path:` presentes no arquivo.

**Fonte 2 — Serviços gerados pelo plugin:**

Listar todos os arquivos `*.service.ts` em `$angularRoot/src/app/**`. Para cada arquivo que contenha a linha `@generated  poui-specialist`:
- Extrair o nome da classe (`export class <Nome>Service`)
- Extrair o `baseUrl` (`private readonly baseUrl = '<valor>'`)
- Inferir o módulo a partir do caminho do arquivo (`src/app/<módulo>/...`)

### Passo 3 — Montar snapshot

Produzir o bloco no seguinte formato:

```
## Contexto do Projeto Angular

### Rotas registradas (app.routes.ts)
- <path-1>
- <path-2>
...

### Serviços existentes (@generated poui-specialist)
- <NomeService> → <baseUrl>  (src/app/<módulo>/)
...

### Padrão de nomenclatura detectado
- Pasta: src/app/<módulo>/<entidade-kebab>/
- Serviço: <EntidadePascal>Service
- API base inferida: /api/<módulo-predominante>/  ← módulo com mais serviços encontrados; se empate, listar ambos
```

Se nenhum serviço `@generated` for encontrado: omitir a seção de serviços e indicar `Nenhum serviço gerado pelo plugin detectado`.

### Passo 4 — Exibir e confirmar

Exibir o snapshot completo e perguntar:

```
Contexto detectado. Usar nas próximas gerações desta sessão? [S/n]
```

- **S** (ou Enter): exibir o bloco `CONTEXTO_PROJETO:` formatado para o usuário copiar:

```
Cole este bloco no seu próximo manifesto /generate-batch ou /generate:

CONTEXTO_PROJETO:
  rotas: [<path-1>, <path-2>, ...]
  servicos: [<NomeService> → <baseUrl>, ...]
  padrao: src/app/<módulo>/<entidade>/
```

- **n**: exibir o snapshot como referência mas encerrar sem o bloco de ativação.

---

## Como o Code-Generator Usa o Contexto

Quando o manifesto contém o bloco `CONTEXTO_PROJETO:`, o `code-generator` agent:

| Situação | Ação |
|----------|------|
| Rota do componente já existe em `rotas:` | Avisa: *"Rota `<path>` já registrada — não será adicionada ao app.routes.ts"* |
| Serviço com mesmo `baseUrl` já existe em `servicos:` | Reutiliza o serviço existente: importa sem criar novo arquivo |
| `API_BASE` não especificado no manifesto | Sugere o valor inferido de `padrao:` |
| Nenhum conflito | Geração normal — contexto apenas informa |

O contexto **não bloqueia** a geração — apenas avisa e ajusta. O usuário pode sobrescrever qualquer sugestão editando o manifesto.

---

## Integração com `/generate-batch`

O bloco `CONTEXTO_PROJETO:` é aceito no manifesto como campo opcional, entre `PASTA_DESTINO:` e `COMPONENTES:`:

```
/poui-specialist:generate-batch

MODULO: financeiro/titulos
API_BASE: /api/financeiro
PASTA_DESTINO: src/app/financeiro/titulos

CONTEXTO_PROJETO:
  rotas: [faturamento/gerar-nf-pedido, financeiro/divergencias-cartao]
  servicos: [CadTaxaService → /api/financeiro/cad-taxa]
  padrao: src/app/<módulo>/<entidade>/

COMPONENTES:
| tipo      | classe               | endpoint  | campos                  |
|-----------|----------------------|-----------|-------------------------|
| page-list | TitulosListComponent | /titulos  | codTit, nomCli, vlrTit  |
| service   | TitulosService       | /titulos  | -                       |
```

O `generate-batch` repassa o bloco para cada subagente do `code-generator`.

---

## Integração com `/generate` (componente único)

O usuário cola o bloco de contexto no prompt antes de invocar:

```
/poui-specialist:generate page-list Titulos --module financeiro

CONTEXTO_PROJETO:
  rotas: [faturamento/gerar-nf-pedido, financeiro/divergencias-cartao]
  servicos: [CadTaxaService → /api/financeiro/cad-taxa]
  padrao: src/app/<módulo>/<entidade>/
```

---

## Restrições

- **Nunca modificar** arquivos do projeto — scan é somente leitura
- **Nunca escanear** arquivos sem `@generated  poui-specialist` (exceto `app.routes.ts`)
- **Não roda automaticamente** — sempre requer invocação explícita do usuário
- Contexto não persiste entre sessões — deve ser re-gerado a cada nova sessão Claude

---

## Checklist de Validação

- [ ] Localiza `angular.json` corretamente
- [ ] Lê `app.routes.ts` e extrai todos os paths
- [ ] Filtra serviços pelo header `@generated  poui-specialist`
- [ ] Extrai nome da classe e `baseUrl` de cada serviço
- [ ] Detecta padrão de nomenclatura das pastas
- [ ] Exibe snapshot formatado antes de confirmar
- [ ] Pergunta `[S/n]` antes de ativar
- [ ] Exibe bloco `CONTEXTO_PROJETO:` pronto para colar
- [ ] Code-generator evita duplicar serviço com mesmo `baseUrl`
- [ ] Code-generator avisa sobre rota já registrada
- [ ] Integração documentada em `generate.md` e `generate-batch/SKILL.md`
- [ ] Seção "Project Context" adicionada ao `code-generator.md`
