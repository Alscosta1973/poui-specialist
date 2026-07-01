# Task 2 Report — Mock Interceptor

**Status:** DONE
**Commit:** c228011
**Branch:** master

## Build
- `npx ng build --configuration development` concluiu sem erros
- `Application bundle generation complete. [11.294 seconds]`

## O que foi feito

1. **Criado** `src/app/rh/mocks/funcionarios.interceptor.ts` com `FuncionariosInterceptor` — 8 funcionários mock, suporte a GET lista (paginação + filtro `q`), GET por matrícula, POST/PUT, DELETE
2. **Atualizado** `src/app/app.config.ts`: adicionado `HTTP_INTERCEPTORS` ao import de `@angular/common/http`, import de `FuncionariosInterceptor`, e provider `{ provide: HTTP_INTERCEPTORS, useClass: FuncionariosInterceptor, multi: true }` antes do `LOCALE_ID`

## Ajustes além do especificado
Nenhum. Implementação exatamente conforme especificado.
