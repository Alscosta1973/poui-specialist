---
name: poui-preview
description: Use after generating any PO-UI component to open it live in the browser — registers the route, starts the Angular dev server on a free port (4200-4209), and shows a Playwright screenshot | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
---

# PO-UI Preview — Live Browser

Abre o componente recém-gerado no browser real, com dev server Angular e screenshot via Playwright.

## Contexto necessário

Você precisa ter em mãos (vindos do `/poui-specialist:generate`):

| Variável | Exemplo |
|---|---|
| `<module>` | `financeiro` |
| `<kebab-name>` | `conciliacao-cartao` |
| `<ComponentClass>` | `ConciliacaoCartaoComponent` |
| `<componentFile>` | `conciliacao-cartao.component` |

A rota de preview será: `/<module>/<kebab-name>`

---

## Passo 1 — Localizar a raiz do projeto Angular

Buscar `angular.json` a partir do diretório de trabalho atual, subindo níveis se necessário.

```powershell
# Exemplo de busca
Get-ChildItem -Path . -Filter angular.json -Recurse -Depth 3 | Select-Object -First 1 FullName
```

Se `angular.json` não for encontrado: exibir erro e abortar.

```
ERRO: Nenhum projeto Angular encontrado no diretório atual.
Certifique-se de estar dentro de um projeto Angular antes de usar o preview.
```

---

## Passo 2 — Verificar e registrar a rota em app.routes.ts

Ler `<raiz>/src/app/app.routes.ts`.

Verificar se já existe uma entrada com `path: '<module>/<kebab-name>'`.

**Se a rota já existir:** pular para o Passo 3.

**Se a rota não existir:** inserir antes do fechamento do array `routes`:

```typescript
  {
    path: '<module>/<kebab-name>',
    loadComponent: () =>
      import('./<module>/<kebab-name>/<componentFile>')
        .then(m => m.<ComponentClass>),
  },
```

> Inserir antes do `];` final. Nunca duplicar rotas existentes.

---

## Passo 3 — Detectar porta livre

Testar as portas 4200 a 4209 em ordem usando PowerShell:

```powershell
$portaLivre = $null
for ($p = 4200; $p -le 4209; $p++) {
    $ocupada = netstat -ano | Select-String ":$p " | Where-Object { $_ -match "LISTENING" }
    if (-not $ocupada) {
        $portaLivre = $p
        break
    }
}
```

**Cenários:**

| Situação | Ação |
|---|---|
| Porta 4200 livre | Usar 4200, sem aviso |
| 4200 ocupada, outra livre (ex: 4202) | Avisar: "⚠ Porta 4200 em uso. Usando a porta 4202 para não interferir em outros projetos." |
| Todas 4200–4209 ocupadas | Exibir mensagem de erro e abortar (ver abaixo) |

**Mensagem quando todas as portas estão ocupadas:**

```
❌ Portas 4200-4209 estão todas em uso.

Para continuar, encerre um dos servidores em execução ou abra
manualmente em outra porta:

  ng serve --port 4210

Após subir, acesse: http://localhost:4210/<module>/<kebab-name>
```

---

## Passo 4 — Iniciar o dev server Angular

Iniciar em background na porta encontrada:

```powershell
Start-Process -NoNewWindow -FilePath "cmd" -ArgumentList "/c ng serve --port <portaLivre>"
```

Ou via npm start se o projeto usar `npm start` com proxy:

```powershell
# Verificar se package.json tem "start" com --proxy-config
# Se sim: Start-Process cmd "/c npm start -- --port <portaLivre>"
# Se não: Start-Process cmd "/c ng serve --port <portaLivre>"
```

**Aguardar compilação:**

Monitorar o processo por até **120 segundos**, verificando a cada 3s se o servidor já responde:

```powershell
$timeout = 120
$elapsed = 0
do {
    Start-Sleep -Seconds 3
    $elapsed += 3
    $ok = Test-NetConnection -ComputerName localhost -Port <portaLivre> -WarningAction SilentlyContinue
} while (-not $ok.TcpTestSucceeded -and $elapsed -lt $timeout)
```

Se timeout estourar sem o servidor responder:

```
❌ O servidor Angular não respondeu em 120 segundos.
Verifique se há erros de compilação no terminal e tente novamente.
```

---

## Passo 5 — Abrir no browser com Playwright

Aguardar 2 segundos extras após o servidor responder (PO-UI precisa do tempo de hidratação):

```
browser_navigate: http://localhost:<portaLivre>/<module>/<kebab-name>
```

Aguardar 2000ms e capturar:

```
browser_take_screenshot
```

Exibir o screenshot na conversa.

---

## Passo 6 — Informar ao usuário

Após o screenshot, exibir:

```
✅ Preview disponível em: http://localhost:<portaLivre>/<module>/<kebab-name>

O servidor Angular está rodando na porta <portaLivre>.
Para encerrar, feche o terminal ou pressione Ctrl+C no processo do Angular.
```

Se a API do Protheus (`/rest`) não estiver disponível, o componente exibirá
estado vazio ou erro de requisição — comportamento real de produção.

---

## Resumo do fluxo

```
Localizar angular.json
      ↓
Verificar/registrar rota em app.routes.ts
      ↓
Detectar porta livre (4200-4209)
  ├─ Todas ocupadas → abortar com instrução manual
  └─ Porta encontrada (≠4200 → avisar)
      ↓
ng serve --port <porta> (background)
      ↓
Aguardar servidor responder (timeout 120s)
      ↓
browser_navigate → localhost:<porta>/<module>/<kebab-name>
      ↓
browser_take_screenshot → exibir
      ↓
Informar URL ao usuário
```
