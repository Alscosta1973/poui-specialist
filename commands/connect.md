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
