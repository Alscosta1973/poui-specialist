/*/{Protheus.doc} FORN001
    Browse de Fornecedores — Cadastro SA2
    @type User Function
    @author Andre Costa
/*/
User Function FORN001()
    Local oBrw
    Local aButtons := {}

    // Colunas do browse (aCampos)
    Private aCampos := {}
    aAdd(aCampos, {"A2_FILIAL",  "C", 2,  "Filial",    "L", 6})
    aAdd(aCampos, {"A2_COD",     "C", 6,  "Código",    "L", 8})
    aAdd(aCampos, {"A2_LOJA",    "C", 2,  "Loja",      "L", 4})
    aAdd(aCampos, {"A2_NOME",    "C", 40, "Nome",      "L", 30})
    aAdd(aCampos, {"A2_TIPO",    "C", 1,  "Tipo",      "L", 8})
    aAdd(aCampos, {"A2_CGC",     "C", 14, "CNPJ/CPF",  "L", 14})
    aAdd(aCampos, {"A2_MUN",     "C", 20, "Município", "L", 15})
    aAdd(aCampos, {"A2_EST",     "C", 2,  "Estado",    "L", 6})
    aAdd(aCampos, {"A2_MSBLQL", "C", 1,  "Bloqueado", "L", 8})

    // Ações do browse
    aAdd(aButtons, {"Incluir",    {|| FWIncluir()},    "I"})
    aAdd(aButtons, {"Alterar",    {|| FWAlterar()},    "A"})
    aAdd(aButtons, {"Excluir",    {|| FWExcluir()},    "E"})
    aAdd(aButtons, {"Visualizar", {|| FWVisualizar()}, "V"})

    // Status A2_MSBLQL
    #Define STATUS_ATIVO     " "
    #Define STATUS_BLOQUEADO "S"

    // Filtros: Código (A2_COD), Nome (A2_NOME), Tipo F=Física/J=Jurídica (A2_TIPO)

    oBrw := FWMBrowse():New()
    oBrw:SetAlias("SA2")
    oBrw:SetDescription("Fornecedores")
    oBrw:Activate()
Return
