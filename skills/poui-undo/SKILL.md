---
name: poui-undo
description: Reverte componentes gerados pelo poui-specialist — localiza arquivos @generated, remove-os e desfaz a rota em app.routes.ts após confirmação do usuário
---

# PO-UI Undo — Reversão de Geração

Remove componentes gerados pelo plugin, desfazendo tanto os arquivos quanto a entrada em `app.routes.ts`.

## Passo 1 — Localizar raiz do projeto Angular

Buscar `angular.json` subindo até 3 níveis a partir do diretório atual.
Se não encontrado: exibir `⚠ Nenhum projeto Angular encontrado.` e encerrar.

---

## Passo 2 — Descobrir componentes gerados

Buscar recursivamente em `src/app/` por arquivos `.ts` contendo `@generated  poui-specialist`:

```powershell
$gerados = Get-ChildItem -Path "src/app" -Filter "*.ts" -Recurse |
    Where-Object { (Get-Content $_.FullName -Raw) -match '@generated\s+poui-specialist' }
```

**Agrupar por diretório** (cada diretório = uma geração):

```powershell
$grupos = $gerados | Group-Object { Split-Path $_.FullName -Parent }
```

---

## Passo 3 — Exibir lista de componentes

Se `--list` foi passado ou não foi fornecido caminho:

```
Componentes gerados pelo poui-specialist:

  [1] src/app/financeiro/pedidos-list/     (3 arquivos: .ts, .html, .scss)
  [2] src/app/compras/pedido-compra/       (3 arquivos)
  [3] src/app/rh/funcionarios/             (4 arquivos: + .service.ts)

Qual deseja remover? (número, ou 0 para cancelar)
>
```

Se `--list` foi passado: encerrar aqui (só listar, não remover).

Se argumento `<module>/<kebab-name>` foi fornecido: localizar o grupo correspondente a `src/app/<module>/<kebab-name>/` e pular para o Passo 4.

---

## Passo 4 — Confirmar antes de remover

Exibir detalhes do que será removido:

```
Componente selecionado: src/app/<module>/<kebab-name>/

Arquivos a remover:
  - src/app/<module>/<kebab-name>/<kebab-name>.component.ts
  - src/app/<module>/<kebab-name>/<kebab-name>.component.html
  - src/app/<module>/<kebab-name>/<kebab-name>.component.scss
  - src/app/<module>/<kebab-name>/<kebab-name>.service.ts  (se existir)

Rota a remover de app.routes.ts:
  path: '<module>/<kebab-name>'

Esta ação não pode ser desfeita automaticamente. Continuar? [S/n]
>
```

Se **n**: encerrar sem modificar nada.

---

## Passo 5 — Remover rota de app.routes.ts

Ler `src/app/app.routes.ts`.

Localizar o bloco de rota correspondente ao componente — padrão:

```typescript
  {
    path: '<module>/<kebab-name>',
    loadComponent: () =>
      import('./<module>/<kebab-name>/...')
        .then(m => m.<ComponentClass>),
  },
```

Remover o bloco (incluindo a vírgula final). Se não encontrado: registrar aviso `⚠ Rota não encontrada em app.routes.ts — pode já ter sido removida manualmente.` e continuar.

Salvar `app.routes.ts` sem o bloco.

---

## Passo 6 — Remover arquivos

```powershell
Remove-Item -Path "src/app/<module>/<kebab-name>/" -Recurse -Force
```

Se o diretório estiver vazio após a remoção dos arquivos do plugin mas contiver arquivos de outros: remover apenas os arquivos `@generated`, não o diretório inteiro.

---

## Passo 7 — Relatório

```
✅ Componente removido com sucesso.

   Arquivos removidos:
   - src/app/<module>/<kebab-name>/<kebab-name>.component.ts
   - src/app/<module>/<kebab-name>/<kebab-name>.component.html
   - src/app/<module>/<kebab-name>/<kebab-name>.component.scss

   Rota removida de app.routes.ts: path: '<module>/<kebab-name>'

Para regenar o componente:
  /poui-specialist:generate <tipo> <Name> --module <module>
```

---

## Tratamento de Erros

| Situação | Ação |
|---|---|
| Nenhum componente gerado encontrado | `ℹ Nenhum componente gerado pelo poui-specialist encontrado em src/app/` |
| Arquivo `.ts` encontrado mas sem header `@generated` | Ignorar — não é arquivo do plugin |
| Arquivo em uso (locked) | Exibir mensagem de erro e deixar o arquivo no lugar |
| `app.routes.ts` não encontrado | Exibir aviso e continuar com remoção dos arquivos |
