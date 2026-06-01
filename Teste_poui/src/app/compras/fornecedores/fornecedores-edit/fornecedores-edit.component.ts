import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY } from 'rxjs';
import {
  PoDynamicFormField,
  PoDynamicModule,
  PoNotificationService,
  PoPageEditModule,
  PoPageEditActions,
} from '@po-ui/ng-components';
import { FornecedoresService } from '../fornecedores.service';
import { Fornecedor } from '../models/fornecedor.model';

// Flat values object used by po-dynamic-form (address fields flattened)
interface FornecedorFormValues {
  code?: string;
  storeId?: string;
  name?: string;
  shortName?: string;
  entityType?: string;
  strategicCustomerType?: string;
  registerSituation?: string;
  type?: number;
  zipCode?: string;
  address?: string;
  cityCode?: string;
  stateId?: string;
}

@Component({
  selector: 'app-fornecedores-edit',
  standalone: true,
  imports: [PoPageEditModule, PoDynamicModule],
  templateUrl: './fornecedores-edit.component.html',
  styleUrl: './fornecedores-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FornecedoresEditComponent implements OnInit {
  private readonly service = inject(FornecedoresService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEdit = signal(false);
  readonly loading = signal(false);
  private codigo = '';
  private loja = '';

  values: FornecedorFormValues = {
    type: 2,
    entityType: 'J',
    strategicCustomerType: 'J',
    registerSituation: '1',
  };

  readonly fields: PoDynamicFormField[] = [
    {
      property: 'code',
      label: 'Código',
      divider: 'Dados Principais',
      maxLength: 6,
      required: true,
    },
    {
      property: 'storeId',
      label: 'Loja',
      maxLength: 2,
      required: true,
    },
    {
      property: 'name',
      label: 'Nome',
      maxLength: 40,
      required: true,
    },
    {
      property: 'shortName',
      label: 'Nome Reduzido',
      maxLength: 20,
    },
    {
      property: 'entityType',
      label: 'Tipo de Pessoa',
      options: [
        { label: 'Jurídica', value: 'J' },
        { label: 'Física',   value: 'F' },
      ],
    },
    {
      property: 'strategicCustomerType',
      label: 'Tipo do Cliente',
      options: [
        { label: 'Cons. Final',    value: 'F' },
        { label: 'Produtor Rural', value: 'L' },
        { label: 'Revendedor',     value: 'R' },
        { label: 'Solidário',      value: 'S' },
        { label: 'Exportação',     value: 'X' },
      ],
    },
    {
      property: 'registerSituation',
      label: 'Situação',
      options: [
        { label: 'Ativo',     value: '1' },
        { label: 'Inativo',   value: '2' },
        { label: 'Cancelado', value: '3' },
        { label: 'Pendente',  value: '4' },
        { label: 'Suspenso',  value: '5' },
      ],
    },
    {
      property: 'type',
      label: 'Tipo de Cadastro',
      options: [
        { label: 'Cliente',    value: 1 },
        { label: 'Fornecedor', value: 2 },
        { label: 'Ambos',      value: 3 },
      ],
    },
    {
      property: 'zipCode',
      label: 'CEP',
      divider: 'Endereço',
      maxLength: 9,
    },
    {
      property: 'address',
      label: 'Logradouro',
    },
    {
      property: 'cityCode',
      label: 'Cidade',
      maxLength: 15,
    },
    {
      property: 'stateId',
      label: 'Estado',
      maxLength: 2,
      options: [
        { label: 'Acre',               value: 'AC' },
        { label: 'Alagoas',            value: 'AL' },
        { label: 'Amapá',              value: 'AP' },
        { label: 'Amazonas',           value: 'AM' },
        { label: 'Bahia',              value: 'BA' },
        { label: 'Ceará',              value: 'CE' },
        { label: 'Distrito Federal',   value: 'DF' },
        { label: 'Espírito Santo',     value: 'ES' },
        { label: 'Goiás',              value: 'GO' },
        { label: 'Maranhão',           value: 'MA' },
        { label: 'Mato Grosso',        value: 'MT' },
        { label: 'Mato Grosso do Sul', value: 'MS' },
        { label: 'Minas Gerais',       value: 'MG' },
        { label: 'Pará',               value: 'PA' },
        { label: 'Paraíba',            value: 'PB' },
        { label: 'Paraná',             value: 'PR' },
        { label: 'Pernambuco',         value: 'PE' },
        { label: 'Piauí',              value: 'PI' },
        { label: 'Rio de Janeiro',     value: 'RJ' },
        { label: 'Rio Grande do Norte', value: 'RN' },
        { label: 'Rio Grande do Sul',  value: 'RS' },
        { label: 'Rondônia',           value: 'RO' },
        { label: 'Roraima',            value: 'RR' },
        { label: 'Santa Catarina',     value: 'SC' },
        { label: 'São Paulo',          value: 'SP' },
        { label: 'Sergipe',            value: 'SE' },
        { label: 'Tocantins',          value: 'TO' },
      ],
    },
  ];

  readonly editActions: PoPageEditActions = {
    save: {
      label: 'Salvar',
      action: () => this.save(),
    },
    cancel: {
      label: 'Cancelar',
      action: () => this.goBack(),
    },
  };

  get pageTitle(): string {
    return this.isEdit() ? 'Alterar Fornecedor' : 'Incluir Fornecedor';
  }

  ngOnInit(): void {
    const { codigo, loja } = this.route.snapshot.params;
    if (codigo && loja) {
      this.codigo = codigo;
      this.loja = loja;
      this.isEdit.set(true);
      this.loadFornecedor();
    }
  }

  save(): void {
    this.loading.set(true);
    const payload = this.buildPayload();
    const request$ = this.isEdit()
      ? this.service.update(this.codigo, this.loja, payload)
      : this.service.create(payload);

    request$
      .pipe(
        catchError((err) => {
          this.notification.error(this.parseProtheusError(err));
          this.loading.set(false);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.notification.success(
          this.isEdit() ? 'Fornecedor alterado com sucesso.' : 'Fornecedor inserido com sucesso.'
        );
        this.loading.set(false);
        this.goBack();
      });
  }

  private loadFornecedor(): void {
    this.loading.set(true);
    this.service
      .getById(this.codigo, this.loja)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (f) => {
          // Flatten nested address into form values
          this.values = {
            code:                    f.code,
            storeId:                 f.storeId,
            name:                    f.name,
            shortName:               f.shortName,
            entityType:              f.entityType,
            strategicCustomerType:   f.strategicCustomerType,
            registerSituation:       f.registerSituation,
            type:                    f.type,
            zipCode:                 f.address?.zipCode,
            address:                 f.address?.address,
            cityCode:                f.address?.city?.cityCode,
            stateId:                 f.address?.state?.stateId,
          };
          this.loading.set(false);
        },
        error: (err) => {
          this.notification.error(this.parseProtheusError(err));
          this.loading.set(false);
          this.goBack();
        },
      });
  }

  // Rebuild nested Fornecedor object from flat form values before sending to API
  private buildPayload(): Partial<Fornecedor> {
    const v = this.values;
    return {
      code:                   v.code,
      storeId:                v.storeId,
      name:                   v.name,
      shortName:              v.shortName,
      entityType:             v.entityType,
      strategicCustomerType:  v.strategicCustomerType,
      registerSituation:      v.registerSituation,
      type:                   v.type,
      address: {
        address:   v.address ?? '',
        number:    '',
        zipCode:   v.zipCode ?? '',
        complement: '',
        district:  '',
        city: {
          cityCode:        v.cityCode ?? '',
          cityDescription: v.cityCode ?? '',
          cityInternalId:  v.cityCode ?? '',
        },
        state: {
          stateId:          v.stateId ?? '',
          stateInternalId:  v.stateId ?? '',
          stateDescription: v.stateId ?? '',
        },
      },
    };
  }

  private goBack(): void {
    this.router.navigate(['../..'], { relativeTo: this.route });
  }

  private parseProtheusError(err: any): string {
    try {
      const errObj = JSON.parse(err.error?.errorMessage ?? '{}');
      const msg    = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
