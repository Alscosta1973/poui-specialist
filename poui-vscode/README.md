# PO-UI Specialist — extensão VS Code

Gera componentes Angular PO-UI integrados ao Protheus REST diretamente no
VS Code — 24 tipos, agrupados em 3 famílias: **Lista/Browse**,
**Formulários** e **Infraestrutura**. A maioria dos comandos roda o
Claude Code CLI (`claude`) como subprocesso, reaproveitando a sua sessão
já autenticada no claude.ai — sem precisar de API key separada.

## Requisitos

- VS Code
- [Claude Code CLI](https://code.claude.com) instalado e logado na sua
  conta (`claude --version` funcionando) — necessário para os comandos
  de geração/revisão; alguns comandos (ver tabela abaixo) não precisam
  dele
- Uma licença PO-UI Specialist ativa (trial, beta ou paga)

## Instalação

1. Instale o `.vsix`: no VS Code, `Ctrl+Shift+P` → `Extensions: Install
   from VSIX...` e selecione o arquivo (ou pelo terminal,
   `code --install-extension poui-vscode-<versão>.vsix`)
2. Rode `PO-UI: Ativar Licença` na paleta de comandos e informe sua
   chave (`POUI-XXXX-XXXX-XXXX`). Sem chave ainda? A mesma tela tem a
   opção "Quero comprar uma licença"
3. Abra uma pasta de projeto Angular como workspace e comece a usar os
   comandos `PO-UI: ...` pela paleta (`Ctrl+Shift+P`) — ou rode
   `PO-UI: Menu` para ver os comandos mais usados num só lugar

## O que você pode gerar

24 tipos via `PO-UI: Gerar Componente`, agrupados por família no
seletor:

- **Lista/Browse**: `page-list`, `page-dynamic-search`,
  `stacked-browse`, `two-panel-browse`, `action-list`, `master-detail`,
  `page-dynamic`, `infinite-scroll`, `po-tree`
- **Formulários**: `page-edit`, `page-detail`, `modal-crud`,
  `stepper-form`
- **Infraestrutura**: `service`, `dashboard`, `tlpp-contract`,
  `auth-login`, `module`, `models`, `refactor`, `http-interceptor`,
  `route-guard`, `standalone-migrate`, `upload`

`module` não pede módulo nem arquivo — usa o próprio nome como módulo
(scaffold de app inteiro). `refactor` abre um diálogo de arquivo para
escolher o `.prw`/`.tlpp` de origem antes de gerar. `auth-login` sempre
vai em `src/app/auth/`, sem perguntar módulo.

Toda geração é seguida automaticamente por uma verificação de build
(`ng build --configuration development`): se falhar em erros dos
arquivos recém-gerados, a extensão tenta corrigir sozinha (até 3
tentativas); erros pré-existentes no projeto nunca são "corrigidos"
automaticamente, só reportados.

## Comandos disponíveis

| Comando | O que faz |
|---|---|
| `PO-UI: Menu` | Atalho com os comandos mais usados, num só seletor |
| `PO-UI: Gerar Componente` | Gera um dos 24 tipos acima, a partir do nome da entidade, módulo e endpoint |
| `PO-UI: Gerar Teste Unitário` | Gera um spec Karma + Jasmine para um `.component.ts`/`.service.ts` já existente; se o projeto não tiver Karma configurado, oferece configurar tudo com um clique |
| `PO-UI: Lint de Componentes` | Analisa uma pasta (14 verificações conhecidas de PO-UI/Angular) e corrige 7 delas automaticamente se você confirmar — **não usa o Claude Code CLI** |
| `PO-UI: Auditoria de Qualidade` | Varre `src/app` procurando componentes gerados pela extensão e classifica cada um em Aprovado/Atenção/Crítico — só leitura, **não usa o CLI** |
| `PO-UI: Revisar Código` | Revisa um arquivo ou pasta (boas práticas, performance, acessibilidade, segurança, quirks PO-UI ou qualidade) e reporta os achados — nunca altera código |
| `PO-UI: Preview no Browser` | Registra a rota do componente, sobe um `ng serve` numa porta livre (4200-4209) e abre no seu navegador — **não usa o CLI** |
| `PO-UI: Gerar Teste E2E (Playwright)` | Gera um spec Playwright real para um componente (rode `Preview no Browser` nele antes, pra rota existir); oferece configurar o Playwright se o projeto não tiver |
| `PO-UI: Reverter Componente Gerado` | Lista componentes gerados pela extensão e remove os arquivos escolhidos + a rota correspondente, com confirmação |
| `PO-UI: Gerar a partir de Screenshot` | Analisa uma imagem local (wireframe/print) e monta um manifesto de geração, pedindo sua confirmação antes de gerar |
| `PO-UI: Empacotar Projeto (.app)` | Builda em produção e empacota o projeto como `Resource/<projeto>.app`, pronto para publicar no Protheus |
| `PO-UI: Conectar ao Protheus` | Troca os mocks de um componente por chamadas reais ao endpoint Protheus configurado, ajustando o proxy e (se necessário) gerando o contrato TLPP |
| `PO-UI: Criar Novo Projeto (Scaffold)` | Cria um projeto Angular + PO-UI novo do zero (`ng new`, tema, componente inicial, proxy) |
| `PO-UI: Consultar Documentação de Componente` | Consulta a referência de um componente PO-UI (inputs, outputs, exemplos de uso) |
| `PO-UI: Configurar Motor de IA` | Escolhe qual CLI a extensão usa (`claude`/`codex`/`gemini` — Codex e Gemini ainda experimentais) |
| `PO-UI: Ativar Licença` | Ativa uma chave de licença existente, ou abre o fluxo de compra |

## Licença

A extensão exige uma licença ativa para os comandos de geração. Rode
`PO-UI: Ativar Licença` a qualquer momento pela paleta de comandos para
ativar uma chave (trial, beta ou paga) ou iniciar a compra.
