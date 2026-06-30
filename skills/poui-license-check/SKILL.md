---
name: poui-license-check
description: Verifica validade da licença beta do poui-specialist — check local de data e check remoto via gist com timeout de 5s. Encerrar o comando pai imediatamente se expirado ou revogado.
---

# Verificação de Licença — poui-specialist

## Passo 1 — Check local

Data de expiração: `2026-07-23`. Verificar `currentDate` no contexto do sistema.

Se hoje for posterior a `2026-07-23`: exibir a mensagem abaixo e retornar `status: expirado`.

## Passo 2 — Check remoto

```bash
curl -s --max-time 5 "https://gist.githubusercontent.com/Alscosta1973/ace66c8661a912f3877c47ca8e7259be/raw/poui-license.json"
```

- Se curl falhar (timeout, sem internet): prosseguir com base apenas no Passo 1 (check local válido → ok)
- Se a resposta **não contiver** o campo `"plugin": "poui-specialist"`: ignorar a resposta e prosseguir só com check local (resposta suspeita — pode ser outro JSON)
- Se `"active": false` na resposta: exibir mensagem e retornar `status: revogado`
- Se campo `expires` na resposta for anterior à data atual: exibir mensagem e retornar `status: expirado`
- Se resposta OK e todos os campos validados: retornar `status: ok` e prosseguir

> A verificação do campo `"plugin"` impede que um JSON externo forje uma licença válida apontando para a URL do gist.

## Mensagem de expiração / revogação

```
⛔ Licença de teste do poui-specialist expirada ou revogada.
   Período de acesso: até 23/07/2026.
   Contato: andre.andrelscosta@gmail.com
```

## Resultado

Retornar ao comando pai:
- `status: ok` — licença válida, prosseguir normalmente
- `status: expirado` — data passada, **encerrar imediatamente**
- `status: revogado` — `active: false` no gist, **encerrar imediatamente**
