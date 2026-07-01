# Quick Start — poui-specialist

Gere seu primeiro componente PO-UI para Protheus em menos de 5 minutos.

---

## Pré-requisitos

- Claude Code instalado
- Plugin instalado: `/plugin install poui-specialist@Alscosta1973-poui-specialist`
- Node.js 18+ e Angular CLI: `npm install -g @angular/cli`

---

## Passo 1 — Criar o projeto Angular

```
/poui-specialist:scaffold meu-projeto --demo
```

Isso cria o projeto Angular 21 + PO-UI 21 do zero, configurado para Protheus.

> Com `--demo` é gerado um componente de boas-vindas com os próximos passos.

---

## Passo 2 — Gerar uma tela de listagem

```
/poui-specialist:generate page-list Pedidos --module compras
```

O plugin gera 3 arquivos prontos para usar:
- `pedidos-list.component.ts` — componente standalone, OnPush, signals
- `pedidos-list.component.html` — template com po-page-list + po-table
- `pedidos.service.ts` — service consumindo REST Protheus

---

## Passo 3 — Conectar ao endpoint Protheus

Edite `pedidos.service.ts` e ajuste a URL base:
```typescript
private readonly base = '/rest/api/custom/v1/pedidos'; // ← seu endpoint
```

O proxy já está configurado (Passo 1). Inicie o dev server:
```bash
npm start
# ou
ng serve --proxy-config proxy.conf.json
```

---

## Passo 4 — Revisar o código gerado

```
/poui-specialist:review src/app/compras/pedidos-list
```

O plugin analisa o componente gerado e reporta problemas de boas práticas, performance e PO-UI.

---

## Passo 5 — Gerar a tela de edição

```
/poui-specialist:generate page-edit Pedido --module compras
```

---

## Referência de tipos disponíveis

| Tipo | Uso |
|------|-----|
| `page-list` | Lista simples com busca rápida |
| `page-dynamic-search` | Lista com filtros avançados + disclaimers Protheus |
| `modal-crud` | Lista + modal add/edit (entidades simples, até 10 campos) |
| `page-edit` | Formulário complexo com muitos campos, navega por rota |
| `page-detail` | Detalhe somente-leitura com po-dynamic-view |
| `dashboard` | KPIs com po-widget + po-chart |
| `stacked-browse` | Dois browses empilhados (ex: SC5/SC6) |
| `action-list` | Lista com ações Protheus procedurais por linha |
| `service` | Apenas o Angular service REST |
| `module` | Scaffold completo de app (package.json, proxy, config) |

---

## Exemplo de referência completo (Angular + Protheus + TLPP)

Ver: `skills/poui-code-generation/templates-exemplo-e2e.md`

---

## Problemas comuns

Ver: `skills/poui-patterns/troubleshooting.md`
