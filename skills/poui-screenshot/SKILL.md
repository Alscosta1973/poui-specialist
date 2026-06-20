---
name: poui-screenshot
description: Analyzes a screenshot or wireframe image (local path or URL) and generates a PO-UI Angular component manifest using multimodal vision — infers component type, fields, actions and module, then asks whether to generate immediately | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
---

# PO-UI Screenshot — Visual para Código

Analisa uma imagem de tela (screenshot, wireframe ou print) e gera automaticamente o manifesto de componentes PO-UI, usando visão multimodal para inferir tipo, campos e ações.

## Uso

```
/poui-specialist:screenshot <caminho-ou-url>
```

**Exemplos:**
```
/poui-specialist:screenshot C:\prints\tela-titulos.png
/poui-specialist:screenshot https://company.sharepoint.com/tela-parceiros.png
/poui-specialist:screenshot ./wireframes/cadastro.jpg
```

---

## Passo 1 — Ler a imagem

Determinar o tipo de entrada pelo argumento fornecido:

- **URL** (começa com `http://` ou `https://`): ler a imagem via ferramenta de fetch de URL (WebFetch ou navegador)
- **Path local** (qualquer outro valor): ler a imagem via ferramenta Read

Se não conseguir acessar a imagem, exibir e encerrar:

```
❌ Não foi possível acessar a imagem: <caminho-ou-url>
   Verifique se o arquivo existe e está acessível.
```

---

## Passo 2 — Analisar com visão multimodal

Analisar o conteúdo visual da imagem e inferir:

### Tipo de componente

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
| Tipo não reconhecível | `page-list` (fallback — indicar aviso no laudo) |

### Campos visíveis

Para cada campo/label identificado na imagem:
- **Nome**: converter label visível para camelCase (ex: "Cód. Fornecedor" → `codFor`, "Nome Cliente" → `nomCli`)
- **Obrigatoriedade**: campo com `*` ou label em vermelho/negrito → marcar como `(req)`
- **Tipos especiais**:
  - Campo com ícone de calendário ou formato `DD/MM/YYYY` → adicionar REGRA: `<campo>: usar po-datepicker`
  - Campo com símbolo `R$` ou formato monetário → adicionar REGRA: `<campo>: formatar como moeda BRL`
  - Select/combo com opções visíveis → adicionar REGRA: `<campo>: <opções visíveis>`

### Módulo sugerido

Inferir de título da página, breadcrumb ou texto visível na imagem:
- Exemplo: "Financeiro > Títulos" → `financeiro/titulos`
- Se não encontrado: usar `<modulo>` como placeholder

### Ações customizadas

- Botões padrão ("Novo", "Salvar", "Cancelar", "Excluir") → não listar em REGRAS (incluídos automaticamente pelo template)
- Botões customizados visíveis → adicionar REGRA: `Ação customizada: "<nome>" no <tabela/formulário>`

### Nome da classe e endpoint

- Classe: entidade em PascalCase + sufixo do tipo (ex: `TitulosListComponent` para `page-list`)
- Endpoint: entidade em kebab-case com `/` inicial (ex: `/titulos`)
- Se não detectado: usar `<Entidade>Component` e `/<entidade>` como placeholder

---

## Passo 3 — Exibir laudo e manifesto

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

[Incluir se tipo foi fallback:]
⚠ Tipo de tela não reconhecido com certeza — usando page-list como padrão. Ajuste o tipo no manifesto se necessário.

[Incluir se imagem tem baixa qualidade:]
⚠ Imagem com baixa resolução — algumas inferências podem ser imprecisas. Revise o manifesto antes de gerar.

---

Manifesto gerado:

MODULO: <modulo>
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/<modulo>

COMPONENTES:
| tipo    | classe              | endpoint    | campos                              |
|---------|---------------------|-------------|-------------------------------------|
| <tipo>  | <Entidade>Component | /<entidade> | <campos com (req) onde aplicável>   |
| service | <Entidade>Service   | /<entidade> | -                                   |

REGRAS:
- <regra1>
- <regra2>

---
Ajuste o manifesto se necessário, então confirme.
Deseja gerar os componentes agora? [S/n]
```

Se não houver REGRAS inferidas, omitir a seção `REGRAS:` do manifesto.

---

## Passo 4 — Confirmar e gerar

- **S** (ou Enter): despachar `/poui-specialist:generate-batch` com o manifesto exato exibido no Passo 3
- **n**: encerrar. O manifesto permanece visível para o usuário copiar manualmente se desejar

---

## Restrições

- **Nunca modificar** arquivos do projeto — a skill é somente de análise e geração de manifesto
- **Service sempre incluído** — todo manifesto gerado inclui pelo menos 1 componente principal + 1 service
- **API_BASE padrão** — usar `/rest/api/custom/v1`; o usuário ajusta no manifesto se necessário
- **Fallback explícito** — se o tipo não for reconhecível, usar `page-list` e avisar no laudo
- **Imagem ilegível** — tentar inferir o máximo possível; avisar sobre baixa qualidade mas não encerrar
