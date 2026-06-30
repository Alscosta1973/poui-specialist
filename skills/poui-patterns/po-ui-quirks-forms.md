# PO-UI Quirks — Família: Forms / Inputs

Comportamentos de componentes de formulário: `po-input`, `po-dynamic-form`, `po-stepper`,
`po-decimal`, `po-number`. Carregar quando gerando `page-edit`, `modal-crud`, `stepper-form` ou `page-detail`.

| # | Componente | Sintoma | Fix resumido |
|---|---|---|---|
| 2 | po-input | Botões 8px abaixo da borda do campo | `margin-bottom: 8px` no container do botão |
| 4 | po-input | `NG8002` em `p-max-length` | Usar `p-maxlength` (sem hífen entre max e length) |
| 13 | po-dynamic-form | `(p-value-change)` não existe — handler nunca chamado | `(p-form)="onFormInit($event)"` + `form.valueChanges.subscribe(...)` |
| 15 | po-stepper | `[p-current-active-step]` não existe (NG8002); `back()` não limpa 'done' | Input: `[p-step]`. Output: `(p-change-step)`. `steps` como `signal<PoStepperItem[]>` com `goToStep()` |
| 17 | po-decimal / po-number | Input numérico alinhado à esquerda | CSS global em `styles.scss`: `po-decimal input, po-number input { text-align: right; }` |

---

## 2. po-input bottom padding misaligns buttons (8px offset)

**Symptom:** Buttons placed in the same flex row as `po-input` fields appear 8px lower
than the visible input field edge, even with `align-items: flex-end` on the container.

**Root cause:** `po-input` renders a wrapper that includes an invisible 8px space below
the visible input field, reserved for validation error messages. `flex-end` aligns to the
bottom of this wrapper (including the invisible 8px), not to the bottom of the visible field.

**Fix:** Add `margin-bottom: 8px` to the button element or its container.

```scss
// ✓ Correct
.header-botoes {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  margin-bottom: 8px;   // ← cancels po-input's internal 8px error-space
}

.header-filtros {
  display: flex;
  align-items: flex-end;
  gap: 8px;

  po-button { margin-bottom: 8px; }  // ← same fix for buttons inside the filtros row
}
```

---

## 4. po-input `p-maxlength` binding name

**Symptom:** Angular compilation error: `NG8002: Can't bind to 'p-max-length' since it isn't a known property of 'po-input'`.

**Root cause:** The correct Angular input alias is `p-maxlength` (no hyphen between `max` and `length`).

```html
<!-- ✓ Correct -->
<po-input [p-maxlength]="3" ...></po-input>

<!-- ✗ Wrong — causes NG8002 -->
<po-input [p-max-length]="3" ...></po-input>
```

---

## 13. po-dynamic-form: `(p-value-change)` NÃO existe (confirmado PO-UI v17.26.28)

**Symptom:** Binding `(p-value-change)="myHandler($event)"` on `po-dynamic-form` compiles
without errors but the handler is never called, regardless of what the user types.

**Root cause:** `PoDynamicFormBaseComponent` declares only one `@Output`: `outputs: { formOutput: "p-form" }`.
There is no `p-value-change` output. Angular silently ignores unknown event bindings — no error, no warning.

**Fix: use `(p-form)` para receber o `NgForm`, depois subscribir em `form.valueChanges`.**

```typescript
export class MyComponent implements OnDestroy {
  headerValues: Record<string, unknown> = {};
  private formSub: Subscription | null = null;

  onFormInit(form: any): void {
    if (!form?.valueChanges) return;
    this.formSub?.unsubscribe();
    this.formSub = form.valueChanges.subscribe((val: Record<string, unknown>) => {
      this.headerValues = { ...val };
    });
  }

  ngOnDestroy(): void { this.formSub?.unsubscribe(); }
}
```

