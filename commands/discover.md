---
description: Discover and analyze a Protheus REST endpoint or source file — auto-detects fields, types and generates a ready-to-use /generate manifest
allowed-tools: Read, Glob, Grep, Bash, PowerShell, AskUserQuestion
argument-hint: "<endpoint-path | source-file> [--suggest-batch]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:discover

Analisa um endpoint REST Protheus **ou** um arquivo fonte `.prw`/`.tlpp` e gera automaticamente:

- Lista de campos com tipos detectados
- Sugestão de tipo `/generate` ideal
- Manifesto pronto para copiar e colar no `/generate` ou `/generate-batch`

## Exemplos

```bash
# Modo endpoint — chama o GET e inspeciona a resposta
/poui-specialist:discover /api/custom/v1/pedidos
/poui-specialist:discover /api/custom/v1/parceiros/000001/01

# Modo fonte — lê o .prw/.tlpp e extrai campos, DTOs e ações
/poui-specialist:discover src/fixtures/ORCA001.prw
/poui-specialist:discover src/fixtures/FatServ.tlpp

# Flag --suggest-batch — além do manifest individual, sugere bloco /generate-batch
/poui-specialist:discover /api/custom/v1/pedidos --suggest-batch
```

---

## Passo 1 — Detectar modo de operação

Analisar o argumento fornecido:

| Condição | Modo |
|----------|------|
| Inicia com `/` (ex: `/api/custom/v1/pedidos`) | **Endpoint** |
| Termina com `.prw`, `.tlpp`, `.prx` | **Fonte** |
| Contém `://` | **URL completa** — usar como-está (pular proxy) |

Se nenhuma condição for atendida, perguntar ao usuário qual modo deseja.

Extrair o nome da entidade:
- Endpoint: último segmento do path sem parâmetros (`/pedidos` → `Pedidos`)
- Fonte: nome do arquivo sem extensão (`ORCA001.prw` → `Orca001`)

---

## Passo 2A — Modo Endpoint: descoberta via HTTP

### 2A.1 — Determinar base URL

Verificar se existe `proxy.conf.json` no diretório de trabalho:

```powershell
$proxyPath = "proxy.conf.json"
if (Test-Path $proxyPath) {
    Get-Content $proxyPath
} else {
    Write-Host "proxy.conf.json não encontrado"
}
```

- Se proxy existir e tiver `target`: usar como base URL (ex: `http://192.168.1.10:8086`)
- Se não existir: usar `http://localhost:8086` como padrão e avisar o usuário

### 2A.2 — Chamar o endpoint

Para endpoints de lista (sem parâmetros no path):
```powershell
$baseUrl = "<target-do-proxy>"
$endpoint = "<endpoint-path>"
$url = "$baseUrl/rest$endpoint`?pageSize=3&page=1"

try {
    $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 10
    $response.Content
} catch {
    Write-Host "ERRO: $_"
}
```

Para endpoints de detalhe (com `:id` ou parâmetros no path): chamar com o path literal.

**Se a requisição falhar:** informar o erro, exibir a URL tentada, e oferecer o **modo offline**:
```
⚠ Não foi possível conectar ao endpoint.
   URL tentada: http://localhost:8086/rest/api/custom/v1/pedidos?pageSize=3

