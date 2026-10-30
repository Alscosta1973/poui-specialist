# Template: two-panel-browse `--detail` — lista + detalhe na mesma tela

Variante do `two-panel-browse` para **monitor / acompanhamento**: lista compacta de registros à esquerda e o
registro selecionado à direita (cabeçalho em cartão + abas com as grades), sem sair da tela. Não é
conciliação: não há seleção nos dois lados nem ação de emparelhamento.

Casos de uso: monitor de lotes/remessas de integração, fila de processamento, acompanhamento de pedidos,
painel de documentos com log de erro e ações "Reprocessar" / "Processar agora".

> Gerado a partir de uma tela real validada no Protheus 12.1.2510 com Angular 21 + PO-UI 21 (30/10/2026):
> leitura pelo FWRestModel (`--mvc <FONTE> --readonly`, ver `templates-mvc-rest.md`) e duas ações numa API
> TLPP própria. O código abaixo foi extraído deste arquivo para um projeto limpo e passou no `ng build` e no
> Karma (46/46). O exemplo é um "Monitor de Lotes" (cabeçalho ZA1, grades ZA2 itens e ZA3
> eventos): troque nomes, campos, status e ações pelos da rotina.

```
/poui-specialist:generate two-panel-browse MonitorLotes --module integracao --detail --mvc <FONTE>
```

## Layout

```
Título                                               [Ação primária] [Ação]
┌─ Lista (38%) ──────────────┬─ Detalhe (restante) ──────────────────────┐
│ Pesquisar [_____________]  │ ⚠ Erro no processamento (log, se houver)  │
│ Status [● Todos ▾] Tipo[▾] │ Lote XXXXX                ● Descrição      │
│ ● LOTE0001   R$ 1.000,00   │ Campo  Campo  Campo  Campo (grid de dl)   │
│   TIPO · ID · dd/mm/aaaa   │ [ Eventos (n) ] [ Itens (n) ]  (po-tabs)  │
│ ● LOTE0002 ...             │  po-table com bolinha do status + log     │
│ 12 de 40 Lotes [Carregar +]│                                           │
│ ● Legenda ● das ● cores    │                                           │
└────────────────────────────┴───────────────────────────────────────────┘
(< 800px: os painéis empilham)
```

## Padrões principais (obrigatórios)

| Padrão | Implementação | Por quê |
|---|---|---|
| Status na lista = bolinha (sem etiqueta) + legenda no rodapé | `<span [class]="bolinha(cor)">` com `p-tooltip` da descrição; `<ul class="tpd-legenda">` com todas as cores | padrão TOTVS das legendas `BR_*` do MVC |
| Status no detalhe = bolinha + descrição | `.tpd-status` no título do cartão | leitura rápida sem decorar as cores |
| Combo de status com bolinha em cada opção, sem o código | `ng-template p-combo-option-template` + bolinha sobreposta no campo (`.tpd-status-sel` / `.tpd-com-bolinha`); "Todos" = bolinha vazia (`tpd-sem-cor`) | o usuário reconhece pela cor, não pelo número |
| Cores só por token do tema | `LegendaItem.color` = `color-NN`/`caption-tag-NN`; classe `po-<token>` dá o fundo; cor clara (BR_BRANCO) leva contorno (`CORES_CLARAS`) | lint S01; funciona com tema escuro/AA |
| **Troca de registro sem overlay** | `loading = computed(() => carregandoLista())` — o overlay só aparece na entrada, na busca e no "Carregar mais"; o detalhe anterior **continua na tela** até o novo chegar (não limpar `detalhe` em `selecionar`) | a consulta é rápida e o overlay piscava a tela a cada clique |
| Ações bloqueadas durante a troca | `detalheAtual = computed(() => d.pk === selecionadoPk() && !carregandoDetalhe() ? d : null)`; `podeX` e `confirmarX` usam `detalheAtual()` | sem isso a ação roda sobre o registro anterior ainda exibido |
| `switchMap` no detalhe | `detalhe$.pipe(switchMap(get))` + `if (d.pk !== selecionadoPk()) return` | clique rápido em vários registros nunca mostra o errado |
| **Ação = tela travada com texto** | depois do `confirm`, `<po-loading-overlay [p-screen-lock]="true" [p-text]="textoAcao()">` com "Processando o Lote X..." até o Protheus responder | ação demorada sem retorno visual parece travamento |
| Retorno da ação | `po-notification` (success / warning se o status voltou com erro / error) e recarga do registro e da linha da lista | o usuário vê o resultado e o status novo |
| Busca no servidor, filtros no cliente | `SEARCH` com `debounceTime(400)`; Status/Tipo filtram os já carregados e o rodapé avisa ("filtram os N carregados") | o FWRestModel ignora o `FILTER` da URL (SQL) |
| Paginação | "Carregar mais" (`STARTINDEX`/`COUNT`), falha mantém a lista e a página | listas longas |
| Lista acessível | itens são `<button role="listitem">` com `aria-current` no selecionado e `:focus-visible` | teclado e leitor de tela |
| Empilhar em tela estreita | `@media (max-width: 799px)` → `flex-direction: column` | uso em notebook pequeno |

## Cores das legendas do Protheus (BR_*) → token do tema `@totvs/po-theme`

| Legenda MVC | Token | Cor |
|---|---|---|
| BR_AMARELO | `caption-tag-08` | #ffb900 |
| BR_LARANJA | `color-08` | #ea9b3e |
| BR_AZUL | `color-02` | #2c85c8 |
| BR_PINK | `caption-tag-28` | #ec4699 |
| BR_VERDE | `color-10` | #56b96b |
| BR_PRETO | `caption-tag-35` | #15191e |
| BR_BRANCO | `caption-tag-31` + contorno (`CORES_CLARAS`) | #f0f2f5 |
| BR_CINZA | `caption-tag-33` | #62748e |
| BR_VERMELHO | `color-07` | #c64840 |

Ler as legendas no `AddLegend` do browse da rotina MVC e manter a mesma cor para o mesmo status.

## O que adaptar

1. `lote.models.ts`: `LOTE_FWMODEL = '/fwmodel/<api>'` (no exemplo, `lotes`) e `LOTE_API` (no exemplo, `/lotesapi`)
   **sem `/rest`** (o ProtheusLibCore prefixa); trocar também no fake da API;
   `LOTE_SPEC` = `MPFormModel():New("<MODEL_ID>")` + ids do `AddFields`/`AddGrid`; interfaces com os campos.
2. `lote-status.ts`: legendas (valor, token, descrição em pt-BR com acento) e tipos auxiliares.
3. `lote.service.ts`: mapeamento `MvcRecord` → interface (`mvcText`/`mvcNumber`); grades por id do submodelo.
4. `lote-acoes.service.ts`: rotas das ações (ou remover se a tela só consulta); erro com `mensagemApi`.
5. Componente: título, campos do cartão (`campos`), colunas das abas, regras `podeX` (ex.: Reprocessar só com
   status de erro) e textos de confirmação/overlay.
6. Rotas: `{ path: '<modulo>/monitor', loadComponent: ... }` (lazy).
7. Arquivos de leitura do FWRestModel (`protheus-mvc.ts` e `protheus-mvc.service.ts`): modo `--readonly`
   de `templates-mvc-rest.md`.
8. Specs: fixtures do registro (lista e detalhe com grades), fake da API (`HttpInterceptorFn` respondendo
   `/fwmodel/<api>` e as ações) e os testes abaixo. O espião do `PoDialogService` é **sempre** pelo injetor do
   componente (`fixture.debugElement.injector.get(PoDialogService)`), ver `skills/poui-test/SKILL.md`.

Nada nos fontes gerados cita o plugin, template, `@generated`, `@see` ou `@license`.

## `src/app/<modulo>/lote-status.ts` — legenda (BR_* → token do tema), bolinha e formatação

