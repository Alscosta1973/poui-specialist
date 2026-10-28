---
name: poui-patterns
description: Use when generating Angular module structure or Protheus REST integration patterns — standalone components, lazy routing, app.config, Protheus response contract, pagination, and error handling | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
metadata:
  domain: PO-UI / Angular / Protheus
  author: Andre Costa
  version: '1.12.1'
  category: Documentation
---

# PO-UI Patterns

## Contents

- **Padrão visual TOTVS (OBRIGATÓRIO)** (fonte/tamanhos do tema, shell com logo + versão + usuário, menu recolhido, tabela com legenda nativa, cores por token): see `padrao-totvs.md`
- **Angular 17–21+ module structure** (standalone, lazy routing, app.config): see `module-structure.md`
- **Protheus REST integration** (response contract, pagination, error handling): see `protheus-rest.md`
- **Reactive Forms with PO-UI** (FormGroup, FormBuilder, cross-field validation, FormArray): see `reactive-forms.md`
- **PO-UI known quirks and fixes** (po-page-content opacity, po-input 8px offset, po-table horizontal scroll, dynamic table height): see `po-ui-quirks.md`
- **Deploy no Protheus** (build `ng build`, pasta `.app`, rdmake com `FWCallApp`, `appserver.ini`): see `deploy-protheus.md`
- **PO-UI próprio × SmartX (12.1.2610+)** (quando usar cada um, o que o SmartX 2610 não faz e o tipo do plugin que cobre, regras de backend sem estado, aviso no /generate): see `smartx.md`
- **Campos padrão Protheus por tabela** (SA1, SA2, SB1, SC5, SC6, SE1, SE2 — tamanho/decimal/obrigatoriedade, usado pelo `/discover`): see `protheus-standard-fields.md`
