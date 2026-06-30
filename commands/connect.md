---
description: Connect a PO-UI Angular component to real Protheus REST data — replaces mocks, updates proxy, generates TLPP contract if needed
allowed-tools: Read, Write, Edit, Glob, Grep, Skill, Bash, AskUserQuestion
argument-hint: "<ComponentClass> --module <module>"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:connect

Conecta um componente Angular (gerado pelo plugin) aos dados reais do Protheus, substituindo mocks
por chamadas HTTP reais, configurando o proxy e gerando o contrato TLPP quando necessário.

## Exemplos

```bash
/poui-specialist:connect DivergenciasCartaoComponent --module financeiro/divergencias-cartao
/poui-specialist:connect TitulosListComponent --module financeiro/titulos-list
/poui-specialist:connect ParceirosComponent --module faturamento/parceiros
```

## Pré-passo — Backup preventivo

Antes de invocar a skill, verificar os arquivos que serão modificados e criar backups `.bak`:

```powershell
# Service do componente (sempre modificado)
$svcPath = "src/app/<module>/<kebab-name>.service.ts"
if (Test-Path $svcPath) { Copy-Item $svcPath "$svcPath.bak" }

# Mock interceptor (se existir — será desativado/removido)
# Substitua pelo caminho real do interceptor se aplicável
# Copy-Item "<interceptor-path>" "<interceptor-path>.bak"
```

Para restaurar um arquivo: `Copy-Item arquivo.ts.bak arquivo.ts`
Para remover backups após confirmar que tudo funciona: `Get-ChildItem src/ -Filter "*.bak" -Recurse | Remove-Item`

## Passo — Verificar `.gitignore`

Após criar/atualizar `proxy.conf.json`, verificar se ele consta no `.gitignore` do projeto:

```powershell
if (-not (Select-String -Path ".gitignore" -Pattern "proxy\.conf\.json" -Quiet)) {
    Add-Content ".gitignore" "`n# Proxy — pode conter endereços de servidores internos`nproxy.conf.json"
    Write-Host "⚠ proxy.conf.json adicionado ao .gitignore — contém endereços que não devem ir ao repositório."
}
```

> `proxy.conf.json` pode conter IPs/hostnames de servidores de produção. Confirmar que está no `.gitignore` antes de qualquer `git add`.

## Processo

1. **Invocar skill `poui-specialist:poui-connect`** — executa os 9 passos:
   diagnóstico de mocks, coleta de dados de conexão, atualização de proxy,
   substituição do service, desativação de interceptors, geração de TLPP se necessário,
   atualização de specs e verificação de build.

## Guia de pedido

Para preparar um pedido completo, consulte:
`skills/poui-connect/protheus-connect-guide.md`

Formato mínimo:
```
/poui-specialist:connect DivergenciasCartaoComponent --module financeiro/divergencias-cartao

PROTHEUS: http://192.168.1.10:8086
ENDPOINT: GET /rest/api/custom/v1/financeiro/divergencias  (já existe)
AUTH: Basic — usuário/senha no proxy
MOCK A REMOVER: src/app/core/interceptors/mock-divergencias.interceptor.ts
```