```html
<!-- ✗ Wrong — (p-value-change) does not exist -->
<po-dynamic-form [p-fields]="fields" [p-value]="vals" (p-value-change)="onChange($event)">
</po-dynamic-form>

<!-- ✓ Correct -->
<po-dynamic-form [p-fields]="fields" [p-value]="headerValues" (p-form)="onFormInit($event)">
</po-dynamic-form>
```

**Notas:**
- `form.valueChanges` dispara a cada tecla em `po-decimal`/`po-number` e no blur em campos texto
- `[(p-value)]` two-way binding também falha silenciosamente — usar `[p-value]` (one-way) para inicialização e atualizar `headerValues` no subscribe
- Para `modal-crud`: usar `@ViewChild(PoDynamicFormComponent) dynamicForm` e ler `this.dynamicForm.value` diretamente no save

---

## 15. po-stepper: API incorreta + back() não reseta estado 'done' (descoberto 2026-06-26)

**Symptom 1 — NG8002 em `[p-current-active-step]`:**
```
ERROR NG8002: Can't bind to 'p-current-active-step' since it isn't a known property of 'po-stepper'.
```

**Symptom 2 — Após clicar "Anterior", step visitado permanece marcado como concluído (círculo cheio).**

**Root cause:**
- `[p-current-active-step]` e `(p-current-active-step)` **não existem** em `po-stepper`
- O input real é `[p-step]` e o output real é `(p-change-step)`
- Mesmo usando `[p-step]`, o `po-stepper` avança marcando steps como 'done' mas **não reseta** ao voltar

**Fix:**

```typescript
// ✓ CORRETO — steps como signal com status explícito; goToStep() gerencia tudo
readonly steps = signal<PoStepperItem[]>([
  { label: 'Step 1', status: 'active'  as PoStepperItem['status'] },
  { label: 'Step 2', status: 'default' as PoStepperItem['status'] },
  { label: 'Step 3', status: 'default' as PoStepperItem['status'] },
]);

private goToStep(target: number): void {
  type S = PoStepperItem['status'];
  this.steps.update(items =>
    items.map((item, i) => ({
      ...item,
      status: (i + 1 < target ? 'done' : i + 1 === target ? 'active' : 'default') as S,
    }))
  );
  this.currentStep.set(target);
}

onStepChange(step: number): void { this.goToStep(step); }
next(): void { if (!this.isLastStep()) this.goToStep(this.currentStep() + 1); }
back(): void { if (!this.isFirstStep()) this.goToStep(this.currentStep() - 1); }
```

```html
<!-- ✗ ERRADO -->
<po-stepper [p-steps]="steps" [p-current-active-step]="currentStep()" (p-current-active-step)="onChange($event)">

<!-- ✓ CORRETO -->
<po-stepper [p-steps]="steps()" (p-change-step)="onStepChange($event)">
```

**Note:** `PoStepperStatus` não está exportado no public_api. Usar `PoStepperItem['status']` como tipo.

---

## 17. po-decimal / po-number: texto alinhado à esquerda em formulários (descoberto 2026-06-26)

**Symptom:** Campos `type: 'currency'` ou `type: 'number'` em `po-dynamic-form` renderizam o input
com texto alinhado à **esquerda** — comportamento oposto ao padrão ERP / Protheus.

**Root cause:** `po-decimal` não aplica `text-align: right` via CSS interno (v17.26.28).

**Fix — adicionar em `src/styles.scss` (uma vez por projeto):**

```scss
po-decimal input,
po-number input {
  text-align: right;
}
```

**Não use `::ng-deep`** — `styles.scss` é global, seletores funcionam sem encapsulamento.

**Afeta:** qualquer `po-dynamic-form` ou `po-dynamic-search` com campos `currency` ou `number`.
Não afeta `po-table` (que alinha via `type` correto automaticamente).

**Plugin rule:** `styles.scss` gerado pelo plugin inclui essa regra. Ao revisar, verificar se `styles.scss` contém `po-decimal input`.
