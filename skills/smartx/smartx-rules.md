# Regras Smart X — SX01 a SX11

Fonte única para o `/poui-specialist:lint` (seção "Fontes Protheus"), o `/poui-specialist:review`
(foco `smartx`) e o lint determinístico da extensão VS Code (`poui-vscode/src/smartxLintRules.ts`).
Ao mudar uma regra aqui, mudar nos três lugares — `scripts/test-plugin.js` confere que os IDs batem.

Escopo: arquivos `.prw`, `.prx`, `.tlpp`. Comentários (`//`, `/* */`) são ignorados. "Fonte com Smart X"
= o fonte chama `setSmartX` (função ou método).

| ID | Sev. | Quando dispara | Por quê (TDN) | Correção |
|----|------|----------------|---------------|----------|
| SX01 | ERROR | Fonte com Smart X: legenda com cor literal fora do de-para e sem cor PO-UI — `AddLegend(cond, "COR", ...)` sem o 6º parâmetro, ou item `aAdd(<array de legendas do mBrowse>, {cond, "COR", ...})` sem o 6º elemento | Exceção "Cor inválida para a legenda"; ícones não são aceitos | Informar `cColorPoUi` (`"caption-tag-NN"`) no 6º parâmetro/elemento ou usar cor do de-para |
| SX02 | WARNING | `addOnChange` com mais de um contexto no 1º array (`{"dataNew","dataEdit"}`) | Quebra o encapsulamento com o validator padrão (X3_VALID): o trigger não dispara | Uma chamada por contexto. Exceção: campo virtual sem X3_VALID |
| SX03 | ERROR | `addOnChange` com mais de um campo no 2º array | O framework exige exatamente 1 campo por evento | Um `addOnChange` por campo |
| SX04 | ERROR | `setEvents(` na Interface (`oInterface:setEvents`, ou qualquer `setEvents` em fonte com `@totvsFrameworkStructureInterface`) | Eventos só no Modelo; pela Interface dá erro | Mover para o Modelo (`addTriggers`/`addValidators`/`addInitializers`/`addEvents`) |
| SX05 | WARNING | `setSmartX` sem `hasSmartX()` no fonte | Ambiente sem os requisitos quebra a abertura | `If hasSmartX()` em volta do `setSmartX` |
| SX06 | WARNING | `hasSmartX`/`setSmartX` sem `#include "fwmbrowse.ch"` | A função depende do include atualizado | Incluir `fwmbrowse.ch` (versão atual dos includes de framework) |
| SX07 | WARNING | Fonte com Smart X: `SetFilterDefault`/`AddFilterSmartX` com literal que não começa com `@` | Smart X só aceita filtro SQL com `@`; expressão ADVPL para de funcionar | `"@ CAMPO = 'X'"` |
| SX08 | WARNING | Fonte com Smart X: `DbSetFilter` | Ignorado no browse convertido (nova query limpa) | Converter para filtro SQL (`SetFilterDefault("@ ...")`) |
| SX09 | INFO | `addValidators(` | Substitui o X3_VALID do campo — a validação do dicionário deixa de rodar | Conferir se a intenção era complementar (`addTriggers`) |
| SX10 | WARNING | Objeto `BuildAdvplAction` com `setAction(` encadeada e sem `setHasResponse(.T.)` | Sem resposta o frontend não recebe os dados para a ação seguinte | `oAct:setHasResponse(.T.)` e função retornando JSON em string |
| SX11 | ERROR | `setSmartX(` como **função** (não método) numa função que não chama `mBrowse(` | Precisa estar na mesma função/fonte do `mBrowse`; fora disso gera exceção | Mover para a função que chama o `mBrowse` |

## Somente no review (não automatizável com segurança)

| ID | Sev. | Verificação |
|----|------|-------------|
| SXR1 | WARNING | PE de legenda devolvendo bitmap sem a cor PO-UI na posição do formato do PE (FAQ: `{cond, título, bitmap, NIL, cor}` → 5º) |
| SXR2 | WARNING | `Static`/`Private`/variáveis `M->`/`aCols`/`aHeader`/área posicionada usadas em função chamada por ação, evento ou PE Smart X (arquitetura stateless) |
| SXR3 | WARNING | Tabela temporária, `SetBlkBackColor`, `aFixe`, mais de um browse, Tree ou AxCadastro em rotina que vai para o Smart X |
| SXR4 | INFO | `MenuDef` com condicionais, "Imprimir" sem operação 8, ação que deveria ser `PAGEACTION` |
| SXR5 | WARNING | Namespace do PE diferente de `custom.entrypoint.<resto do namespace do modelo>` |
| SXR6 | WARNING | Função de `BuildAdvplAction`/validação devolvendo tipo errado (ação: JSON em string; `X3_VLDSMX`: JSON `{return, notValidMessage}`; linha do grid: lógico) |
| SXR7 | INFO | Ordem das chaves de `addObject`/`addArray` (TDN diverge — ver `smartx-reference.md` §16) |
| SXR8 | WARNING | Rotina reescrita em Smart X usada junto com a versão MVC/ADVPL legada (lock e sobrescrita) |
