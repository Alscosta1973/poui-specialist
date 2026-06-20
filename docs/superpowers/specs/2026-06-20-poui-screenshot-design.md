# poui-screenshot — Screenshot-to-Code

**Date:** 2026-06-20
**Status:** Aprovado
**Scope:** Nova skill `/poui-specialist:screenshot` que recebe uma imagem (screenshot ou wireframe) via path local ou URL, analisa com visão multimodal, infere tipo de componente PO-UI, campos e ações, gera manifesto pré-preenchido e pergunta se deseja gerar agora.

---

## Contexto e Motivação

O fluxo atual exige que o usuário escreva o manifesto manualmente ou use `/discover` (que requer um endpoint de API ativo). Para wireframes, protótipos em Figma, prints de sistemas legados ou rascunhos em papel, não há nenhuma skill que converta visual → código. A skill `poui-screenshot` preenche essa lacuna usando a capacidade multimodal nativa do Claude.

---

## Ativação

```
/poui-specialist:screenshot <caminho-ou-url>
```

**Exemplos:**
```
/poui-specialist:screenshot C:\prints\tela-titulos.png
/poui-specialist:screenshot https://company.sharepoint.com/tela-parceiros.png
```

`<caminho-ou-url>` aceita:
- Path local absoluto ou relativo (lido via Read)
- URL HTTP/HTTPS (lida via fetch/WebFetch)

---

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `skills/poui-screenshot/SKILL.md` |
| Modificar | `commands/generate.md` — mencionar `/screenshot` como alternativa ao `/discover` |
| Sync | `sync-to-cache.ps1` após qualquer alteração |

---

## Fluxo Completo

### Passo 1 — Ler a imagem

Determinar se o argumento é path local ou URL:

- **Path local** (começa com letra de drive, `/`, `./` ou `.\`): ler com a ferramenta Read
- **URL** (começa com `http://` ou `https://`): ler com WebFetch ou ferramenta de fetch de URL

Se não conseguir acessar a imagem, exibir e encerrar:

```
❌ Não foi possível acessar a imagem: <caminho-ou-url>
   Verifique se o arquivo existe e está acessível.
```

### Passo 2 — Analisar com visão multimodal

Analisar a imagem e inferir:

**Tipo de componente** — usar a tabela de inferência:

| O que a imagem mostra | Tipo inferido |
|---|---|
| Tabela/grid com busca simples no topo | `page-list` |
| Tabela com filtros avançados (datas, selects, múltiplos campos) | `page-dynamic-search` |
| Formulário em página inteira (muitos campos, botão Salvar na página) | `page-edit` |
| Formulário em janela/modal sobreposta à tabela | `modal-crud` |
| Formulário em etapas com abas ou numeração (Passo 1, Passo 2…) | `stepper-form` |
| Duas tabelas empilhadas horizontalmente | `stacked-browse` |
| Duas tabelas lado a lado para conciliação/matching | `two-panel-browse` |
| Cards com números/KPIs e gráficos | `dashboard` |
| Tela de detalhe somente leitura (sem botão Salvar) | `page-detail` |
| Tipo não reconhecível | `page-list` (fallback — indicar no laudo) |

**Campos visíveis:**
- Nome: inferido do label visível (ex: "Cód. Fornecedor" → `codFor`, "Nome Cliente" → `nomCli`)
- Obrigatoriedade: campo com `*` ou label em vermelho/negrito → marcar como `(req)`
- Tipos especiais:
  - Campo com ícone de calendário ou formato `DD/MM/YYYY` → REGRA: `usar po-datepicker`
  - Campo com símbolo `R$` ou formato monetário → REGRA: `formatar como moeda BRL`
  - Select/combo com opções visíveis → REGRA: `<campo>: <opções visíveis>`

**Módulo sugerido:**
- Inferido do título da página, breadcrumb ou texto visível (ex: "Financeiro > Títulos" → `financeiro/titulos`)
- Se não encontrado → placeholder `<modulo>`

**Ações customizadas:**
- Botões padrão ("Novo", "Salvar", "Cancelar", "Excluir") → não listar em REGRAS (incluídos automaticamente pelo template)
- Botões customizados visíveis → listar em REGRAS como `Ação customizada: "<nome>" na tabela/formulário`

### Passo 3 — Exibir laudo e manifesto

Exibir análise e manifesto pré-preenchido:

```
## Análise da imagem

Tipo detectado: <tipo>
Módulo inferido: <modulo>

Campos identificados:
- <campo1> [(obrigatório — label com *)]
- <campo2>
- <campo3> → REGRA: <inferência>

Ações customizadas detectadas:
- "<nome-botão>" → REGRA: ação customizada no <tabela/formulário>

[Se tipo foi fallback:]
⚠ Tipo de tela não reconhecido com certeza — usando page-list como padrão. Ajuste o tipo no manifesto se necessário.

---

Manifesto gerado:

MODULO: <modulo>
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/<modulo>

COMPONENTES:
| tipo   | classe              | endpoint    | campos                  |
|--------|---------------------|-------------|-------------------------|
| <tipo> | <Entidade>Component | /<entidade> | <campos inferidos>      |
| service| <Entidade>Service   | /<entidade> | -                       |

REGRAS:
- <regra1>
- <regra2>

---
Ajuste o manifesto se necessário, então confirme.
Deseja gerar os componentes agora? [S/n]
```

**Inferência do nome da classe e endpoint:**
- Classe: PascalCase do nome da entidade detectada + sufixo do tipo (ex: `TitulosListComponent`)
- Endpoint: kebab-case do nome da entidade com `/` inicial (ex: `/titulos`)
- Se não detectado: usar `<Entidade>` e `/<entidade>` como placeholder

### Passo 4 — Confirmar e gerar

- **S** (ou Enter): despachar `/poui-specialist:generate-batch` com o manifesto exato exibido no Passo 3
- **n**: encerrar. O manifesto permanece visível para o usuário copiar manualmente

---

## Restrições

- **Nunca modificar** arquivos do projeto — a skill é de análise e geração de manifesto
- **Não assume endpoint de API** — usa `/rest/api/custom/v1` como padrão; o usuário ajusta no manifesto
- **Service sempre incluído** — todo manifesto gera pelo menos 1 componente + 1 service
- **Fallback explícito** — se o tipo não for reconhecível, usa `page-list` e avisa no laudo
- **Imagem ilegível** — tenta inferir o máximo possível; avisa sobre baixa qualidade mas não encerra

---

## Checklist de Validação

- [ ] Aceita path local (absoluto e relativo)
- [ ] Aceita URL HTTP/HTTPS
- [ ] Erro claro se imagem inacessível
- [ ] Tabela de inferência de tipo com 9 entradas + fallback
- [ ] Campos inferidos com nome em camelCase, `(req)` quando obrigatório
- [ ] Tipos especiais geram REGRAS (datepicker, moeda, select)
- [ ] Módulo inferido de texto visível na imagem
- [ ] Botões padrão não geram REGRAS; botões customizados sim
- [ ] Manifesto sempre inclui service
- [ ] Laudo exibido antes do manifesto
- [ ] Pergunta `[S/n]` antes de gerar
- [ ] Se S: despacha generate-batch com manifesto
- [ ] Se n: encerra sem gerar
- [ ] Fallback para tipo não reconhecido com aviso