```typescript
import { PoTableColumn } from '@po-ui/ng-components';

export interface LegendaItem {
  value: string;
  /** Token de cor do tema (color-NN / caption-tag-NN): a po-table e a classe po-<token> usam o mesmo. */
  color: string;
  label: string;
}

// Padrao TOTVS: cores so por token do tema, equivalentes as legendas do Protheus (BR_*)
const AMARELO = 'caption-tag-08'; // #ffb900 BR_AMARELO
const LARANJA = 'color-08'; // #ea9b3e BR_LARANJA
const AZUL = 'color-02'; // #2c85c8 BR_AZUL
const PINK = 'caption-tag-28'; // #ec4699 BR_PINK
const VERDE = 'color-10'; // #56b96b BR_VERDE
const PRETO = 'caption-tag-35'; // #15191e BR_PRETO
const BRANCO = 'caption-tag-31'; // #f0f2f5 BR_BRANCO (com contorno: classe tpd-bolinha-clara)
const CINZA = 'caption-tag-33'; // #62748e BR_CINZA
const VERMELHO = 'color-07'; // #c64840 BR_VERMELHO

/** Tokens claros demais para o fundo branco: a bolinha leva contorno. */
export const CORES_CLARAS: readonly string[] = [BRANCO];

/** Status do Lote (ZA1_STATUS) = legendas do MVC <FONTE>. */
export const LOTE_LEGENDA: LegendaItem[] = [
  { value: '01', color: AMARELO, label: 'Liberado' },
  { value: '02', color: LARANJA, label: 'Pedido' },
  { value: '03', color: AZUL, label: 'Faturado' },
  { value: '04', color: PINK, label: 'Título gerado' },
  { value: '05', color: VERDE, label: 'Baixado parcialmente' },
  { value: '06', color: PRETO, label: 'Baixado' },
  { value: '07', color: BRANCO, label: 'Solicitação de cancelamento' },
  { value: '08', color: CINZA, label: 'Cancelado' },
  { value: 'ER', color: VERMELHO, label: 'Erro de processamento' },
];

/** Status do Evento (ZA3_STATUS). */
export const EVENTO_LEGENDA: LegendaItem[] = [
  { value: '1', color: AMARELO, label: 'Pendente' },
  { value: '2', color: VERDE, label: 'Processado' },
  { value: '3', color: CINZA, label: 'Estornado' },
  { value: 'E', color: VERMELHO, label: 'Erro' },
];

/** Tipo do Evento (ZA3_EVENTO), especificacao. */
export const EVENTO_TIPOS: Record<string, string> = {
  '1': 'Rateio',
  '2': 'Baixa Normal',
  '3': 'Baixa Dação',
  '4': 'Complemento',
  '5': 'Estorno',
};

/** Tipo do Lote (ZA1_TPFAT). */
export const TIPO_LOTE: Record<string, string> = {
  NOR: 'Normal',
  COM: 'Complementar',
};

export const STATUS_LOTE_ERRO = 'ER';
export const STATUS_EVENTO_ERRO = 'E';

function legenda(lista: LegendaItem[], valor: string): LegendaItem | undefined {
  return lista.find((l) => l.value === valor);
}

export function descStatusLote(status: string): string {
  return legenda(LOTE_LEGENDA, status)?.label ?? status;
}

export function corStatusLote(status: string): string {
  return legenda(LOTE_LEGENDA, status)?.color ?? '';
}

export function descStatusEvento(status: string): string {
  return legenda(EVENTO_LEGENDA, status)?.label ?? status;
}

/** Classes da bolinha de um token de cor ('' = sem cor, so contorno). */
export function classeBolinha(base: string, cor: string): string {
  if (!cor) return `${base} tpd-sem-cor`;
  return CORES_CLARAS.includes(cor) ? `${base} po-${cor} tpd-bolinha-clara` : `${base} po-${cor}`;
}

/** Coluna de legenda nativa da po-table: bolinha na celula + legenda no rodape (padrao TOTVS). */
export function colunaLegenda(property: string, label: string, lista: LegendaItem[]): PoTableColumn {
  return {
    property,
    label,
    type: 'subtitle',
    width: '80px',
    sortable: false,
    subtitles: lista.map((l) => ({ value: l.value, color: l.color, label: l.label, content: '' })),
  };
}

/** 'AAAAMMDD' -> 'dd/mm/aaaa' ('' se vazio ou invalido). */
export function formatarData(d: string): string {
  const t = (d ?? '').trim();
  if (!/^\d{8}$/.test(t)) return '';
  return `${t.slice(6, 8)}/${t.slice(4, 6)}/${t.slice(0, 4)}`;
}

/** 'AAAAMMDDHHMM[SS]' -> 'dd/mm/aaaa hh:mm' ('' se vazio). */
export function formatarDataHora(dth: string): string {
  const t = (dth ?? '').trim();
  if (!/^\d{12}/.test(t)) return '';
  return `${formatarData(t.slice(0, 8))} ${t.slice(8, 10)}:${t.slice(10, 12)}`;
}

/** CNPJ (14 digitos) -> 99.999.999/9999-99; CPF (11) -> 999.999.999-99; outro valor volta como veio. */
export function formatarCnpj(doc: string): string {
  const t = (doc ?? '').replace(/\D/g, '');
  if (t.length === 14) return t.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (t.length === 11) return t.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return (doc ?? '').trim();
}

/** Junta as partes nao vazias com o separador (ex.: serie/doc, prefixo/numero/parcela/tipo). */
export function juntar(partes: string[], sep = '/'): string {
  return partes.every((p) => !p?.trim()) ? '' : partes.map((p) => (p ?? '').trim()).join(sep);
}
```

## `src/app/<modulo>/lote.models.ts` — rotas, `MvcModelSpec`, interfaces e mensagem de erro

```typescript
import { MvcModelSpec } from './services/protheus-mvc';

/**
 * Rotas da API REST, relativas a base REST: o ProtheusLibCore prefixa a URL do REST
 * (no menu via FwCallApp, a do Protheus; no ng serve, serverBackend + restEntryPoint do appConfig.json = /rest).
 */
export const LOTE_FWMODEL = '/fwmodel/lotes';
export const LOTE_API = '/lotesapi';

/** Estrutura do modelo MVC <FONTE> (RM_<FONTE>.prw): cabecalho ZA1 + grades ZA2 (itens) e ZA3 (eventos). */
export const LOTE_SPEC: MvcModelSpec = {
  modelId: '<MODEL_ID>',
  masterId: 'ZA1MASTER',
  children: [
    { id: 'ZA2DETAIL', type: 'GRID' },
    { id: 'ZA3DETAIL', type: 'GRID' },
  ],
};

/** Lote na lista do monitor (ZA1, so os campos da lista). Datas AAAAMMDD; '' = vazia. */
export interface LoteResumo {
  pk: string;
  lote: string;
  idRem: string;
  cnpj: string;
  status: string;
  tpFat: string;
  dtFat: string;
  valor: number;
}

/** Item do Lote (ZA2). */
export interface LoteItem {
  item: string;
  produto: string;
  dtHr: string;
  quant: number;
  vlUnit: number;
  vlTot: number;
  tes: string;
  compet: string;
}

/** Evento do Lote (ZA3). */
export interface LoteEvento {
  evento: string;
  seq: string;
  ccusto: string;
  natureza: string;
  valor: number;
  dtHr: string;
  dtBaixa: string;
  ra: string;
  status: string;
  idBx: string;
  seqBx: string;
  titCompl: string;
  dtHrPro: string;
  logErro: string;
}

/** Lote completo (ZA1 + ZA2 + ZA3) do painel de detalhe. */
export interface LoteDetalhe extends LoteResumo {
  filial: string;
  cliente: string;
  loja: string;
  dtHrInt: string;
  vencto: string;
  condPg: string;
  ccusto: string;
  natureza: string;
  vlBaixado: number;
  tpTit: string;
  compet: string;
  observ: string;
  pedido: string;
  serie: string;
  doc: string;
  dtEmis: string;
  codNfe: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo: string;
  dtHrPro: string;
  logErro: string;
  itens: LoteItem[];
  eventos: LoteEvento[];
}

/** Pagina da lista de Lotes (FWRestModel: total + STARTINDEX/COUNT). */
export interface LotePage {
  items: LoteResumo[];
  hasNext: boolean;
  total: number;
}

/** Retorno das acoes Processar agora / Reprocessar. */
export interface AcaoRetorno {
  lote: string;
  mensagem: string;
  status: string;
  statusDescricao: string;
}

/** Erro de negocio da API da integracao: {lote, erros:[{codigo, campo, mensagem}]}. */
export interface ApiErro {
  codigo: string;
  campo: string;
  mensagem: string;
}

/** Mensagem de um erro HTTP (erros[] da API, MvcError ou HttpErrorResponse). */
export function mensagemApi(err: unknown): string {
  const e = err as {
    status?: number;
    error?: { erros?: ApiErro[]; message?: string; errorMessage?: string };
    message?: string;
  };
  if (e?.status === 401) return 'Sessão expirada. Abra a rotina novamente pelo menu.';
  const erros = e?.error?.erros;
  if (Array.isArray(erros) && erros.length) return erros.map((x) => x.mensagem).join(' ');
  return e?.error?.message || e?.error?.errorMessage || e?.message || 'Erro ao processar a requisição.';
}
```

## `src/app/<modulo>/services/lote.service.ts` — leitura pelo FWRestModel (`--mvc --readonly`)

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { LOTE_FWMODEL, LOTE_SPEC, LoteDetalhe, LoteEvento, LoteItem, LotePage, LoteResumo } from '../lote.models';
import { MvcData, MvcRecord, mvcNumber, mvcText } from './protheus-mvc';
import { ProtheusMvcService } from './protheus-mvc.service';

/** Campos do cabecalho (ZA1) usados na lista. */
export function toLoteResumo(v: MvcRecord, pk: string): LoteResumo {
  return {
    pk,
    lote: mvcText(v['ZA1_LOTE']),
    idRem: mvcText(v['ZA1_IDREM']),
    cnpj: mvcText(v['ZA1_CNPJ']),
    status: mvcText(v['ZA1_STATUS']),
    tpFat: mvcText(v['ZA1_TPFAT']),
    dtFat: mvcText(v['ZA1_DTFAT']),
    valor: mvcNumber(v['ZA1_VALOR']),
  };
}

function toItem(v: MvcRecord): LoteItem {
  return {
    item: mvcText(v['ZA2_ITEM']),
    produto: mvcText(v['ZA2_PRODUT']),
    dtHr: mvcText(v['ZA2_DTHR']),
    quant: mvcNumber(v['ZA2_QUANT']),
    vlUnit: mvcNumber(v['ZA2_VLUNIT']),
    vlTot: mvcNumber(v['ZA2_VLTOT']),
    tes: mvcText(v['ZA2_TES']),
    compet: mvcText(v['ZA2_COMPET']),
  };
}

function toEvento(v: MvcRecord): LoteEvento {
  return {
    evento: mvcText(v['ZA3_EVENTO']),
    seq: mvcText(v['ZA3_SEQ']),
    ccusto: mvcText(v['ZA3_CCUSTO']),
    natureza: mvcText(v['ZA3_NATURE']),
    valor: mvcNumber(v['ZA3_VALOR']),
    dtHr: mvcText(v['ZA3_DTHR']),
    dtBaixa: mvcText(v['ZA3_DTBAIX']),
    ra: mvcText(v['ZA3_RA']),
    status: mvcText(v['ZA3_STATUS']),
    idBx: mvcText(v['ZA3_IDBX']),
    seqBx: mvcText(v['ZA3_SEQBX']),
    titCompl: mvcText(v['ZA3_TITCOM']),
    dtHrPro: mvcText(v['ZA3_DTHPRO']),
    logErro: mvcText(v['ZA3_LOGERR']),
  };
}

