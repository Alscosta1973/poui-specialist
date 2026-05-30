# Template: page-edit

Generates a standalone `po-page-edit` component with Reactive Forms for create and edit operations.

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY } from 'rxjs';
import {
  PoPageEditModule,
  PoInputModule,
  PoFieldModule,
  PoPageEditActions,
  PoNotificationService,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageEditModule, PoInputModule, PoFieldModule, ReactiveFormsModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  readonly id = input<string>();

  private readonly service = inject({{ServiceClass}});
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEdit = signal(false);
  readonly loading = signal(false);

  readonly form = this.fb.group({
    // TODO: add controls matching {{ModelInterface}} fields
  });

  readonly editActions: PoPageEditActions = {
    save: {
      label: 'Salvar',
      action: () => this.save(),
      disabled: () => this.form.invalid || this.loading(),
    },
    cancel: {
      label: 'Cancelar',
      action: () => this.router.navigate(['..'], { relativeTo: null }),
    },
  };

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.isEdit.set(true);
      this.loadRecord(id);
    }
  }

  private loadRecord(id: string): void {
    this.loading.set(true);
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          this.form.patchValue(record as any);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Registro não encontrado.');
          this.loading.set(false);
          this.router.navigate(['..']);
        },
      });
  }

  save(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    const data = this.form.value as Partial<{{ModelInterface}}>;
    const id = this.id();

    const request$ = id
      ? this.service.update(id, data)
      : this.service.create(data);

    request$
      .pipe(
        catchError((err) => {
          const msg = err.error?.message ?? 'Erro ao salvar. Tente novamente.';
          this.notification.error(msg);
          this.loading.set(false);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.notification.success('Salvo com sucesso!');
        this.loading.set(false);
        this.router.navigate(['..']);
      });
  }
}
```

## {{kebab-name}}.component.html

```html
<po-page-edit
  [p-title]="isEdit() ? 'Editar' : 'Novo'"
  [p-actions]="editActions">

  <form [formGroup]="form">
    <div class="po-row">
      <!-- TODO: add po-* field components matching form controls -->
    </div>
  </form>

</po-page-edit>
```

## {{kebab-name}}.component.scss

```scss
// Add component-specific styles here
```
