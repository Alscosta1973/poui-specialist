import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cliente, ClientesResponse } from './models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/financeiro/clientes';

  getClientes(page = 1, pageSize = 10, search = ''): Observable<ClientesResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<ClientesResponse>(this.apiUrl, { params });
  }

  deleteCliente(codigo: string, loja: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${codigo}/${loja}`);
  }

  getCliente(codigo: string, loja: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${codigo}/${loja}`);
  }

  createCliente(data: Partial<Cliente>): Observable<Cliente> {
    return this.http.post<Cliente>(this.apiUrl, data);
  }

  updateCliente(codigo: string, loja: string, data: Partial<Cliente>): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.apiUrl}/${codigo}/${loja}`, data);
  }
}
