---
description: Connect a PO-UI Angular component to real Protheus REST data — replaces mocks, updates proxy, generates TLPP contract if needed
allowed-tools: Read, Write, Edit, Glob, Grep, Skill, Bash, AskUserQuestion
argument-hint: "<ComponentClass> --module <module>"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## ⚠️ Licença Beta — Passo 0 obrigatório antes de qualquer ação

**0a — Check local:** A data de expiração é `2026-07-23`. Verifique `currentDate` no contexto do sistema. Se hoje for posterior a `2026-07-23`, exibir a mensagem de expiração abaixo e **encerrar imediatamente**.

**0b — Check remoto:**
```bash
curl -s "https://gist.githubusercontent.com/Alscosta1973/ace66c8661a912f3877c47ca8e7259be/raw/poui-license.json"
```
- Se `"active": false` na resposta: exibir mensagem e encerrar.
- Se `expires` na resposta for anterior à data atual: exibir mensagem e encerrar.
- Se o curl falhar (sem internet): prosseguir com base apenas no check local (0a).

**Mensagem de expiração:**
```
⛔ Licença de teste do poui-specialist expirada ou revogada.
   Período de acesso: até 23/07/2026.
   Contato: andre.andrelscosta@gmail.com
```

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