/** Registro do FWRestModel (ZA1 + grades ZA2/ZA3) -> Lote do painel de detalhe. */
export function toLoteDetalhe(d: MvcData): LoteDetalhe {
  const v = d.values;
  const linhas = (id: string) => (d.grids[id] ?? []).filter((l) => !l.deleted).map((l) => l.values);
  return {
    ...toLoteResumo(v, d.pk ?? ''),
    filial: mvcText(v['ZA1_FILIAL']),
    cliente: mvcText(v['ZA1_CLIENT']),
    loja: mvcText(v['ZA1_LOJA']),
    dtHrInt: mvcText(v['ZA1_DTHINT']),
    vencto: mvcText(v['ZA1_VENCTO']),
    condPg: mvcText(v['ZA1_CONDPG']),
    ccusto: mvcText(v['ZA1_CCUSTO']),
    natureza: mvcText(v['ZA1_NATURE']),
    vlBaixado: mvcNumber(v['ZA1_VLBAIX']),
    tpTit: mvcText(v['ZA1_TPTIT']),
    compet: mvcText(v['ZA1_COMPET']),
    observ: mvcText(v['ZA1_OBSERV']),
    pedido: mvcText(v['ZA1_PEDIDO']),
    serie: mvcText(v['ZA1_SERIE']),
    doc: mvcText(v['ZA1_DOC']),
    dtEmis: mvcText(v['ZA1_DTEMIS']),
    codNfe: mvcText(v['ZA1_CODNFE']),
    prefixo: mvcText(v['ZA1_PREFIX']),
    numero: mvcText(v['ZA1_NUM']),
    parcela: mvcText(v['ZA1_PARCEL']),
    tipo: mvcText(v['ZA1_TIPO']),
    dtHrPro: mvcText(v['ZA1_DTHPRO']),
    logErro: mvcText(v['ZA1_LOGERR']),
    itens: linhas('ZA2DETAIL').map(toItem),
    eventos: linhas('ZA3DETAIL').map(toEvento),
  };
}

/** Lotes da integracao (ZA1/ZA2/ZA3) pelo FWRestModel da rotina <FONTE> (RM_<FONTE>.prw). */
@Injectable({ providedIn: 'root' })
export class LoteService {
  private readonly mvc = inject(ProtheusMvcService);

  /** Pagina da lista; busca = SEARCH do recurso (Lote, ID da Remessa ou CNPJ). */
  list(page = 1, pageSize = 20, busca = ''): Observable<LotePage> {
    return this.mvc.list(LOTE_FWMODEL, LOTE_SPEC, page, pageSize, busca).pipe(
      map((p) => ({ total: p.total, hasNext: p.hasNext, items: p.items.map((i) => toLoteResumo(i, i._pk)) })),
    );
  }

  get(pk: string): Observable<LoteDetalhe> {
    return this.mvc.get(LOTE_FWMODEL, LOTE_SPEC, pk).pipe(map(toLoteDetalhe));
  }
}
```

## `src/app/<modulo>/services/lote-acoes.service.ts` — ações da API própria

```typescript
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { AcaoRetorno, LOTE_API, mensagemApi } from '../lote.models';

/** Acoes do Monitor sobre um Lote (API lotesapi): mesmas regras da rotina MVC. */
@Injectable({ providedIn: 'root' })
export class LoteAcoesService {
  private readonly http = inject(HttpClient);

  /** Executa agora o processamento dos Jobs (pedido/titulo e eventos) para o Lote. */
  processar(lote: string): Observable<AcaoRetorno> {
    return this.acao(lote, 'processar');
  }

  /** Volta para pendente o Lote com erro (ER) e os eventos com erro. */
  reprocessar(lote: string): Observable<AcaoRetorno> {
    return this.acao(lote, 'reprocessar');
  }

  private acao(lote: string, acao: 'processar' | 'reprocessar'): Observable<AcaoRetorno> {
    return this.http
      .post<AcaoRetorno>(`${LOTE_API}/lote/${encodeURIComponent(lote.trim())}/${acao}`, {})
      .pipe(catchError((e: HttpErrorResponse) => throwError(() => new Error(mensagemApi(e)))));
  }
}
```

## `monitor.component.ts`

```typescript
import { CurrencyPipe, formatCurrency } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, Observable, Subject, catchError, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs';
import {
  PoButtonModule,
  PoComboOption,
  PoDialogService,
  PoFieldModule,
  PoLoadingModule,
  PoNotificationService,
  PoPageAction,
  PoPageModule,
  PoTableColumn,
  PoTableLiterals,
  PoTableModule,
  PoTabsModule,
  PoTooltipModule,
} from '@po-ui/ng-components';
import { AcaoRetorno, LoteDetalhe, LoteResumo, mensagemApi } from '../lote.models';
import {
  EVENTO_LEGENDA,
  EVENTO_TIPOS,
  LOTE_LEGENDA,
  STATUS_EVENTO_ERRO,
  STATUS_LOTE_ERRO,
  TIPO_LOTE,
  classeBolinha,
  colunaLegenda,
  corStatusLote,
  descStatusEvento,
  descStatusLote,
  formatarCnpj,
  formatarData,
  formatarDataHora,
  juntar,
} from '../lote-status';
import { LoteAcoesService } from '../services/lote-acoes.service';
import { LoteService } from '../services/lote.service';

/** Opcao do combo de status: label + token de cor da legenda (classe po-<token> na bolinha). */
export interface StatusOption extends PoComboOption {
  color: string;
}

/** Linha da aba Eventos (valores formatados). */
export interface EventoLinha {
  status: string;
  situacao: string;
  evento: string;
  seq: string;
  valor: number;
  ccusto: string;
  natureza: string;
  dtHr: string;
  dtBaixa: string;
  titCompl: string;
  dtHrPro: string;
  logErro: string;
}

/** Campo do cartao de detalhe ('' = vazio, exibido como traco). */
export interface CampoDetalhe {
  label: string;
  value: string;
}

/** Linha da aba Itens (valores formatados). */
export interface ItemLinha {
  item: string;
  produto: string;
  quant: number;
  vlUnit: number;
  vlTot: number;
  tes: string;
  compet: string;
  dtHr: string;
}

// 'T' = Todos: o combo nao exibe opcao com valor vazio
const TODOS = 'T';

/**
 * Monitor de Lotes: lista de Lotes (ZA1) a esquerda e detalhe do Lote selecionado a direita.
 * Busca no servidor (SEARCH: Lote, ID da Remessa ou CNPJ). Os filtros de Status e Tipo sao aplicados no
 * cliente sobre os Lotes ja carregados, porque o FWRestModel ignora o FILTER da URL (protecao contra
 * injecao de SQL); "Carregar mais" traz a proxima pagina e o filtro vale para ela tambem.
 */
