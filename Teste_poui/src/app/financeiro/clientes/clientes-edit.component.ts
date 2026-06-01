import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  PoButtonModule,
  PoLoadingModule,
  PoNotificationService,
  PoPageDefaultModule,
  PoInputModule,
  PoFieldModule,
} from '@po-ui/ng-components';
import { ClientesService } from './clientes.service';

@Component({
  selector: 'app-clientes-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PoPageDefaultModule,
    PoFieldModule,
    PoInputModule,
    PoButtonModule,
    PoLoadingModule,
  ],
  templateUrl: './clientes-edit.component.html',
  styleUrls: ['./clientes-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesEditComponent implements OnInit {
  private readonly service = inject(ClientesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly isEdit = signal(false);
  private codigo = '';
  private loja = '';

  readonly form: FormGroup = this.fb.group({
    codigo: [{ value: '', disabled: false }, [Validators.required, Validators.maxLength(6)]],
    loja: [{ value: '', disabled: false }, [Validators.required, Validators.maxLength(2)]],
    nome: ['', [Validators.required, Validators.maxLength(40)]],
    nomeFantasia: ['', [Validators.maxLength(20)]],
    cnpj: ['', [Validators.maxLength(14)]],
    cidade: ['', [Validators.maxLength(15)]],
    uf: ['', [Validators.maxLength(2)]],
    telefone: ['', [Validators.maxLength(15)]],
  });

  get pageTitle(): string {
    return this.isEdit() ? 'Editar Cliente' : 'Novo Cliente';
  }

  ngOnInit(): void {
    const params = this.route.snapshot.params;
    if (params['codigo'] && params['loja']) {
      this.codigo = params['codigo'];
      this.loja = params['loja'];
      this.isEdit.set(true);
      this.form.get('codigo')?.disable();
      this.form.get('loja')?.disable();
      this.loadCliente();
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const data = this.form.getRawValue();
    this.saving.set(true);

    const request$ = this.isEdit()
      ? this.service.updateCliente(this.codigo, this.loja, data)
      : this.service.createCliente(data);

    request$.subscribe({
      next: () => {
        this.notification.success(
          this.isEdit() ? 'Cliente atualizado com sucesso.' : 'Cliente criado com sucesso.'
        );
        this.router.navigate(['/financeiro/clientes']);
      },
      error: () => {
        this.notification.error('Erro ao salvar cliente.');
        this.saving.set(false);
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/financeiro/clientes']);
  }

  private loadCliente(): void {
    this.loading.set(true);
    this.service.getCliente(this.codigo, this.loja).subscribe({
      next: (cliente) => {
        this.form.patchValue(cliente);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Erro ao carregar cliente.');
        this.loading.set(false);
      },
    });
  }
}
