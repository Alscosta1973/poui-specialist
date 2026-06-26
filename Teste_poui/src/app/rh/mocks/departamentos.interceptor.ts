/**
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor,
  HttpRequest, HttpResponse,
} from '@angular/common/http';
import { Observable, delay, of } from 'rxjs';
import { Departamento } from '../departamentos/departamento.model';

let MOCK_DEPARTAMENTOS: Departamento[] = [
  { codDepto: '001', nomeDepto: 'RECURSOS HUMANOS',       gestorDepto: 'ANA PAULA RODRIGUES SILVA', ativo: true  },
  { codDepto: '002', nomeDepto: 'FINANCEIRO',              gestorDepto: 'CARLOS HENRIQUE MENDES',    ativo: true  },
  { codDepto: '003', nomeDepto: 'TECNOLOGIA DA INFORMACAO', gestorDepto: 'FERNANDA COSTA LIMA',      ativo: true  },
  { codDepto: '004', nomeDepto: 'PRODUCAO',                gestorDepto: '',                           ativo: false },
  { codDepto: '005', nomeDepto: 'COMPRAS',                 gestorDepto: 'MARIANA SOUZA PEREIRA',     ativo: true  },
  { codDepto: '006', nomeDepto: 'COMERCIAL',               gestorDepto: 'ROBERTO ALVES CARVALHO',    ativo: true  },
  { codDepto: '007', nomeDepto: 'MARKETING',               gestorDepto: '',                           ativo: true  },
];

@Injectable()
export class DepartamentosInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.includes('/rh/v1/departamentos')) {
      return next.handle(req);
    }

    const cod = this.extractCod(req.url);

    if (req.method === 'GET' && !cod) {
      const page     = Number(new URL(req.url, 'http://x').searchParams.get('page')     ?? 1);
      const pageSize = Number(new URL(req.url, 'http://x').searchParams.get('pageSize') ?? 10);
      const q        = new URL(req.url, 'http://x').searchParams.get('nomeDepto') ?? '';
      const ativoStr = new URL(req.url, 'http://x').searchParams.get('ativo');

      let filtered = MOCK_DEPARTAMENTOS;
      if (q) {
        filtered = filtered.filter(d =>
          d.nomeDepto.toLowerCase().includes(q.toLowerCase()) ||
          d.codDepto.includes(q),
        );
      }
      if (ativoStr !== null) {
        const ativoFilter = ativoStr === 'true';
        filtered = filtered.filter(d => d.ativo === ativoFilter);
      }

      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);
      return of(new HttpResponse({
        status: 200,
        body: { items, hasNext: start + pageSize < filtered.length },
      })).pipe(delay(400));
    }

    if (req.method === 'GET' && cod) {
      const item = MOCK_DEPARTAMENTOS.find(d => d.codDepto === cod);
      if (!item) {
        return of(new HttpResponse({ status: 404, body: { message: 'Departamento não encontrado.' } })).pipe(delay(300));
      }
      return of(new HttpResponse({ status: 200, body: item })).pipe(delay(300));
    }

    if (req.method === 'POST') {
      const body = req.body as Departamento;
      MOCK_DEPARTAMENTOS = [...MOCK_DEPARTAMENTOS, { ...body }];
      return of(new HttpResponse({ status: 201, body })).pipe(delay(400));
    }

    if (req.method === 'PUT' && cod) {
      const body = req.body as Partial<Departamento>;
      MOCK_DEPARTAMENTOS = MOCK_DEPARTAMENTOS.map(d =>
        d.codDepto === cod ? { ...d, ...body } : d,
      );
      const updated = MOCK_DEPARTAMENTOS.find(d => d.codDepto === cod);
      return of(new HttpResponse({ status: 200, body: updated })).pipe(delay(400));
    }

    if (req.method === 'DELETE' && cod) {
      MOCK_DEPARTAMENTOS = MOCK_DEPARTAMENTOS.filter(d => d.codDepto !== cod);
      return of(new HttpResponse({ status: 204, body: null })).pipe(delay(300));
    }

    return next.handle(req);
  }

  private extractCod(url: string): string | null {
    const match = url.match(/\/rh\/v1\/departamentos\/([^?]+)/);
    return match ? match[1] : null;
  }
}