Você pode fornecer um exemplo de resposta JSON manualmente.
Cole o JSON abaixo (ctrl+D para finalizar) ou responda com o JSON em uma mensagem.
```
Continuar com o JSON fornecido pelo usuário.

### 2A.3 — Analisar a resposta JSON

Determinar a forma da resposta:

| Estrutura detectada | Tipo de endpoint |
|--------------------|-----------------|
| `{ items: [...], hasNext: bool }` | Lista paginada |
| `{ items: [...] }` sem `hasNext` | Lista sem paginação |
| Array `[...]` direto | Lista (contrato não padrão) |
| Objeto simples `{ campo: valor }` | Detalhe / entidade única |

Para listas: usar `items[0]` (primeiro item) como amostra de campos.
Para detalhe: usar o objeto diretamente.

**Detecção de tipo por valor:**

| Valor de exemplo | Tipo detectado | Tipo PoTableColumn |
|-----------------|---------------|-------------------|
| `1500.00`, `99.9` (número com decimal) | `currency` | `currency` (format: 'BRL') |
| `10`, `42` (inteiro) | `number` | `number` |
| `true`, `false` | `boolean` | `boolean` |
| `"2026-01-15"`, `"15/01/2026"` (padrão de data) | `date` | `date` |
| `"14:30:00"` | `time` | `time` |
| String com comprimento ≤ 30 | `string` | `string` |
| String com comprimento > 30 | `description` | `string` (textarea no form) |
| Array `[...]` | `array` | ⚠ mapear campo a campo |

### 2A.4 — Validar contra campos padrão Protheus (opcional)

Os tipos acima vêm só do *shape* do JSON. Se a tabela Protheus por trás do endpoint for uma das
cobertas pela referência estática embutida em
`skills/poui-patterns/protheus-standard-fields.md` (SA1, SA2, SB1, SC5, SC6, SE1, SE2), oferecer
confirmar tamanho/decimais/obrigatoriedade reais dos campos **padrão**, sem depender de nenhum
outro plugin instalado:

```
Deseja validar os campos contra a referência de campos padrão Protheus? (SA1, SA2, SB1, SC5, SC6, SE1, SE2)
Informe o alias da tabela (ex: SA1) ou Enter para pular: >
```

Se o usuário pular ou a tabela não estiver coberta, seguir para o Passo 3 sem alterações.

Se coberta: ler `skills/poui-patterns/protheus-standard-fields.md` e casar cada campo do JSON
(case-insensitive, ignorando prefixo de tabela e underscore — ex: `A1_NOME` casa com `nome`) com
uma linha da tabela padrão correspondente:

- Tamanho → anotar como restrição de tamanho no relatório (Passo 4) e no manifesto `--suggest-batch`
- Obrigatório = `S` → marcar como obrigatório mesmo que a heurística de valor não tenha marcado
- Decimal > 0 → confirmar tipo `currency`/`number` com N casas decimais
- Tipo `D` (Data) → confirmar tipo `date` já detectado

Campos do JSON **sem correspondência** na referência (prováveis customizados `X_*`): adicionar
em "Campos que precisam de atenção manual" (Passo 4): `<campo>: não encontrado na referência
padrão — provável campo customizado, confirme tamanho/obrigatoriedade manualmente no Protheus`.

> Esta referência cobre só campos padrão de fábrica — nunca inventa tamanho para campo
> customizado, sinaliza como desconhecido em vez de adivinhar.

---

## Passo 2B — Modo Fonte: descoberta via arquivo .prw/.tlpp

### 2B.1 — Ler o arquivo

```
Read("<caminho-do-arquivo>")
```

### 2B.2 — Extrair informações

**Endpoint e métodos HTTP** (WsRestFul):
```
// Grep para: @path, @get, @post, @put, @delete, @wsrestful
Padrão: @path\s*\(\s*["']([^"']+)["']
```

**Campos no payload/response** — em ordem de prioridade:

1. `oResp:SetJsonItem("campo", ...)` ou `oJSON:Put("campo", ...)`
2. `oJSON:GetJsonItem("campo")` ou `oJSON:Get("campo")`  
3. Propriedades de classe DTO com tipo (`cCodigo As Character`, `nValor As Numeric`)
4. Variáveis locais com prefixo ADVPL:
   - `c` → `string`
   - `n` → `number`
   - `d` → `date`
   - `l` → `boolean`
   - `a` → array (ignorar ou mapear)

**Labels** — buscar em `X3_TITULO` de campos próximos, ou derivar do nome do campo:
- `cNomCli` → "Nome Cliente"
- `dEmissao` → "Emissão"
- `nValTot` → "Valor Total"

**Ações** — buscar por `@delete`, `@post` com path diferente, ou funções como `ExecRotina`, `MsExecAuto`.

---

## Passo 3 — Detectar tipo de /generate sugerido

Aplicar as regras:

| Condição | Tipo sugerido |
|----------|--------------|
| Lista paginada com muitos campos (> 5) | `page-dynamic-search` |
| Lista paginada com poucos campos (≤ 5) | `page-list` |
| Campo hierárquico (`pai`, `parent`, `idPai`) detectado | `po-tree` |
| Objeto único sem lista paginada | `page-edit` ou `page-detail` |
| Endpoint tem POST + PUT + DELETE | `modal-crud` (se ≤ 10 campos) ou `page-edit` |
| Campos numéricos/monetários dominantes (> 60%) | `dashboard` |
| Campo de arquivo (`arquivo`, `anexo`, `fileName`, `file`) | adicionar variante `upload` |

---

## Passo 4 — Gerar relatório de descoberta

Exibir no formato abaixo:

```
📋 Discover: {{EntityName}} ({{endpoint-or-file}})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contrato detectado:
  • Tipo: {{Lista paginada | Entidade única | Hierarquia}}
  • Campos encontrados: N
  • Endpoint confirmado: {{url}}

Campos detectados:
| Propriedade    | Tipo        | Exemplo              | Label sugerido    |
|----------------|-------------|----------------------|-------------------|
| codigo         | string      | "000001"             | Código            |
| ...            | ...         | ...                  | ...               |

⚠ Campos que precisam de atenção manual:
  • status: valor "A" — provável código de domínio; adicionar p-labels com descrições legíveis
  • filial: string "01" — campo de contexto Protheus; considerar ocultar na tabela

Tipo sugerido: {{tipo}}
Razão: {{razão em 1 linha}}

─────────────────────────────────────────────────
Manifesto pronto — copie e cole no /generate:

/poui-specialist:generate {{tipo}} {{EntityName}} --module {{sugestão-de-módulo}}

CAMPOS_SUGERIDOS:
| propriedade | tipo     | label            | coluna | filtro |
|-------------|----------|------------------|--------|--------|
| ...         | ...      | ...              | ✓      | ✓      |
─────────────────────────────────────────────────
```

**Campos que precisam de atenção manual** — flagrar quando:
- Valor é um código de 1-2 chars (ex: `"A"`, `"B"`, `"01"`) → provavelmente domínio com label
- Campo termina com `cod`, `ident`, `chv` → chave; verificar se é composite key
- Campo é uma string de data em formato não-ISO → confirmar formato

---

## Passo 5 — Flag --suggest-batch (opcional)

Se `--suggest-batch` foi fornecido, adicionar ao final do relatório:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙ Manifesto para /generate-batch (lista + form + service):

/poui-specialist:generate-batch

MODULO: {{módulo-sugerido}}/{{kebab-entity}}
API_BASE: /rest{{base-path}}
PASTA_DESTINO: src/app/{{módulo-sugerido}}/{{kebab-entity}}

COMPONENTES:
| tipo                 | classe                    | endpoint       | campos          |
|----------------------|---------------------------|----------------|-----------------|
| page-dynamic-search  | {{Entity}}ListComponent   | {{endpoint}}   | {{campo1}}, ... |
| page-edit            | {{Entity}}EditComponent   | {{endpoint}}   | {{campo1}}, ... |
| service              | {{Entity}}Service         | {{endpoint}}   | —               |
| models               | {{Entity}}                | —              | —               |

REGRAS:
- {{regras detectadas: ex: Status: A=Aberto B=Baixado}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Passo 6 — Perguntar próximo passo

Após exibir o relatório:

```
Deseja gerar o componente agora?
  [1] Sim — iniciar /generate com o manifesto acima
  [2] Ajustar campos primeiro — edite o manifesto acima e envie como próxima mensagem
  [3] Não — apenas salvar o relatório (continuar mais tarde)
```

- Se **1**: Executar `/poui-specialist:generate` com os parâmetros detectados
- Se **2**: Aguardar nova mensagem com o manifesto ajustado pelo usuário, então executar
- Se **3**: Encerrar; o usuário pode copiar o manifesto quando quiser

---

## Notas para o agente

- **Não gerar código** neste comando — apenas analisar e reportar. A geração acontece em Passo 6 ou com o próximo comando do usuário.
- **Derivar `--module`** a partir do endpoint: `/api/custom/v1/compras/pedidos` → `compras` ; `/api/custom/v1/pedidos` → perguntar ao usuário se não for óbvio.
- **Labels**: converter camelCase/snake_case para texto legível (`nValTot` → "Valor Total", `cod_cli` → "Cód. Cliente").
- **Não expor credenciais** da resposta HTTP nos logs — remover campos como `token`, `senha`, `password`, `secret` do relatório.
- **Modo offline resiliente**: se o endpoint não responder, nunca falhar — oferecer cola manual de JSON.
