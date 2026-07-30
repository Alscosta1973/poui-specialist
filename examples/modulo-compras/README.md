# Exemplo — Módulo de Compras

Projeto de exemplo gerado com o `poui-specialist`, usado durante o desenvolvimento do plugin
para validar o `/generate` ponta a ponta: frontend Angular + PO-UI e backend TLPP consumidos
juntos, num módulo fictício de Compras.

## O que tem aqui

- **`src/app/auth/login`** — tela de login (`page-login`)
- **`src/app/home`** — página inicial
- **`src/app/compras/`** — módulo de Compras:
  - `painel-compras` — dashboard
  - `pedido-compra` / `pedido-compra-detalhe` — lista + detalhe de pedidos
  - `aprovacao-pedido` — fluxo de aprovação
  - `solicitacao-compra` — solicitações
  - `produto` — cadastro de produtos
- **`backend/`** — endpoints TLPP (`fornecedores.tlpp`, `pedidos.tlpp`, `produtos.tlpp`, `solicitacoes.tlpp`) que o frontend consome via REST
- **`login-preview.png`** — screenshot da tela de login gerada

## Uso

Serve como material de regressão manual: ao alterar templates/patterns do plugin, regerar os
mesmos tipos de componente contra este backend e comparar a saída com o que já está aqui.

```bash
npm install
npm start
```

> Este projeto não é publicado como parte do pacote do plugin — vive só no repositório fonte,
> como referência para quem desenvolve o `poui-specialist`.
