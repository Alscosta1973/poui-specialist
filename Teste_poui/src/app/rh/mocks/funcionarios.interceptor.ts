/**
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor,
  HttpRequest, HttpResponse,
} from '@angular/common/http';
import { Observable, delay, of } from 'rxjs';
import { Funcionario } from '../models/funcionario.model';

const MOCK_FUNCIONARIOS: Funcionario[] = [
  {
    matricula: '000001', nome: 'ANA PAULA RODRIGUES SILVA', cpf: '123.456.789-01',
    dataNascimento: '1990-03-15', escolaridade: '9', deficiencia: '0',
    cargo: 'ANALISTA DE RH', departamento: '001', centroCusto: '0101',
    dataAdmissao: '2018-07-02', situacao: 'A', tipoContrato: 'CLT',
    turno: '1', salario: 5800.00,
    endereco: 'RUA DAS FLORES, 123', bairro: 'CENTRO', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01310-100',
    banco: '001', agencia: '1234', conta: '56789-0',
  },
  {
    matricula: '000002', nome: 'CARLOS HENRIQUE MENDES', cpf: '987.654.321-00',
    dataNascimento: '1985-11-22', escolaridade: '10', deficiencia: '0',
    cargo: 'GERENTE FINANCEIRO', departamento: '002', centroCusto: '0201',
    dataAdmissao: '2015-01-10', situacao: 'A', tipoContrato: 'CLT',
    turno: '1', salario: 12000.00,
    endereco: 'AV. PAULISTA, 1000 APTO 52', bairro: 'BELA VISTA', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01310-200',
    banco: '237', agencia: '5678', conta: '12345-6',
  },
  {
    matricula: '000003', nome: 'FERNANDA COSTA LIMA', cpf: '111.222.333-44',
    dataNascimento: '1995-06-30', escolaridade: '9', deficiencia: '0',
    cargo: 'DESENVOLVEDORA FRONTEND', departamento: '003', centroCusto: '0301',
    dataAdmissao: '2022-03-14', situacao: 'A', tipoContrato: 'PJ',
    turno: '2', salario: 8500.00,
    endereco: 'RUA AUGUSTA, 500', bairro: 'CONSOLACAO', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01304-001',
    banco: '341', agencia: '9012', conta: '34567-8',
  },
  {
    matricula: '000004', nome: 'JOAO VITOR SANTOS OLIVEIRA', cpf: '555.666.777-88',
    dataNascimento: '1992-08-18', escolaridade: '8', deficiencia: '0',
    cargo: 'AUXILIAR DE PRODUCAO', departamento: '004', centroCusto: '0401',
    dataAdmissao: '2020-09-01', situacao: 'F', tipoContrato: 'CLT',
    turno: '3', salario: 2200.00,
    endereco: 'RUA DAS INDUSTRIAS, 77', bairro: 'VILA LEOPOLDINA', municipio: 'SAO PAULO',
    estado: 'SP', cep: '05305-060',
    banco: '104', agencia: '3456', conta: '78901-2',
  },
  {
    matricula: '000005', nome: 'MARIANA SOUZA PEREIRA', cpf: '222.333.444-55',
    dataNascimento: '1988-12-05', escolaridade: '10', deficiencia: '1',
    cargo: 'COORDENADORA DE COMPRAS', departamento: '005', centroCusto: '0501',
    dataAdmissao: '2017-04-03', situacao: 'A', tipoContrato: 'CLT',
    turno: '1', salario: 9200.00,
    endereco: 'RUA VERGUEIRO, 2000', bairro: 'PARAISO', municipio: 'SAO PAULO',
    estado: 'SP', cep: '04101-000',
    banco: '033', agencia: '7890', conta: '23456-7',
  },
  {
    matricula: '000006', nome: 'ROBERTO ALVES CARVALHO', cpf: '444.555.666-77',
    dataNascimento: '1979-02-28', escolaridade: '10', deficiencia: '0',
    cargo: 'DIRETOR COMERCIAL', departamento: '006', centroCusto: '0601',
    dataAdmissao: '2010-08-15', situacao: 'A', tipoContrato: 'CLT',
    turno: '1', salario: 22000.00,
    endereco: 'ALAMEDA SANTOS, 300 APTO 141', bairro: 'JARDINS', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01419-001',
    banco: '001', agencia: '2345', conta: '67890-1',
  },
  {
    matricula: '000007', nome: 'PATRICIA NOGUEIRA RAMOS', cpf: '777.888.999-00',
    dataNascimento: '1997-09-14', escolaridade: '7', deficiencia: '0',
    cargo: 'ESTAGIARIA MARKETING', departamento: '007', centroCusto: '0701',
    dataAdmissao: '2025-02-01', situacao: 'A', tipoContrato: 'EST',
    turno: '1', salario: 1320.00,
    endereco: 'RUA BELA CINTRA, 400', bairro: 'CERQUEIRA CESAR', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01415-001',
    banco: '237', agencia: '4567', conta: '89012-3',
  },
  {
    matricula: '000008', nome: 'GUSTAVO FERREIRA TEIXEIRA', cpf: '000.111.222-33',
    dataNascimento: '1983-07-09', escolaridade: '9', deficiencia: '0',
    cargo: 'ANALISTA DE SUPORTE TI', departamento: '003', centroCusto: '0302',
    dataAdmissao: '2019-11-25', situacao: 'I', tipoContrato: 'CLT',
    turno: '2', salario: 4500.00,
    endereco: 'AV. REBOUCAS, 1500', bairro: 'PINHEIROS', municipio: 'SAO PAULO',
    estado: 'SP', cep: '05401-300',
    banco: '104', agencia: '6789', conta: '01234-5',
  },
];

@Injectable()
export class FuncionariosInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.includes('/rh/funcionarios')) {
      return next.handle(req);
    }

    const mat = this.extractMat(req.url);

    if (req.method === 'GET' && !mat) {
      const page     = Number(new URL(req.url, 'http://x').searchParams.get('page') ?? 1);
      const pageSize = Number(new URL(req.url, 'http://x').searchParams.get('pageSize') ?? 20);
      const q        = new URL(req.url, 'http://x').searchParams.get('nome') ?? '';
      const filtered = q
        ? MOCK_FUNCIONARIOS.filter(f =>
            f.nome.toLowerCase().includes(q.toLowerCase()) ||
            f.matricula.includes(q))
        : MOCK_FUNCIONARIOS;
      const start  = (page - 1) * pageSize;
      const items  = filtered.slice(start, start + pageSize);
      return of(new HttpResponse({ status: 200, body: { items, hasNext: start + pageSize < filtered.length } }))
        .pipe(delay(500));
    }

    if (req.method === 'GET' && mat) {
      const item = MOCK_FUNCIONARIOS.find(f => f.matricula === mat) ?? MOCK_FUNCIONARIOS[0];
      return of(new HttpResponse({ status: 200, body: item })).pipe(delay(500));
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      return of(new HttpResponse({ status: 200, body: { status: 'ok', ...req.body as object } })).pipe(delay(500));
    }

    if (req.method === 'DELETE') {
      return of(new HttpResponse({ status: 204, body: null })).pipe(delay(300));
    }

    return next.handle(req);
  }

  private extractMat(url: string): string | null {
    const match = url.match(/\/rh\/funcionarios\/([^?]+)/);
    return match ? match[1] : null;
  }
}
