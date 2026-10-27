# Quick Start — poui-specialist

Gere seu primeiro componente PO-UI para Protheus em menos de 5 minutos.

---

## Pré-requisitos

- Claude Code instalado
- Plugin instalado: `/plugin install poui-specialist@Alscosta1973-poui-specialist`
- Node.js 20.11+ e Angular CLI 21: `npm install -g @angular/cli@21`

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

Para usar dados reais com login, rode o connect — ele gera o `proxy.conf.js` (Authorization e
`tenantId` no proxy, `Origin` removido para as gravações não voltarem 401 no Protheus sem CORS):
```
/poui-specialist:connect src/app/compras/pedidos-list/pedidos-list.component.ts
```
Grave a senha (ou token) do usuário de desenvolvimento em `protheus-dev.secret` na raiz do projeto
(uma linha; já fica no `.gitignore`) e inicie o dev server:
```bash
npm start
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

## Passo 6 — Compilar e empacotar para o Protheus

Quando o projeto já passou pelos testes e revisões (Passos 2-5) e está pronto para publicar:

```
/poui-specialist:package
```

Builda em produção e gera `Resource/<projeto>.app` (7-Zip, pasta `<projeto>/` na raiz do zip),
pronto para compilar no RPO (ver `skills/poui-patterns/deploy-protheus.md`).

---

## Passo 7 — Validar dentro do Protheus

Com o `.app` compilado e a rotina (User Function com `FwCallApp`) no menu:

```
/poui-specialist:smoke-protheus
```

Abre a WebApp com Playwright, faz login (senha lida de arquivo), pesquisa a rotina no menu e relata
se o app abriu, as chamadas de API (status) e os erros de console do app, com screenshot.

Se a rotina ficar em **"Verificando atualizações..."** ou abrir uma versão antiga:

```
/poui-specialist:doctor --rootpath C:\TOTVS12\Protheus\protheus_data
```

Confere a estrutura do `.app` e o que o AppServer extraiu em `http-root/app-root` (itens soltos de
um pacote errado, pasta `<app>_env_*`, build desatualizado).

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
