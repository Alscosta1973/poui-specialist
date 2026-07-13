# Deploy: Angular → Protheus

Fluxo completo para compilar o projeto Angular e publicá-lo dentro do Protheus.

---

## 1. tsconfig.json — desabilitar strict mode

Todos os projetos PO-UI com Protheus desabilitam o strict mode para evitar erros de
compilação com os padrões da lib:

```json
{
  "compilerOptions": {
    "strict": false,
    "noPropertyAccessFromIndexSignature": false
  }
}
```

---

## 2. angular.json — ajustar budgets

O build de produção falha se os bundles ultrapassam os limites padrão. Ajuste em
`architect.build.configurations.production.budgets`:

```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "1mb",
    "maximumError": "2mb"
  },
  {
    "type": "anyComponentStyle",
    "maximumWarning": "4kb",
    "maximumError": "6kb"
  }
]
```

---

## 3. Build de produção

```bash
ng build --configuration production
```

Isso gera a pasta `dist/<nome-projeto>/browser/` (Angular 17–21+).

---

## 4. Renomear para .app

O Protheus exige que o bundle Angular tenha extensão `.app`:

```bash
# Windows (PowerShell)
Rename-Item "dist\<nome-projeto>\browser" "<nome-projeto>.app"
```

Resultado: `dist\<nome-projeto>\<nome-projeto>.app\`

---

## 5. Estrutura de pastas no servidor Protheus

```
<rootpath>\web\<nome-projeto>\
  <nome-projeto>.app\         ← conteúdo do dist (index.html, main.js, etc.)
  resource\                   ← recursos estáticos opcionais (imagens, fontes extras)

<rootpath>\src\<nome-projeto>\
  <nome-projeto>.prw           ← rdmake que chama FWCallApp
```

> `<rootpath>` é o caminho raiz do AppServer (ex: `C:\TOTVS\Microsiga\Protheus_Data`).

---

## 6. rdmake ADVPL com FWCallApp

Crie `<nome-projeto>.prw` com o seguinte conteúdo:

```advpl
#include "totvs.ch"

/*/{Protheus.doc} <NomeProjeto>
    Abre o aplicativo Angular <NomeProjeto> dentro do Protheus.
    @type User Function
    @author Andre Costa
/*/
User Function <NomeProjeto>()
    Local cApp  := "web/<nome-projeto>/<nome-projeto>.app"
    Local cParm := ""
    FWCallApp(cApp, cParm)
Return
```

> Substitua `<NomeProjeto>` pelo nome da função (máx. 10 caracteres) e
> `<nome-projeto>` pelo nome da pasta criada no passo 5.

---

## 7. appserver.ini — porta multiprotocolo (MPP)

Para que o AppServer sirva arquivos estáticos do `.app`, a porta HTTP deve ser
configurada como multiprotocolo:

```ini
[General]
BuildKillUsers=1

[HTTPV11]
Enable=1
Sockets=MPSOCKET

[MPSOCKET]
Port=8084
```

> Reinicie o AppServer após alterar o `.ini`.

---

## 8. proxy.conf.json — desenvolvimento local

Durante o desenvolvimento, use proxy para evitar CORS ao chamar `/rest`:

```json
{
  "/rest": {
    "target": "http://localhost:8084",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Certifique-se de que o script `start` no `package.json` inclui `--proxy-config`:

```json
"start": "ng serve --proxy-config proxy.conf.json"
```

---

## 9. Acessar a rotina no Protheus

Compile o `.prw` no RPO e execute a `User Function` pelo menu ou pelo SmartClient.
O Protheus abrirá o app Angular no browser embutido ou no browser padrão do sistema,
dependendo da configuração do `FWCallApp`.

**Referências TDN:**
- FWCallApp: https://tdn.totvs.com.br/display/public/framework/FwCallApp
- Porta Multiprotocolo: https://tdn.totvs.com/display/tec/Application+Server+-+Porta+Multiprotocolo
