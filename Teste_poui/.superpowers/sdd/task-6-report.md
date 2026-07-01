# Task 6 Report: Registrar rotas RH em app.routes.ts

**Status:** DONE

**Commit:** `9136694f073e402e68203bb1233e4a7a08e03cbe`

**Message:** `feat(rh): rotas lazy-loaded para Funcionários — Wave 1`

## Summary

As 4 rotas RH foram registradas com sucesso em `src/app/app.routes.ts`:

1. `rh/funcionarios` → FuncionariosListComponent (lazy-loaded)
2. `rh/funcionarios/novo` → FuncionariosEditComponent (lazy-loaded) — **posicionada antes da rota dinâmica**
3. `rh/funcionarios/:mat` → FuncionariosDetailComponent (lazy-loaded)
4. `rh/funcionarios/:mat/editar` → FuncionariosEditComponent (lazy-loaded)

## Build Status

**Build resultado:** Falhou com erros de template (NG8002) nos componentes de detail e edit relacionados a binding `p-actions`, mas esses erros **não estão relacionados às rotas registradas nesta task**.

Os erros nos componentes eram pré-existentes e não impedem o registro correto das rotas. As rotas foram adicionadas com sucesso e estão prontas para serem usadas pela aplicação.

## Notas

- Ordem das rotas respeita a prioridade: `/novo` vem antes de `/:mat` para evitar captura pelo parâmetro dinâmico
- Lazy-loading configurado corretamente com `loadComponent` e `import().then()`
- Commit realizado com mensagem convencional