@Component({
  selector: 'app-lote-monitor',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, PoPageModule, PoFieldModule, PoButtonModule, PoTableModule, PoTabsModule, PoTooltipModule, PoLoadingModule],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitorComponent implements OnInit {
  private readonly lotesService = inject(LoteService);
  private readonly acoesService = inject(LoteAcoesService);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog = inject(PoDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);

  readonly titulo = 'Monitor de Lotes';
  readonly legenda = LOTE_LEGENDA;

  /** Lotes carregados do servidor (todas as paginas ja lidas). */
  readonly lotes = signal<LoteResumo[]>([]);
  readonly total = signal(0);
  readonly temMais = signal(false);
  readonly carregandoLista = signal(false);
  readonly carregandoDetalhe = signal(false);
  readonly executando = signal(false);
  /** Overlay "Carregando" (padrao TOTVS) so na carga da lista: entrada, busca e "Carregar mais".
      A troca de Lote e rapida e nao usa overlay (a tela piscava); o detalhe anterior fica ate o novo chegar. */
  readonly loading = computed(() => this.carregandoLista());
  /** Mensagem do overlay das acoes (tela travada enquanto o Protheus processa). */
  readonly textoAcao = signal('');

  readonly statusSel = signal(TODOS);
  readonly tipoSel = signal(TODOS);
  textoBusca = '';

  readonly selecionadoPk = signal('');
  readonly detalhe = signal<LoteDetalhe | null>(null);

  /** Registros por pagina do servidor. */
  tamanhoPagina = 20;
  private pagina = 1;

  private readonly busca$ = new Subject<string>();
  private readonly detalhe$ = new Subject<string>();

  /** Opcoes do combo de status com a cor da legenda (bolinha em cada opcao); Todos sem cor. */
  readonly statusOptions: StatusOption[] = [
    { value: TODOS, label: 'Todos', color: '' },
    ...LOTE_LEGENDA.map((s) => ({ value: s.value, label: s.label, color: s.color })),
  ];

  readonly tipoOptions: PoComboOption[] = [
    { value: TODOS, label: 'Todos' },
    { value: 'NOR', label: 'NOR' },
    { value: 'COM', label: 'COM' },
  ];

  /** Lotes exibidos: carregados + filtros de Status e Tipo (no cliente). */
  readonly lotesVisiveis = computed(() => {
    const st = this.statusSel();
    const tp = this.tipoSel();
    return this.lotes().filter((l) => (st === TODOS || l.status === st) && (tp === TODOS || l.tpFat === tp));
  });

  readonly filtroAtivo = computed(() => this.statusSel() !== TODOS || this.tipoSel() !== TODOS);

  /** Token de cor da legenda do status escolhido ('' = Todos). */
  readonly corStatusSel = computed(() => corStatusLote(this.statusSel()));

  /** Detalhe do Lote selecionado ja carregado (durante a troca de Lote ainda e o anterior: acoes bloqueadas). */
  readonly detalheAtual = computed(() => {
    const d = this.detalhe();
    return d && d.pk === this.selecionadoPk() && !this.carregandoDetalhe() ? d : null;
  });

  readonly podeProcessar = computed(() => !!this.detalheAtual() && !this.executando());

  /** Reprocessar: Lote com erro (ER) ou com algum evento com erro (mesma regra da rotina MVC). */
  readonly podeReprocessar = computed(() => {
    const d = this.detalheAtual();
    if (!d || this.executando()) return false;
    return d.status === STATUS_LOTE_ERRO || d.eventos.some((e) => e.status === STATUS_EVENTO_ERRO);
  });

  /** Acoes do topo: Reprocessar e a primaria (primeira); as duas dependem do Lote selecionado. */
  readonly acoes = computed<PoPageAction[]>(() => [
    {
      label: 'Reprocessar',
      icon: 'an an-arrow-clockwise',
      action: () => this.confirmarReprocessar(),
      disabled: !this.podeReprocessar(),
    },
    {
      label: 'Processar agora',
      icon: 'an an-play',
      action: () => this.confirmarProcessar(),
      disabled: !this.podeProcessar(),
    },
  ]);

  /** Campos do cartao do Lote selecionado (o Status fica no titulo do cartao, com a bolinha). */
  readonly campos = computed<CampoDetalhe[]>(() => {
    const d = this.detalhe();
    if (!d) return [];
    const moeda = (v: number) => formatCurrency(v, this.locale, 'R$', 'BRL', '1.2-2');
    const tipo = TIPO_LOTE[d.tpFat];
    return [
      { label: 'Tipo', value: tipo && tipo !== d.tpFat ? `${d.tpFat} - ${tipo}` : d.tpFat },
      { label: 'ID da Remessa', value: d.idRem },
      { label: 'CNPJ', value: formatarCnpj(d.cnpj) },
      { label: 'Cliente/Loja', value: juntar([d.cliente, d.loja]) },
      { label: 'Emissão', value: formatarData(d.dtFat) },
      { label: 'Vencimento', value: formatarData(d.vencto) },
      { label: 'Valor', value: moeda(d.valor) },
      { label: 'Valor baixado', value: moeda(d.vlBaixado) },
      { label: 'Pedido', value: d.pedido },
      { label: 'Nota (série/doc)', value: juntar([d.serie, d.doc]) },
      { label: 'Título', value: juntar([d.prefixo, d.numero, d.parcela, d.tipo]) },
      { label: 'Cód. NFS-e', value: d.codNfe },
      { label: 'Data/hora integração', value: formatarDataHora(d.dtHrInt) },
      { label: 'Data/hora processamento', value: formatarDataHora(d.dtHrPro) },
    ];
  });

  readonly eventosLinhas = computed<EventoLinha[]>(() =>
    (this.detalhe()?.eventos ?? []).map((e) => ({
      status: e.status,
      situacao: descStatusEvento(e.status),
      evento: EVENTO_TIPOS[e.evento] ?? e.evento,
      seq: e.seq,
      valor: e.valor,
      ccusto: e.ccusto,
      natureza: e.natureza,
      dtHr: formatarDataHora(e.dtHr),
      dtBaixa: formatarData(e.dtBaixa),
      titCompl: e.titCompl,
      dtHrPro: formatarDataHora(e.dtHrPro),
      logErro: e.logErro,
    })),
  );

  readonly itensLinhas = computed<ItemLinha[]>(() =>
    (this.detalhe()?.itens ?? []).map((i) => ({
      item: i.item,
      produto: i.produto,
      quant: i.quant,
      vlUnit: i.vlUnit,
      vlTot: i.vlTot,
      tes: i.tes,
      compet: i.compet,
      dtHr: formatarDataHora(i.dtHr),
    })),
  );

  readonly colunasEventos: PoTableColumn[] = [
    colunaLegenda('status', 'Status', EVENTO_LEGENDA),
    { property: 'situacao', label: 'Situação', width: '110px' },
    { property: 'evento', label: 'Evento', width: '130px' },
    { property: 'seq', label: 'Seq.', width: '70px' },
    { property: 'valor', label: 'Valor', type: 'currency', format: 'BRL', width: '130px' },
    { property: 'ccusto', label: 'C. Custo', width: '110px' },
    { property: 'natureza', label: 'Natureza', width: '110px' },
    { property: 'dtHr', label: 'Dt/Hr integração', width: '150px' },
    { property: 'dtBaixa', label: 'Dt. baixa', width: '110px' },
    { property: 'titCompl', label: 'Tít. compl.', width: '150px' },
    { property: 'dtHrPro', label: 'Dt/Hr processamento', width: '160px' },
    { property: 'logErro', label: 'Log de erro', width: '320px', color: 'color-07' },
  ];

  readonly literaisEventos: PoTableLiterals = { noData: 'Nenhum evento recebido para o Lote.' };

  readonly colunasItens: PoTableColumn[] = [
    { property: 'item', label: 'Item', width: '70px' },
    { property: 'produto', label: 'Produto', width: '150px' },
    { property: 'quant', label: 'Quantidade', type: 'number', format: '1.0-2', width: '110px' },
    { property: 'vlUnit', label: 'Vlr. unitário', type: 'currency', format: 'BRL', width: '130px' },
    { property: 'vlTot', label: 'Vlr. total', type: 'currency', format: 'BRL', width: '130px' },
    { property: 'tes', label: 'TES', width: '70px' },
    { property: 'compet', label: 'Competência', width: '110px' },
    { property: 'dtHr', label: 'Data/hora', width: '150px' },
  ];

  // funcoes usadas no HTML
  readonly descStatusLote = descStatusLote;
  readonly formatarData = formatarData;

  bolinha(cor: string, base = 'tpd-bolinha'): string {
    return classeBolinha(base, cor);
  }

  corStatus(status: string): string {
    return corStatusLote(status);
  }

  constructor() {
    this.busca$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((texto) => {
        this.textoBusca = texto;
        this.carregar();
      });

    // switchMap: trocar de Lote cancela a consulta anterior (o detalhe nunca fica com o Lote errado)
    this.detalhe$
      .pipe(
        switchMap((pk) => {
          this.carregandoDetalhe.set(true);
          return this.lotesService.get(pk).pipe(
            catchError((err: unknown) => {
              this.notification.error(mensagemApi(err));
              return EMPTY;
            }),
            finalize(() => this.carregandoDetalhe.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((d) => {
        if (d.pk !== this.selecionadoPk()) return;
        this.detalhe.set(d);
        // a linha da lista acompanha o registro atual (status/valor podem ter mudado)
        this.lotes.update((ls) =>
          ls.map((l) =>
            l.pk === d.pk
              ? { pk: d.pk, lote: d.lote, idRem: d.idRem, cnpj: d.cnpj, status: d.status, tpFat: d.tpFat, dtFat: d.dtFat, valor: d.valor }
              : l,
          ),
        );
      });
  }

  ngOnInit(): void {
    this.carregar();
  }

  /** Busca com debounce (Lote, ID da Remessa ou CNPJ -> SEARCH). */
  pesquisar(texto: string | null | undefined): void {
    this.busca$.next((texto ?? '').trim());
  }

  filtrarStatus(status: string | null | undefined): void {
    this.statusSel.set(status || TODOS);
  }

  filtrarTipo(tipo: string | null | undefined): void {
    this.tipoSel.set(tipo || TODOS);
  }

  selecionar(l: LoteResumo): void {
    if (l.pk === this.selecionadoPk() && this.detalhe()) return;
    this.selecionadoPk.set(l.pk);
    this.detalhe$.next(l.pk);
  }

  carregarMais(): void {
    this.pagina++;
    this.carregar(true);
  }

  confirmarProcessar(): void {
    const d = this.detalheAtual();
    if (!d) return;
    this.dialog.confirm({
      title: 'Processar agora',
      message: `Executar agora o processamento do Lote ${d.lote}?`,
      confirm: () => this.executar(d, this.acoesService.processar(d.lote), `Processando o Lote ${d.lote}...`),
    });
  }

  confirmarReprocessar(): void {
    const d = this.detalheAtual();
    if (!d || !this.podeReprocessar()) return;
    this.dialog.confirm({
      title: 'Reprocessar',
      message: `Voltar para pendente o Lote ${d.lote} e os eventos com erro?`,
      confirm: () => this.executar(d, this.acoesService.reprocessar(d.lote), `Reprocessando o Lote ${d.lote}...`),
    });
  }

  private executar(d: LoteDetalhe, acao$: Observable<AcaoRetorno>, texto: string): void {
    this.textoAcao.set(texto);
    this.executando.set(true);
    acao$
      .pipe(
        finalize(() => this.executando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          const msg = r.mensagem || `Lote ${r.lote}: ${r.statusDescricao}`;
          if (r.status === STATUS_LOTE_ERRO) {
            this.notification.warning(msg);
          } else {
            this.notification.success(msg);
          }
          this.recarregarSelecionado(d.pk);
        },
        error: (err: unknown) => {
          this.notification.error(mensagemApi(err));
          this.recarregarSelecionado(d.pk);
        },
      });
  }

  private recarregarSelecionado(pk: string): void {
    if (pk === this.selecionadoPk()) this.detalhe$.next(pk);
  }

  private carregar(acumular = false): void {
    if (!acumular) this.pagina = 1;
    this.carregandoLista.set(true);
    this.lotesService
      .list(this.pagina, this.tamanhoPagina, this.textoBusca)
      .pipe(
        finalize(() => this.carregandoLista.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.lotes.set(acumular ? [...this.lotes(), ...res.items] : res.items);
          this.total.set(res.total);
          this.temMais.set(res.hasNext);
        },
        error: (err: unknown) => {
          // falha no "Carregar mais": mantem a lista e permite tentar de novo
          if (acumular) {
            this.pagina--;
          } else {
            this.lotes.set([]);
            this.total.set(0);
            this.temMais.set(false);
          }
          this.notification.error(mensagemApi(err));
        },
      });
  }
}
```

## `monitor.component.html`

```html
<po-page-default [p-title]="titulo" [p-actions]="acoes()">
  <div class="tpd-monitor">
    <!-- painel esquerdo: filtros + lista de Lotes -->
    <section class="tpd-painel tpd-painel-lista" aria-label="Lotes">
      <div class="po-row">
        <div class="po-sm-12">
          <po-input
            name="busca"
            p-label="Pesquisar"
            p-placeholder="Lote, ID da Remessa ou CNPJ"
            p-icon="an an-magnifying-glass"
            [p-clean]="true"
            [ngModel]="textoBusca"
            (ngModelChange)="pesquisar($event)">
          </po-input>
        </div>
        <!-- combo com a bolinha da legenda em cada opcao; a do status escolhido fica sobreposta no campo -->
        <div class="po-sm-7 tpd-status-sel" [class.tpd-com-bolinha]="corStatusSel()">
          <po-combo
            name="statusSel"
            p-label="Status"
            [p-options]="statusOptions"
            [p-remove-initial-filter]="true"
            [ngModel]="statusSel()"
            (p-change)="filtrarStatus($event)">
            <ng-template p-combo-option-template let-option>
              <span class="tpd-opcao-status">
                <span [class]="bolinha(option.color, 'tpd-bolinha-opcao')"></span>
                {{ option.label }}
              </span>
            </ng-template>
          </po-combo>
          @if (corStatusSel()) {
            <span [class]="bolinha(corStatusSel(), 'tpd-bolinha-sel')"></span>
          }
        </div>
        <div class="po-sm-5">
          <po-combo
            name="tipoSel"
            p-label="Tipo"
            [p-options]="tipoOptions"
            [p-remove-initial-filter]="true"
            [ngModel]="tipoSel()"
            (p-change)="filtrarTipo($event)">
          </po-combo>
        </div>
      </div>

      <div class="tpd-lista" role="list">
        @for (l of lotesVisiveis(); track l.pk) {
          <button
            type="button"
            role="listitem"
            class="tpd-lote"
            [class.tpd-lote-sel]="l.pk === selecionadoPk()"
            [attr.aria-current]="l.pk === selecionadoPk() ? 'true' : null"
            (click)="selecionar(l)">
            <span
              [class]="bolinha(corStatus(l.status))"
              [p-tooltip]="descStatusLote(l.status)"
              [attr.aria-label]="descStatusLote(l.status)"></span>
            <span class="tpd-lote-texto">
              <strong class="tpd-lote-numero">{{ l.lote }}</strong>
              <span class="tpd-lote-sub">{{ l.tpFat }} · ID {{ l.idRem }} · {{ formatarData(l.dtFat) }}</span>
            </span>
            <span class="tpd-lote-valor">{{ l.valor | currency: 'BRL' : 'symbol' : '1.2-2' }}</span>
          </button>
        } @empty {
          @if (!carregandoLista()) {
            <p class="tpd-vazio">Nenhum Lote encontrado.</p>
          }
        }
      </div>

      <div class="tpd-lista-rodape">
        <span class="tpd-contagem">
          {{ lotesVisiveis().length }} de {{ total() }} Lotes
          @if (filtroAtivo()) {
            <span class="tpd-dica">(Status e Tipo filtram os {{ lotes().length }} Lotes carregados)</span>
          }
        </span>
        @if (temMais()) {
          <po-button p-label="Carregar mais" p-kind="tertiary" [p-disabled]="carregandoLista()" (p-click)="carregarMais()">
          </po-button>
        }
      </div>

      <ul class="tpd-legenda" aria-label="Legenda do status">
        @for (s of legenda; track s.value) {
          <li><span [class]="bolinha(s.color)"></span>{{ s.label }}</li>
        }
      </ul>
    </section>

    <!-- painel direito: detalhe do Lote selecionado -->
    <section class="tpd-painel tpd-painel-detalhe" aria-label="Detalhe do Lote">
      @if (detalhe(); as d) {
        @if (d.logErro) {
          <div class="tpd-aviso-erro" role="alert">
            <span class="an an-warning tpd-aviso-icone" aria-hidden="true"></span>
            <div>
              <strong>Erro no processamento do Lote</strong>
              <p class="tpd-log">{{ d.logErro }}</p>
            </div>
          </div>
        }

        <div class="tpd-cartao">
          <div class="tpd-cartao-titulo">
            <span class="tpd-cartao-lote">Lote <strong>{{ d.lote }}</strong></span>
            <span class="tpd-status">
              <span [class]="bolinha(corStatus(d.status))"></span>
              {{ descStatusLote(d.status) }}
            </span>
          </div>
          <dl class="tpd-campos">
            @for (c of campos(); track c.label) {
              <div class="tpd-campo">
                <dt>{{ c.label }}</dt>
                <dd>{{ c.value || '-' }}</dd>
              </div>
            }
          </dl>
        </div>

        <po-tabs>
          <po-tab [p-label]="'Eventos (' + eventosLinhas().length + ')'" [p-active]="true">
            <po-table
              [p-columns]="colunasEventos"
              [p-items]="eventosLinhas()"
              [p-height]="300"
              [p-striped]="true"
              [p-sort]="true"
              [p-hide-columns-manager]="true"
              [p-literals]="literaisEventos">
            </po-table>
          </po-tab>
          <po-tab [p-label]="'Itens (' + itensLinhas().length + ')'">
            <po-table
              [p-columns]="colunasItens"
              [p-items]="itensLinhas()"
              [p-height]="300"
              [p-striped]="true"
              [p-sort]="true"
              [p-hide-columns-manager]="true">
            </po-table>
          </po-tab>
        </po-tabs>
      } @else {
        <p class="tpd-vazio tpd-vazio-detalhe">
          @if (selecionadoPk()) {
            Carregando o Lote...
          } @else {
            Selecione um Lote na lista para ver os detalhes.
          }
        </p>
      }
    </section>
  </div>

  @if (loading()) {
    <po-loading-overlay [p-screen-lock]="false" />
  }
  <!-- acoes: tela travada com a mensagem do que esta sendo feito ate o Protheus responder -->
  @if (executando()) {
    <po-loading-overlay [p-screen-lock]="true" [p-text]="textoAcao()" />
  }
</po-page-default>
```

## `monitor.component.scss`

```scss
// Monitor de Lotes: dois paineis (lista de Lotes | detalhe); cores so por variaveis do tema PO-UI
.tpd-monitor {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.tpd-painel {
  min-width: 0;
  background-color: var(--color-neutral-light-00);
  border: 1px solid var(--color-neutral-light-20);
  border-radius: var(--border-radius-md, 4px);
  padding: 8px;
}

.tpd-painel-lista {
  flex: 0 0 38%;
  display: flex;
  flex-direction: column;
}

.tpd-painel-detalhe {
  flex: 1 1 0;
  padding: 16px;
}

// bolinha do status (classe po-<token> do tema da a cor de fundo)
.tpd-bolinha,
.tpd-bolinha-opcao,
.tpd-bolinha-sel {
  display: inline-block;
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;

  // sem cor (Todos) e cores claras (BR_BRANCO): contorno para aparecer no fundo branco
  &.tpd-sem-cor,
  &.tpd-bolinha-clara {
    border: 1px solid var(--color-neutral-dark-70);
  }
}

// combo de status: bolinha da legenda em cada opcao e sobreposta no campo para o status escolhido
.tpd-opcao-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tpd-status-sel {
  position: relative;

  .tpd-bolinha-sel {
    position: absolute;
    // coluna do grid tem 8px de recuo; o input do po-combo tem 44px de altura
    left: 22px;
    bottom: 24px;
    pointer-events: none;
  }

  &.tpd-com-bolinha ::ng-deep input {
    padding-left: 34px;
  }
}

.tpd-lista {
  display: flex;
  flex-direction: column;
  max-height: 52vh;
  overflow-y: auto;
  border-top: 1px solid var(--color-neutral-light-20);
}

.tpd-lote {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  border: 0;
  border-bottom: 1px solid var(--color-neutral-light-20);
  border-left: 3px solid transparent;
  background: transparent;
  color: var(--color-neutral-dark-80);
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: var(--color-neutral-light-05);
  }

  &:focus-visible {
    outline: 2px solid var(--color-brand-01-base);
    outline-offset: -2px;
  }

  &.tpd-lote-sel {
    background-color: var(--color-brand-01-lightest);
    border-left-color: var(--color-brand-01-base);
  }
}

.tpd-lote-texto {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}

.tpd-lote-numero {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpd-lote-sub {
  color: var(--color-neutral-dark-70);
  font-size: 0.875em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tpd-lote-valor {
  flex: none;
  font-weight: 600;
  white-space: nowrap;
}

.tpd-lista-rodape {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.tpd-contagem,
.tpd-dica {
  color: var(--color-neutral-dark-70);
  font-size: 0.875em;
}

.tpd-legenda {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 0;
  padding: 8px 0 0;
  list-style: none;
  border-top: 1px solid var(--color-neutral-light-20);
  font-size: 0.875em;
  color: var(--color-neutral-dark-80);

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}

.tpd-vazio {
  margin: 0;
  padding: 16px 8px;
  color: var(--color-neutral-dark-70);
}

.tpd-vazio-detalhe {
  padding: 48px 16px;
  text-align: center;
}

.tpd-aviso-erro {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border: 1px solid var(--color-feedback-negative-base);
  border-left-width: 4px;
  border-radius: var(--border-radius-md, 4px);
  background-color: var(--color-feedback-negative-lightest);
  color: var(--color-feedback-negative-darkest);
}

.tpd-aviso-icone {
  font-size: 24px;
  color: var(--color-feedback-negative-base);
}

.tpd-log {
  margin: 4px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.tpd-cartao {
  margin-bottom: 16px;
}

.tpd-cartao-titulo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--color-neutral-light-20);
  font-size: 1.125rem;
}

.tpd-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
}

.tpd-campos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px 16px;
  margin: 0;

  dt {
    color: var(--color-neutral-dark-70);
    font-size: 0.875em;
  }

  dd {
    margin: 2px 0 0;
    color: var(--color-neutral-dark-90);
    word-break: break-word;
  }
}

// telas estreitas: os paineis empilham
@media (max-width: 799px) {
  .tpd-monitor {
    flex-direction: column;
    align-items: stretch;
  }

  .tpd-painel-lista {
    flex-basis: auto;
  }

  .tpd-lista {
    max-height: 40vh;
  }
}
```

## `monitor.component.spec.ts` — Karma (gerar junto)

```typescript
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { PoDialogConfirmOptions, PoDialogService, PoNotificationService } from '@po-ui/ng-components';
import { LOTE_LEGENDA } from '../lote-status';
import { Subject } from 'rxjs';
import { AcaoRetorno, LoteDetalhe } from '../lote.models';
import { LoteAcoesService } from '../services/lote-acoes.service';
import { LoteService } from '../services/lote.service';
import { fakeLoteApi } from '../testing/fake-lote-api';
import {
  FIXTURES,
  LOG_ERRO_EVENTO,
  LOG_ERRO_LOTE,
  LOTE_BAIXADO,
  LOTE_ERRO,
  LOTE_EVENTO_ERRO,
  LOTE_LIBERADO,
} from '../testing/lote-fixtures';
import { MonitorComponent } from './monitor.component';

registerLocaleData(localePt, 'pt-BR');

describe('MonitorComponent', () => {
  let fixture: ComponentFixture<MonitorComponent>;
  let comp: MonitorComponent;
  let el: HTMLElement;
  let confirmar: jasmine.Spy;
  let notif: { success: jasmine.Spy; warning: jasmine.Spy; error: jasmine.Spy };

  const lote = (num: string) => comp.lotes().find((l) => l.lote === num)!;
  const itensDom = () => Array.from(el.querySelectorAll<HTMLElement>('.tpd-lote'));
  const acao = (label: string) => comp.acoes().find((a) => a.label === label)!;
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const selecionar = async (num: string) => {
    comp.selecionar(lote(num));
    await render();
  };

  async function criar(tamanhoPagina = 20): Promise<void> {
    fixture = TestBed.createComponent(MonitorComponent);
    comp = fixture.componentInstance;
    comp.tamanhoPagina = tamanhoPagina;
    el = fixture.nativeElement as HTMLElement;
    // o PoDialogService vem do PoModule importado pelo componente standalone (injetor do componente, nao o raiz):
    // a confirmacao executa direto o "confirm" do po-dialog
    confirmar = spyOn(fixture.debugElement.injector.get(PoDialogService), 'confirm').and.callFake((o: PoDialogConfirmOptions) =>
      o.confirm(),
    );
    await render();
  }

  beforeEach(async () => {
    notif = {
      success: jasmine.createSpy('success'),
      warning: jasmine.createSpy('warning'),
      error: jasmine.createSpy('error'),
    };
    await TestBed.configureTestingModule({
      imports: [MonitorComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideHttpClient(withInterceptors([fakeLoteApi()])),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: PoNotificationService, useValue: notif },
      ],
    }).compileComponents();
  });

  describe('lista', () => {
    beforeEach(() => criar());

    it('carrega todos os Lotes e mostra a contagem', () => {
      expect(comp.lotes().length).toBe(FIXTURES.length);
      expect(itensDom().length).toBe(FIXTURES.length);
      expect(el.querySelector('.tpd-contagem')!.textContent).toContain(`${FIXTURES.length} de ${FIXTURES.length} Lotes`);
      expect(comp.temMais()).toBeFalse();
    });

    it('item compacto: bolinha com tooltip do status, Lote em negrito, TIPO · ID · emissao e valor', () => {
      const item = itensDom()[2];
      expect(item.querySelector('.tpd-lote-numero')!.textContent!.trim()).toBe(LOTE_EVENTO_ERRO);
      expect(item.querySelector('.tpd-lote-sub')!.textContent!.trim()).toBe('COM · ID 000000003 · 05/10/2026');
      expect(item.querySelector('.tpd-lote-valor')!.textContent!.replace(/\s/g, ' ').trim()).toBe('R$ 2.500,50');
      const bolinha = item.querySelector('.tpd-bolinha')!;
      expect(bolinha.classList).toContain('po-caption-tag-28');
      expect(bolinha.getAttribute('aria-label')).toBe('Título gerado');
    });

    it('legenda das 9 cores no rodape da lista (branco com contorno)', () => {
      const itens = Array.from(el.querySelectorAll('.tpd-legenda li'));
      expect(itens.map((i) => i.textContent!.trim())).toEqual(LOTE_LEGENDA.map((s) => s.label));
      expect(itens[6].querySelector('.tpd-bolinha')!.classList).toContain('tpd-bolinha-clara');
    });

    it('painel direito vazio sem Lote selecionado; acoes desabilitadas', () => {
      expect(el.querySelector('.tpd-painel-detalhe')!.textContent).toContain('Selecione um Lote na lista para ver os detalhes.');
      expect(acao('Processar agora').disabled).toBeTrue();
      expect(acao('Reprocessar').disabled).toBeTrue();
    });

    it('Reprocessar e a acao primaria (primeira)', () => {
      expect(comp.acoes()[0].label).toBe('Reprocessar');
    });
  });

  describe('filtros', () => {
    beforeEach(() => criar());

    it('opcoes do status: Todos sem cor + 9 status com a cor da legenda, sem o codigo no label', () => {
      expect(comp.statusOptions[0]).toEqual(jasmine.objectContaining({ value: 'T', label: 'Todos', color: '' }));
      LOTE_LEGENDA.forEach((s) =>
        expect(comp.statusOptions.find((o) => o.value === s.value)).toEqual(
          jasmine.objectContaining({ label: s.label, color: s.color }),
        ),
      );
      comp.statusOptions.forEach((o) => expect(o.label).not.toMatch(/\d{2}|ER/));
    });

    it('filtro de status no cliente; Todos volta tudo', async () => {
      comp.filtrarStatus('ER');
      await render();
      expect(itensDom().map((i) => i.querySelector('.tpd-lote-numero')!.textContent!.trim())).toEqual([LOTE_ERRO]);
      comp.filtrarStatus('T');
      await render();
      expect(itensDom().length).toBe(FIXTURES.length);
    });

    it('bolinha do status escolhido aparece no campo', async () => {
      const bolinha = () => el.querySelector('.tpd-status-sel .tpd-bolinha-sel');
      expect(bolinha()).toBeNull();
      comp.filtrarStatus('ER');
      await render();
      expect(bolinha()!.classList).toContain('po-color-07');
      expect(el.querySelector('.tpd-status-sel')!.classList).toContain('tpd-com-bolinha');
    });

    it('filtro de tipo e combinado com status', async () => {
      comp.filtrarTipo('COM');
      await render();
      expect(comp.lotesVisiveis().map((l) => l.lote)).toEqual([LOTE_ERRO, LOTE_EVENTO_ERRO]);
      comp.filtrarStatus('04');
      await render();
      expect(comp.lotesVisiveis().map((l) => l.lote)).toEqual([LOTE_EVENTO_ERRO]);
      expect(el.querySelector('.tpd-dica')).not.toBeNull();
      comp.filtrarTipo(null);
      comp.filtrarStatus('');
      expect(comp.lotesVisiveis().length).toBe(FIXTURES.length);
    });

    it('nenhum Lote no filtro: mensagem de vazio', async () => {
      comp.filtrarStatus('02');
      await render();
      expect(el.querySelector('.tpd-lista .tpd-vazio')!.textContent).toContain('Nenhum Lote encontrado.');
    });

    it('Pesquisar vai ao servidor (SEARCH) com debounce', fakeAsync(() => {
      comp.pesquisar('000000003');
      tick(100);
      expect(comp.lotes().length).toBe(FIXTURES.length);
      tick(400);
      expect(comp.lotes().map((l) => l.lote)).toEqual([LOTE_EVENTO_ERRO]);
      expect(comp.total()).toBe(1);
    }));
  });

  describe('paginacao', () => {
    it('Carregar mais acumula a proxima pagina (STARTINDEX)', async () => {
      await criar(2);
      expect(comp.lotes().length).toBe(2);
      expect(comp.temMais()).toBeTrue();
      const botao = el.querySelector('.tpd-lista-rodape po-button');
      expect(botao).not.toBeNull();
      comp.carregarMais();
      await render();
      comp.carregarMais();
      await render();
      expect(comp.lotes().map((l) => l.lote)).toEqual(FIXTURES.map((f) => f.z10['ZA1_LOTE']));
      expect(comp.temMais()).toBeFalse();
    });
  });

  describe('selecao e detalhe', () => {
    beforeEach(() => criar());

    it('clique no item seleciona, destaca e carrega o detalhe', async () => {
      itensDom()[3].click();
      await render();
      expect(comp.selecionadoPk()).toBe(lote(LOTE_BAIXADO).pk);
      expect(itensDom()[3].classList).toContain('tpd-lote-sel');
      expect(itensDom().filter((i) => i.classList.contains('tpd-lote-sel')).length).toBe(1);
      const d = comp.detalhe()!;
      expect(d.lote).toBe(LOTE_BAIXADO);
      const campo = (label: string) => comp.campos().find((c) => c.label === label)!.value;
      expect(campo('CNPJ')).toBe('11.222.333/0001-81');
      expect(campo('Tipo')).toBe('NOR - Normal');
      expect(campo('Cliente/Loja')).toBe('CLI001/01');
      expect(campo('Emissão')).toBe('05/10/2026');
      expect(campo('Nota (série/doc)')).toBe('1/000000456');
      expect(campo('Título')).toBe('1/000000456//NF');
      expect(campo('Valor baixado').replace(/\s/g, ' ')).toBe('R$ 1.000,00');
      expect(campo('Data/hora processamento')).toBe('06/10/2026 08:00');
      const titulo = el.querySelector('.tpd-cartao-titulo')!;
      expect(titulo.textContent).toContain('Baixado');
      expect(titulo.querySelector('.tpd-bolinha')!.classList).toContain('po-caption-tag-35');
      expect(el.querySelector('.tpd-aviso-erro')).toBeNull();
    });

    it('abas Eventos (n) e Itens (n)', async () => {
      await selecionar(LOTE_EVENTO_ERRO);
      const abas = el.querySelector('po-tabs')!.textContent!;
      expect(abas).toContain('Eventos (2)');
      expect(abas).toContain('Itens (1)');
    });

    it('eventos: status nativo (subtitle), situacao, nome do evento e log de erro em vermelho', async () => {
      await selecionar(LOTE_EVENTO_ERRO);
      const ev = comp.eventosLinhas();
      expect(ev.map((e) => [e.status, e.situacao, e.evento])).toEqual([
        ['2', 'Processado', 'Rateio'],
        ['E', 'Erro', 'Baixa Normal'],
      ]);
      expect(ev[1].logErro).toBe(LOG_ERRO_EVENTO);
      expect(comp.colunasEventos[0].type).toBe('subtitle');
      expect(comp.colunasEventos.find((c) => c.property === 'logErro')!.color).toBe('color-07');
    });

    it('Lote com ZA1_LOGERR mostra o aviso de erro em destaque', async () => {
      await selecionar(LOTE_ERRO);
      const aviso = el.querySelector('.tpd-aviso-erro')!;
      expect(aviso.getAttribute('role')).toBe('alert');
      expect(aviso.textContent).toContain(LOG_ERRO_LOTE);
    });
  });

  describe('acoes', () => {
    beforeEach(() => criar());

    it('Processar agora habilita com Lote selecionado; Reprocessar nao (Lote sem erro)', async () => {
      await selecionar(LOTE_LIBERADO);
      expect(acao('Processar agora').disabled).toBeFalse();
      expect(acao('Reprocessar').disabled).toBeTrue();
    });

    it('Reprocessar habilita com Lote ER', async () => {
      await selecionar(LOTE_ERRO);
      expect(acao('Reprocessar').disabled).toBeFalse();
    });

    it('Reprocessar habilita com evento em erro (Lote sem ER)', async () => {
      await selecionar(LOTE_EVENTO_ERRO);
      expect(comp.detalhe()!.status).toBe('04');
      expect(acao('Reprocessar').disabled).toBeFalse();
    });

    it('Reprocessar confirma, chama a API, notifica e recarrega o Lote e a linha da lista', async () => {
      const spy = spyOn(TestBed.inject(LoteAcoesService), 'reprocessar').and.callThrough();
      await selecionar(LOTE_ERRO);
      acao('Reprocessar').action!();
      await render();
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(confirmar.calls.mostRecent().args[0].message).toContain(LOTE_ERRO);
      expect(spy).toHaveBeenCalledOnceWith(LOTE_ERRO);
      expect(notif.success).toHaveBeenCalledWith('Lote liberado para reprocessamento.');
      expect(comp.detalhe()!.status).toBe('01');
      expect(comp.detalhe()!.logErro).toBe('');
      expect(lote(LOTE_ERRO).status).toBe('01');
      expect(acao('Reprocessar').disabled).toBeTrue();
      expect(el.querySelector('.tpd-aviso-erro')).toBeNull();
    });

    it('Reprocessar de evento em erro volta o evento para pendente', async () => {
      await selecionar(LOTE_EVENTO_ERRO);
      comp.confirmarReprocessar();
      await render();
      expect(comp.eventosLinhas().map((e) => e.status)).toEqual(['2', '1']);
    });

    it('Processar agora confirma, chama a API e atualiza status no detalhe e na lista', async () => {
      const spy = spyOn(TestBed.inject(LoteAcoesService), 'processar').and.callThrough();
      await selecionar(LOTE_LIBERADO);
      acao('Processar agora').action!();
      await render();
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledOnceWith(LOTE_LIBERADO);
      expect(notif.success).toHaveBeenCalledWith('Processamento do Lote concluido.');
      expect(comp.detalhe()!.status).toBe('03');
      expect(lote(LOTE_LIBERADO).status).toBe('03');
      expect(itensDom()[0].querySelector('.tpd-bolinha')!.classList).toContain('po-color-02');
    });

    it('sem confirmar nao chama a API', async () => {
      confirmar.and.stub();
      const spy = spyOn(TestBed.inject(LoteAcoesService), 'processar').and.callThrough();
      await selecionar(LOTE_LIBERADO);
      comp.confirmarProcessar();
      expect(spy).not.toHaveBeenCalled();
    });

    it('Reprocessar sem erro nao abre a confirmacao', async () => {
      await selecionar(LOTE_BAIXADO);
      comp.confirmarReprocessar();
      expect(confirmar).not.toHaveBeenCalled();
    });

    it('erro da API (404 ERR-404) vai para a notificacao de erro', async () => {
      await selecionar(LOTE_LIBERADO);
      // Lote apagado entre a consulta e a acao
      comp.detalhe.set({ ...comp.detalhe()!, lote: 'INEXISTENTE' });
      comp.confirmarProcessar();
      await render();
      expect(notif.error).toHaveBeenCalledWith('Lote nao encontrado.');
      expect(comp.executando()).toBeFalse();
    });
  });

  describe('carregando sem piscar', () => {
    const overlays = () => Array.from(el.querySelectorAll('po-loading-overlay'));

    it('troca de Lote nao mostra o overlay e mantem o detalhe anterior ate o novo chegar', async () => {
      await criar();
      await selecionar(LOTE_LIBERADO);
      const pendente = new Subject<LoteDetalhe>();
      spyOn(TestBed.inject(LoteService), 'get').and.returnValue(pendente);
      await selecionar(LOTE_BAIXADO);
      expect(comp.carregandoDetalhe()).toBeTrue();
      expect(overlays().length).toBe(0);
      expect(comp.detalhe()!.lote).toBe(LOTE_LIBERADO);
      // detalhe ainda e o do Lote anterior: acoes bloqueadas para nao agir no Lote errado
      expect(acao('Processar agora').disabled).toBeTrue();
      expect(acao('Reprocessar').disabled).toBeTrue();
      pendente.complete();
    });

    it('acao trava a tela com a mensagem do que esta sendo feito ate o Protheus responder', async () => {
      await criar();
      await selecionar(LOTE_LIBERADO);
      const pendente = new Subject<AcaoRetorno>();
      spyOn(TestBed.inject(LoteAcoesService), 'processar').and.returnValue(pendente);
      acao('Processar agora').action!();
      await render();
      const ov = el.querySelector('po-loading-overlay')!;
      expect(ov).toBeTruthy();
      expect(ov.textContent).toContain(`Processando o Lote ${LOTE_LIBERADO}...`);
      pendente.next({ lote: LOTE_LIBERADO, mensagem: 'ok', status: '03', statusDescricao: 'Faturado' });
      pendente.complete();
      await render();
      expect(comp.executando()).toBeFalse();
      expect(overlays().length).toBe(0);
    });

    it('Reprocessar mostra "Reprocessando o Lote"', async () => {
      await criar();
      await selecionar(LOTE_ERRO);
      const pendente = new Subject<AcaoRetorno>();
      spyOn(TestBed.inject(LoteAcoesService), 'reprocessar').and.returnValue(pendente);
      acao('Reprocessar').action!();
      await render();
      expect(el.querySelector('po-loading-overlay')!.textContent).toContain(`Reprocessando o Lote ${LOTE_ERRO}...`);
      pendente.complete();
    });
  });
});
```

## `src/app/<modulo>/testing/lote-fixtures.ts` — registros de exemplo (lista e detalhe com grades)

```typescript
// Lotes de teste no formato do Protheus (campos ZA1/ZA2/ZA3 em texto), so para os testes Karma.

export type Registro = Record<string, string>;

export interface LoteFixture {
  z10: Registro;
  z11: Registro[];
  z12: Registro[];
}

/** Chave do FWRestModel: base64 de filial + Lote (como o servidor devolve). */
export function pkDe(lote: string): string {
  return btoa(`01${lote}`);
}

function z10(lote: string, idRem: string, status: string, tpFat: string, extra: Registro = {}): Registro {
  return {
    ZA1_FILIAL: '01',
    ZA1_IDREM: idRem,
    ZA1_LOTE: lote,
    ZA1_CNPJ: '11222333000181',
    ZA1_CLIENT: 'CLI001',
    ZA1_LOJA: '01',
    ZA1_DTHINT: '202610051230',
    ZA1_DTFAT: '20261005',
    ZA1_VENCTO: '20261105',
    ZA1_CONDPG: '001',
    ZA1_CCUSTO: '10002',
    ZA1_NATURE: '182',
    ZA1_VALOR: '1000.00',
    ZA1_VLBAIX: '0',
    ZA1_STATUS: status,
    ZA1_TPFAT: tpFat,
    ZA1_TPTIT: '',
    ZA1_COMPET: '',
    ZA1_OBSERV: '',
    ZA1_PEDIDO: '',
    ZA1_SERIE: '',
    ZA1_DOC: '',
    ZA1_DTEMIS: '',
    ZA1_CODNFE: '',
    ZA1_PREFIX: '',
    ZA1_NUM: '',
    ZA1_PARCEL: '',
    ZA1_TIPO: '',
    ZA1_DTHPRO: '',
    ZA1_LOGERR: '',
    ...extra,
  };
}

function item(lote: string, it: string, quant: string, unit: string): Registro {
  return {
    ZA2_LOTE: lote,
    ZA2_ITEM: it,
    ZA2_PRODUT: 'SERV01',
    ZA2_DTHR: '202610051200',
    ZA2_QUANT: quant,
    ZA2_VLUNIT: unit,
    ZA2_VLTOT: (Number(quant) * Number(unit)).toFixed(2),
    ZA2_TES: '701',
    ZA2_COMPET: '',
  };
}

function evento(lote: string, ev: string, seq: string, valor: string, status: string, log = ''): Registro {
  return {
    ZA3_LOTE: lote,
    ZA3_EVENTO: ev,
    ZA3_SEQ: seq,
    ZA3_CCUSTO: '10002',
    ZA3_NATURE: '182',
    ZA3_VALOR: valor,
    ZA3_DTHR: '202610101000',
    ZA3_DTBAIX: ev === '2' ? '20261010' : '',
    ZA3_STATUS: status,
    ZA3_TITCOM: '',
    ZA3_DTHPRO: status === '2' ? '20261010101500' : '',
    ZA3_LOGERR: log,
  };
}

export const LOTE_LIBERADO = 'HV0000000001PAD0';
export const LOTE_ERRO = 'HV0000000002PAD0';
export const LOTE_EVENTO_ERRO = 'HV0000000003PAD0';
export const LOTE_BAIXADO = 'HV0000000004PAD0';
export const LOTE_SOLCAN = 'HV0000000005PAD0';

export const LOG_ERRO_LOTE = 'Falha ao gerar o pedido: TES 999 inexistente.';
export const LOG_ERRO_EVENTO = 'Centro de custo 99999 bloqueado.';

export const FIXTURES: LoteFixture[] = [
  {
    z10: z10(LOTE_LIBERADO, '000000001', '01', 'NOR'),
    z11: [item(LOTE_LIBERADO, '001', '2.00', '300.00'), item(LOTE_LIBERADO, '002', '1.00', '400.00')],
    z12: [],
  },
  {
    z10: z10(LOTE_ERRO, '000000002', 'ER', 'COM', { ZA1_LOGERR: LOG_ERRO_LOTE, ZA1_DTHPRO: '20261005130000' }),
    z11: [item(LOTE_ERRO, '001', '1.00', '1000.00')],
    z12: [],
  },
  {
    z10: z10(LOTE_EVENTO_ERRO, '000000003', '04', 'COM', {
      ZA1_VALOR: '2500.50',
      ZA1_PREFIX: 'PRF',
      ZA1_NUM: '000000123',
      ZA1_PARCEL: '',
      ZA1_TIPO: 'NF',
      ZA1_TPTIT: 'NF',
    }),
    z11: [item(LOTE_EVENTO_ERRO, '001', '1.00', '2500.50')],
    z12: [
      evento(LOTE_EVENTO_ERRO, '1', '001', '2500.50', '2'),
      evento(LOTE_EVENTO_ERRO, '2', '001', '500.00', 'E', LOG_ERRO_EVENTO),
    ],
  },
  {
    z10: z10(LOTE_BAIXADO, '000000004', '06', 'NOR', {
      ZA1_VLBAIX: '1000.00',
      ZA1_PEDIDO: '000321',
      ZA1_SERIE: '1',
      ZA1_DOC: '000000456',
      ZA1_CODNFE: 'ABCD1234',
      ZA1_PREFIX: '1',
      ZA1_NUM: '000000456',
      ZA1_PARCEL: '',
      ZA1_TIPO: 'NF',
      ZA1_DTHPRO: '20261006080000',
    }),
    z11: [item(LOTE_BAIXADO, '001', '1.00', '1000.00')],
    z12: [evento(LOTE_BAIXADO, '2', '001', '1000.00', '2')],
  },
  {
    z10: z10(LOTE_SOLCAN, '000000005', '07', 'NOR', { ZA1_CNPJ: '99888777000166' }),
    z11: [],
    z12: [],
  },
];
```

## `src/app/<modulo>/testing/fake-lote-api.ts` — fake do FWRestModel e das ações (`HttpInterceptorFn`)

```typescript
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { LOTE_API, LOTE_FWMODEL } from '../lote.models';
import { FIXTURES, LoteFixture, Registro, pkDe } from './lote-fixtures';

/** Campos do FIELDS no formato do FWRestModel; na lista, so os preenchidos (como no servidor). */
function campos(r: Registro, soPreenchidos: boolean) {
  return Object.entries(r)
    .filter(([, v]) => !soPreenchidos || v !== '')
    .map(([id, v], i) => (v === '' ? { id, order: i + 1 } : { id, order: i + 1, value: v }));
}

function grade(id: string, linhas: Registro[]) {
  const base = { id, modeltype: 'GRID', optional: 1, struct: [] as { id: string; order: number }[] };
  if (!linhas.length) return base; // grade vazia vem sem "items"
  return {
    ...base,
    items: linhas.map((l, i) => ({ id: i + 1, deleted: 0, fields: Object.entries(l).map(([fid, value]) => ({ id: fid, value })) })),
  };
}

/**
 * APIs da integracao simuladas em memoria, so para os testes de componente (Karma):
 * GET /fwmodel/lotes (COUNT/STARTINDEX/SEARCH), GET /fwmodel/lotes/{pk} e
 * POST /lotesapi/lote/{lote}/processar|reprocessar.
 */
export function fakeLoteApi(): HttpInterceptorFn {
  const lotes: LoteFixture[] = FIXTURES.map((f) => ({
    z10: { ...f.z10 },
    z11: f.z11.map((x) => ({ ...x })),
    z12: f.z12.map((x) => ({ ...x })),
  }));

  const ok = <T>(body: T): Observable<HttpResponse<T>> => of(new HttpResponse({ body, status: 200 }));
  const naoEncontrado = (lote: string) =>
    throwError(
      () =>
        new HttpErrorResponse({
          status: 404,
          error: { lote, erros: [{ codigo: 'ERR-404', campo: 'lote', mensagem: 'Lote nao encontrado.' }] },
        }),
    );
  const recurso = (f: LoteFixture, completo: boolean) => {
    const master = { id: 'ZA1MASTER', modeltype: 'FIELDS', fields: campos(f.z10, !completo) };
    return {
      id: '<MODEL_ID>',
      operation: 1,
      pk: pkDe(f.z10['ZA1_LOTE']),
      models: [completo ? { ...master, models: [grade('ZA2DETAIL', f.z11), grade('ZA3DETAIL', f.z12)] } : master],
    };
  };
  const desc: Record<string, string> = { '01': 'Liberado', '03': 'Faturado', '04': 'Titulo gerado' };

  return (req, next) => {
    let x: RegExpMatchArray | null;
    if (req.method === 'GET' && req.url === LOTE_FWMODEL) {
      const count = Number(req.params.get('COUNT')) || 20;
      const start = Number(req.params.get('STARTINDEX')) || 1;
      const busca = (req.params.get('SEARCH') ?? '').toUpperCase();
      const achados = lotes.filter(
        (f) => !busca || ['ZA1_LOTE', 'ZA1_IDREM', 'ZA1_CNPJ'].some((c) => f.z10[c].toUpperCase().includes(busca)),
      );
      const pagina = achados.slice(start - 1, start - 1 + count);
      return ok({ total: achados.length, count: pagina.length, startindex: start, resources: pagina.map((f) => recurso(f, false)) });
    }
    if (req.method === 'GET' && (x = req.url.match(/^\/fwmodel\/lotes\/(.+)$/))) {
      const f = lotes.find((l) => pkDe(l.z10['ZA1_LOTE']) === x![1]);
      if (!f) return throwError(() => new HttpErrorResponse({ status: 404, error: { errorMessage: 'Registro nao encontrado' } }));
      return ok(recurso(f, req.params.get('FIELDEMPTY') === 'true'));
    }
    if (req.method === 'POST' && req.url.startsWith(LOTE_API) && (x = req.url.match(/\/lote\/([^/]+)\/(processar|reprocessar)$/))) {
      const lote = decodeURIComponent(x[1]);
      const f = lotes.find((l) => l.z10['ZA1_LOTE'] === lote);
      if (!f) return naoEncontrado(lote);
      if (x[2] === 'reprocessar') {
        const temErro = f.z10['ZA1_STATUS'] === 'ER' || f.z12.some((e) => e['ZA3_STATUS'] === 'E');
        if (temErro) {
          if (f.z10['ZA1_STATUS'] === 'ER') f.z10['ZA1_STATUS'] = '01';
          f.z10['ZA1_LOGERR'] = '';
          f.z12.forEach((e) => {
            if (e['ZA3_STATUS'] === 'E') {
              e['ZA3_STATUS'] = '1';
              e['ZA3_LOGERR'] = '';
            }
          });
        }
        const st = f.z10['ZA1_STATUS'];
        return ok({
          lote,
          mensagem: temErro ? 'Lote liberado para reprocessamento.' : 'Lote sem erro para reprocessar.',
          status: st,
          statusDescricao: desc[st] ?? st,
        });
      }
      if (f.z10['ZA1_STATUS'] === '01') f.z10['ZA1_STATUS'] = f.z10['ZA1_TPFAT'] === 'COM' ? '04' : '03';
      const st = f.z10['ZA1_STATUS'];
      return ok({ lote, mensagem: 'Processamento do Lote concluido.', status: st, statusDescricao: desc[st] ?? st });
    }
    return next(req);
  };
}
```
