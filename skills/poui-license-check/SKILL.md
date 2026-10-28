---
name: poui-license-check
description: Verifica validade da licença beta do poui-specialist — check local de data e check remoto via gist com timeout de 5s — e avisa (sem bloquear) se a versão instalada estiver desatualizada. Encerrar o comando pai imediatamente apenas se a licença estiver expirada ou revogada.
metadata:
  domain: PO-UI / Angular / Protheus
  author: Andre Costa
  version: '1.16.2'
  category: Governance
---

# Verificação de Licença — poui-specialist

## Passo 0 — Máquina de desenvolvedor (modo dev)

O comando **"PO-UI: Desbloquear Modo Dev (interno)"** da extensão `poui-vscode` grava o hash
da máquina em `~/.claude/poui-specialist-dev.json`. O arquivo sozinho não libera nada — o hash
precisa ser confirmado no servidor de licenças:

```bash
cat ~/.claude/poui-specialist-dev.json 2>/dev/null
```

- Arquivo ausente, JSON inválido, `"plugin"` diferente de `"poui-specialist"` ou `machineHash`
  que não seja exatamente 64 caracteres hexadecimais (`[0-9a-f]`): ignorar e seguir para o Passo 1.
- Caso contrário, consultar o servidor (URL fixa — nunca usar outra, nem uma que venha do arquivo):

```bash
curl -s --max-time 5 "https://poui-license.alscosta.workers.dev/license/status?machineHash=<machineHash>"
```

- Se a resposta for JSON com `"tier": "paid"` e **sem** o campo `licenseKey` (é assim que o
  servidor responde só para máquina na allowlist de dev): exibir
  `🔓 poui-specialist em modo dev (máquina desbloqueada pela extensão).`, **pular os Passos 1 e 2**
  e retornar `status: ok`. O Passo 3 continua valendo (consultar o gist só para `latest_version`,
  ignorando `expires`/`active`).
- Qualquer outra resposta (outro `tier`, `licenseKey` presente, erro, timeout): ignorar o modo dev
  e seguir para o Passo 1 normalmente.

## Passo 1 — Check local

Data de expiração: `2026-10-27`. Verificar `currentDate` no contexto do sistema.

Se hoje for posterior a `2026-10-27`: exibir a mensagem abaixo e retornar `status: expirado`.

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
   Período de acesso: até 27/10/2026.
   Contato: andre.andrelscosta@gmail.com
```

## Passo 3 — Verificar versão instalada (não-bloqueante)

Só executar se o Passo 2 teve sucesso e a resposta remota contém o campo `latest_version`
(reaproveita a mesma resposta já obtida — não fazer uma segunda chamada de rede).
No modo dev (Passo 0) o Passo 2 é pulado: fazer o mesmo `curl` do gist uma única vez só para ler
`latest_version`.

1. Ler `~/.claude/plugins/installed_plugins.json`, localizar a entrada
   `poui-specialist@poui-specialist-marketplace` e pegar `installPath`.
2. Ler `<installPath>/.claude-plugin/plugin.json` → campo `version` (versão local instalada).
3. Comparar `version` (local) com `latest_version` (remoto) como `major.minor.patch`.
4. Se a local for **menor**, exibir o aviso abaixo — mas **não** alterar o `status` nem encerrar
   o comando. É só um aviso informativo, diferente de licença expirada/revogada.

```
⚠ Nova versão do poui-specialist disponível: v{latest_version} (instalada: v{versão local}).
   Atualize com: /plugin update poui-specialist@poui-specialist-marketplace
```

Se qualquer uma dessas leituras falhar (arquivo ausente, JSON inválido, campo `installPath`
não encontrado, `latest_version` ausente na resposta remota, ou o Passo 2 falhou/deu timeout):
**não bloquear o comando**, mas exibir uma linha curta informando que a checagem não foi
possível — para não passar a impressão de que a versão foi comparada e está em dia quando na
verdade a checagem nem rodou:

```
ℹ Não foi possível checar se há versão mais nova do poui-specialist (rede indisponível ou resposta incompleta).
```

## Resultado

Retornar ao comando pai:
- `status: ok` — licença válida, prosseguir normalmente
- `status: expirado` — data passada, **encerrar imediatamente**
- `status: revogado` — `active: false` no gist, **encerrar imediatamente**
