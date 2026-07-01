# Padrão: Tratamento de Erros Protheus REST

Padrão único centralizado para lidar com erros 4xx/5xx do backend Protheus em componentes Angular PO-UI.

---

## Formato de erro padrão Protheus

O backend TLPP deve sempre retornar:
```json
{
  "code":    "ERR_001",
  "message": "Registro não encontrado",
  "detailedMessage": "SC6 não encontrou C6_NUM=000001 C6_LOJA=01"
}
```

Se o backend retorna Latin-1 (encoding antigo): usar `TextDecoder`.

---

## 1. Função de parse de erro — copie para o service

```typescript
import { HttpErrorResponse } from '@angular/common/http';

function parseProtheusError(err: HttpErrorResponse): string {
  // Latin-1 decode para mensagens legadas do Protheus
  if (err.error instanceof ArrayBuffer) {
    return new TextDecoder('iso-8859-1').decode(err.error);
  }
  if (typeof err.error === 'string') {
    try {
      const parsed = JSON.parse(err.error);
      return parsed.detailedMessage ?? parsed.message ?? err.error;
    } catch {
      return err.error;
    }
  }
  return err.error?.detailedMessage
      ?? err.error?.message
      ?? err.message
      ?? `Erro ${err.status}`;
}
```

---

## 2. Padrão de subscribe no componente

```typescript
// ✅ Padrão correto — sempre 3 callbacks
this.svc.list().subscribe({
  next: res => {
    this.items.set(res.items);
    this.hasNext.set(res.hasNext);
    this.loading.set(false);
  },
  error: (err: HttpErrorResponse) => {
    this.loading.set(false);
    this.notification.error({ message: parseProtheusError(err) });
  },
  complete: () => this.loading.set(false),
});
```

```typescript
// ✅ Para operações de mutação (POST/PUT/DELETE)
this.svc.save(dados).subscribe({
  next: () => {
    this.notification.success({ message: 'Salvo com sucesso' });
    this.load();
  },
  error: (err: HttpErrorResponse) => {
    this.saving.set(false);
    this.notification.error({ message: parseProtheusError(err) });
  },
});
```

---

## 3. Padrão no service — responseType ArrayBuffer para Latin-1

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly http = inject(HttpClient);
  private readonly base = '/rest/api/custom/v1/pedidos';

  list(page = 1, pageSize = 20): Observable<{ items: Pedido[]; hasNext: boolean }> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<{ items: Pedido[]; hasNext: boolean }>(this.base, { params }).pipe(
      catchError(err => throwError(() => err))
    );
  }

  save(pedido: Pedido): Observable<Pedido> {
    return pedido.codigo
      ? this.http.put<Pedido>(`${this.base}/${pedido.codigo}`, pedido)
      : this.http.post<Pedido>(this.base, pedido);
  }

  delete(codigo: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${codigo}`);
  }
}
```

---

## 4. Erros HTTP — respostas esperadas do Protheus

| Status | Significado | Ação no frontend |
|--------|-------------|-----------------|
| `200` | Sucesso | processar `res.items` / `res.hasNext` |
| `201` | Criado | `notification.success(...)` |
| `400` | Parâmetros inválidos | exibir `err.error.message` |
| `401` | Não autenticado | redirecionar para login |
| `403` | Sem permissão | `notification.error(...)` |
| `404` | Não encontrado | `notification.warning(...)` |
| `500` | Erro interno | `notification.error('Erro interno no servidor')` |
| `503` | AppServer fora | `notification.error('Servidor Protheus indisponível')` |

---

## 5. Interceptor global (opcional)

Se múltiplos componentes precisam do mesmo tratamento, use o interceptor HTTP gerado pelo plugin:

```
/poui-specialist:generate http-interceptor Auth
```

O template `templates-http-interceptor.md` inclui tradução automática de erros Protheus.

---

## 6. Regras — aplique em todo componente

- `loading.set(false)` **sempre** no `error` callback — nunca deixar loading eterno
- Nunca exibir `err.message` bruto ao usuário — usar `parseProtheusError()`
- Para `DELETE`, confirmar com `po-modal` antes de chamar o service
- Para operações em lote (action-list), usar padrão de resultado parcial do template `action-list`
