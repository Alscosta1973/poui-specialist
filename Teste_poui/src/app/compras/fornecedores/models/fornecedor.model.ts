export interface CidadeFornecedor {
  cityCode: string;
  cityDescription: string;
  cityInternalId: string;
}

export interface EstadoFornecedor {
  stateId: string;
  stateInternalId: string;
  stateDescription: string;
}

export interface EnderecoFornecedor {
  address: string;
  number: string;
  zipCode: string;
  complement: string;
  district: string;
  city: CidadeFornecedor;
  state: EstadoFornecedor;
}

export interface Fornecedor {
  companyInternalId?: string;
  code: string;
  storeId: string;
  name: string;
  shortName: string;
  strategicCustomerType: string;
  registerSituation: string;
  type: number;
  entityType: string;
  address: EnderecoFornecedor;
}
