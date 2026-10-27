---
description: Apply the client logo to a PO-UI app (customização) — extracts the images from a .docx (or uses image files), removes the background, derives the symbol and wires the expanded menu, collapsed menu and toolbar avatar; without a client logo the app keeps the TOTVS logo
allowed-tools: Read, Write, Glob, Grep, Bash, PowerShell, AskUserQuestion, Skill
argument-hint: "[project-path] [arquivo.docx|imagem.png ...]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:logo

Padrão visual TOTVS (`skills/poui-patterns/padrao-totvs.md`): em **customização** o app usa o logo do
**cliente**, com o mesmo efeito do logo TOTVS. Sem logo do cliente, fica o **TOTVS** (padrão).

| Onde | Imagem |
|---|---|
| Menu aberto (`p-logo`) | logo com o nome do cliente |
| Menu recolhido (`p-short-logo`) | só o símbolo |
| Avatar da barra (`AVATAR_*` no `app.ts`) | o mesmo símbolo |

## Exemplos

```bash
/poui-specialist:logo                                   # pergunta o arquivo
/poui-specialist:logo . C:\clientes\FFM\Padrao.docx     # logo dentro de um documento Word
/poui-specialist:logo C:\proj\app logo-nome.png simbolo.png
```

## Passo 1 — Projeto e arquivo

1. Projeto = `[project-path]` ou a pasta atual; precisa ter `src/app/app.html` (shell). Se não tiver, encerrar.
2. Se nenhum arquivo foi informado, perguntar (AskUserQuestion / texto): **"É customização para um
   cliente? Se sim, me passe o documento (.docx) ou as imagens do logo."** Resposta "não" ou sem
   logo → informar que fica o logo TOTVS e encerrar.
3. Script: `client-logo.cjs` desta skill — Glob em
   `~/.claude/plugins/**/poui-specialist/**/skills/poui-logo/client-logo.cjs` (versão mais alta).

## Passo 2 — Listar as imagens

```powershell
node "<script>" list "<arquivo.docx ou imagens>" --out "<pasta temporária>"
```

Saída JSON: `[{ file, width, height, role }]` com `role` = `nome` (largo), `simbolo` (quase quadrado)
ou `tela` (print). **Mostrar as imagens candidatas ao usuário** (Read de cada `file` que não seja
`tela`) e confirmar qual é o **logo com nome** e se há um **símbolo** separado. Não adivinhar quando
houver mais de um candidato; nunca inventar um logo.

## Passo 3 — Aplicar

Perguntar o nome do cliente (ex.: `FFM`) se não estiver claro, e rodar:

```powershell
node "<script>" apply "<projeto>" --cliente "<Nome>" --nome "<png do logo com nome>" [--simbolo "<png do símbolo>"]
```

O script:
- remove o fundo opaco e uniforme (logo colado no Word) e corta as bordas;
- sem `--simbolo`, gera o símbolo a partir do logo com nome: a forma da esquerda, sem o texto, mesmo
  que o texto fique embaixo de uma "asa" do símbolo;
- grava `public/assets/logos/<cliente>-nome.png` e `<cliente>.png`;
- ajusta o `po-menu` do `app.html` (`p-logo`, `p-short-logo`, `p-logo-alt`) e a constante `AVATAR_*`
  do `app.ts`.

Mostrar ao usuário os dois PNGs gerados (Read) e as `notes` do JSON. Se o símbolo gerado não ficar bom,
pedir um símbolo separado e rodar de novo com `--simbolo`.

## Passo 4 — Relatório

```
🎨 Logo do cliente — <Nome>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ public/assets/logos/<cliente>-nome.png   (menu aberto)
✓ public/assets/logos/<cliente>.png        (menu recolhido e avatar)
✓ app.html / app.ts atualizados
ℹ fundo removido · símbolo gerado a partir do logo com nome
Próximo passo: /poui-specialist:package e compilar o .app no RPO.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Notas para o agente

- PNG 8 bits (RGB/RGBA/cinza/paleta) é tratado; JPG/SVG/GIF são copiados sem tratamento (avisar
  que o fundo não foi removido).
- O lint **H09** aceita qualquer `p-logo` (TOTVS ou do cliente).
