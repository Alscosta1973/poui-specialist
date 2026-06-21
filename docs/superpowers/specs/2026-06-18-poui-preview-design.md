# Design Spec — poui-specialist:preview

**Data:** 2026-06-18
**Status:** Aprovado

## Problema

Após `/poui-specialist:generate`, o desenvolvedor não tem forma automática de ver a tela gerada renderizada no browser. É preciso manualmente: registrar rota, subir servidor, abrir URL. Essa fricção desacelera o ciclo de feedback.

## Solução

Skill `poui-preview` integrada ao fluxo do `generate.md`. Ao final de qualquer geração, a skill pergunta se o usuário quer ver a tela no browser. Se sim, faz todo o setup automaticamente e exibe um screenshot via Playwright.

## Arquivos

| Arquivo | Ação |
|---|---|
| `skills/poui-preview/SKILL.md` | Criado |
| `commands/generate.md` | Modificado — Passo 4 adicionado |

## Fluxo de integração no generate.md

Após o Passo 3 (confirmar output), adicionar Passo 4:

```
Passo 4 — Preview no browser
  Perguntar: "Deseja visualizar a tela no browser? [S/n]"
  Se sim → invocar poui-specialist:poui-preview (route_path, module, kebab_name)
  Se não → encerrar
```

## Lógica da skill poui-preview

```
1. Localizar raiz do projeto Angular (buscar angular.json subindo diretórios)
2. Verificar rota em app.routes.ts → inserir lazy route se ausente
3. Detectar porta livre: testar 4200..4209 via netstat
   - Porta livre != 4200 → avisar usuário
   - Nenhuma livre (4200-4209) → abortar com instrução manual
4. Iniciar ng serve --port <porta> em background
   - Monitorar até "Compiled successfully" ou timeout 120s
   - Erro de compilação → exibir e abortar
5. Playwright: browser_navigate → http://localhost:<porta>/<module>/<kebab-name>
   - Aguardar 2s para render do PO-UI
   - browser_take_screenshot → exibir na conversa
6. Informar URL e porta ao usuário
```

## Detecção de conflito de porta

```
Para cada porta em [4200..4209]:
  netstat -ano | findstr :<porta>
  Primeira sem resultado → porta livre
Se nenhuma livre:
  Exibir: "Portas 4200-4209 em uso. Encerre um servidor ou rode:
           ng serve --port 4210"
```

## Decisões

- **Sem mock data**: se a API não estiver disponível, o componente exibe estado vazio — comportamento real de produção.
- **Porta persistida na conversa**: a porta usada é informada ao usuário para que ele possa abrir manualmente se quiser.
- **Rota não duplicada**: a skill verifica `app.routes.ts` antes de inserir, evitando rotas duplicadas.
- **Timeout 120s**: se o Angular não compilar em 2 minutos, algo está errado — abortar é mais seguro que esperar indefinidamente.
