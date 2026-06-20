# poui-quality — Agente de Qualidade Contínua

**Date:** 2026-06-20
**Status:** Aprovado
**Scope:** Nova skill `/poui-specialist:quality` que audita componentes Angular gerados pelo plugin e emite relatório de qualidade com 5 critérios regex, sem modificar nenhum arquivo.

---

## Contexto e Motivação

O plugin gera componentes com OnPush, finalize, takeUntilDestroyed e error handling por padrão. Porém, edições manuais após a geração ou refatorações podem remover esses padrões sem que o desenvolvedor perceba. A skill `poui-quality` age como um tech lead revisando o projeto periodicamente — varre todos os componentes gerados e informa quais estão fora do padrão.

---

## Ativação

**Comando explícito:** `/poui-specialist:quality`

Sem argumentos. Sem confirmação prévia — executa e exibe o relatório diretamente.

---

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `skills/poui-quality/SKILL.md` |
| Modificar | `commands/generate.md` — mencionar `/quality` após fluxo de geração |
| Sync | `sync-to-cache.ps1` após qualquer alteração |

---

## Fluxo Completo

### Passo 1 — Localizar raiz do projeto Angular

Subir até 3 níveis procurando `angular.json` (mesmo loop do `/context`):

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

Se não encontrado, exibir e encerrar:

```
⚠ Nenhum projeto Angular encontrado — auditoria cancelada.
```

### Passo 2 — Coletar artefatos a auditar

**Componentes:** todos os `*.component.ts` em `src/app/**` que contenham `@generated  poui-specialist` (dois espaços).

```powershell
$components = Get-ChildItem -Path (Join-Path $angularRoot "src/app") -Filter "*.component.ts" -Recurse |
    Where-Object { (Get-Content $_.FullName -Raw) -match '@generated  poui-specialist' }
```

**Rotas:** ler `src/app/app.routes.ts` se existir.

```powershell
$routesFile = Join-Path $angularRoot "src/app/app.routes.ts"
$routesContent = if (Test-Path $routesFile) { Get-Content $routesFile -Raw } else { '' }
```

### Passo 3 — Aplicar 5 regras

Para cada componente em `$components`, ler o conteúdo e aplicar:

| # | Critério | Regex de aprovação | Severidade se falhar |
|---|---|---|---|
| 1 | OnPush | `ChangeDetectionStrategy\.OnPush` | Crítico |
| 2 | Loading state | `finalize\(` | Atenção |
| 3 | Error handling | `notification\.error\(|catchError\(` | Atenção |
| 4 | Cleanup observables | `takeUntilDestroyed` | Atenção |
| 5 | Lazy loading (rotas) | Todas as entradas em `app.routes.ts` usam `loadComponent:` em vez de `component:` | Atenção |

**Regra 5 — detalhe:** Varre `app.routes.ts` e lista TODAS as entradas com `path:`. Para cada uma, verifica se usa `loadComponent:` (lazy — aprovado) ou `component:` (import direto — reprovado). Reportado como seção separada no relatório, sem correlacionar com componentes individuais (a rota real pode não bater com a estrutura de pastas).

### Passo 4 — Montar e exibir relatório

**Agrupamento:**
- **Aprovado:** critérios 1–4 todos verdes
- **Atenção necessária:** qualquer critério 2, 3 ou 4 vermelho (critério 1 verde)
- **Crítico:** critério OnPush ausente (independente dos demais)

**Formato do relatório:**

```
## Relatório de Qualidade PO-UI
Auditado em: <data> | Componentes: N | Rotas auditadas: M

### ✅ Aprovados (X)
- src/app/<módulo>/<entidade>/<arquivo>.component.ts — 4/4 critérios

### ⚠️ Atenção necessária (Y)
src/app/<módulo>/<entidade>/<arquivo>.component.ts — X/4 critérios

| Critério              | Status | Ação sugerida                                               |
|-----------------------|--------|-------------------------------------------------------------|
| OnPush                | ✅/❌  | Adicionar changeDetection: ChangeDetectionStrategy.OnPush   |
| Loading state         | ✅/❌  | Adicionar finalize(() => this.loading.set(false)) nas chamadas HTTP |
| Error handling        | ✅/❌  | Adicionar this.notification.error(...) ou catchError(...)   |
| Cleanup observables   | ✅/❌  | Adicionar .pipe(takeUntilDestroyed()) nos observables       |

> Critério 5 (Lazy loading) é auditado como seção separada "Rotas auditadas" — não por componente individual.

### 🔴 Críticos (Z)
<mesmo formato, destacar OnPush como bloqueante>

### Rotas auditadas (app.routes.ts)
| Rota                    | Lazy loading     |
|-------------------------|------------------|
| <módulo>/<entidade>     | ✅ loadComponent |
| <módulo>/<entidade>     | ❌ component     |

---
Resumo: X aprovados · Y com atenção · Z críticos
Para corrigir, edite os arquivos indicados. Nenhuma alteração foi feita automaticamente.
```

---

## Restrições

- **Nunca modificar** arquivos do projeto — auditoria é somente leitura
- **Nunca auditar** componentes sem `@generated  poui-specialist` (exceto `app.routes.ts`)
- **Não pede confirmação** — executa e exibe o relatório direto
- **Não integra automaticamente** com `generate-batch` — o usuário invoca quando quiser
- Relatório sempre exibe data atual para rastreabilidade

---

## Critérios de Qualidade — Justificativa

| Critério | Por que importa |
|---|---|
| OnPush | Sem OnPush, Angular re-renderiza o componente em todo ciclo de detecção de mudanças — impacto direto de performance |
| Loading state (`finalize`) | Sem finalize, o loading spinner pode ficar ativo mesmo após erro ou conclusão da chamada HTTP |
| Error handling | Sem notificação de erro, o usuário não sabe que uma operação falhou — silent fail |
| Cleanup observables | Sem takeUntilDestroyed, observables ficam ativos após o componente ser destruído — memory leak |
| Lazy loading | Sem loadComponent, todos os módulos são carregados no bundle inicial — tempo de carga ruim |

---

## Checklist de Validação

- [ ] Localiza `angular.json` corretamente
- [ ] Filtra componentes pelo header `@generated  poui-specialist`
- [ ] Aplica as 5 regras com regex correto
- [ ] Agrupa resultados em aprovados / atenção / críticos
- [ ] Exibe ação sugerida para cada critério falho
- [ ] Audita rotas em `app.routes.ts` para lazy loading
- [ ] Nunca modifica arquivos
- [ ] Exibe data e contagem de componentes auditados
