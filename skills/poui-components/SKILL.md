---
name: poui-components
description: Use when generating or reviewing PO-UI Angular components — reference for inputs, outputs, TypeScript types, and usage examples for po-page-list, po-page-edit, po-table, and form fields
---

# PO-UI Components Reference (v17+)

## Package Installation

```bash
npm install @po-ui/ng-components @po-ui/ng-templates
```

## angular.json — Add PO-UI theme

```json
"styles": [
  "node_modules/@po-ui/style/css/po-theme-default.min.css",
  "src/styles.scss"
]
```

## Component Reference Files

- **Page layout components** (po-page-list, po-page-edit, po-page-detail): see `page-components.md`
- **Data table** (po-table, PoTableColumn, PoTableAction): see `table-components.md`
- **Form fields** (po-input, po-select, po-lookup, po-datepicker, etc.): see `form-fields.md`

## Common Imports for Standalone Components

```typescript
// Minimal import set for a page-list
import {
  PoPageListModule,
  PoTableModule,
  PoTableColumn,
  PoTableAction,
  PoPageAction,
  PoPageFilter,
} from '@po-ui/ng-components';

// Minimal import set for a page-edit
import {
  PoPageEditModule,
  PoInputModule,
  PoSelectModule,
  PoFieldModule,
} from '@po-ui/ng-components';

// Or import the full module (acceptable for prototyping)
import { PoModule } from '@po-ui/ng-components';
```

## Notification Service

```typescript
import { PoNotificationService } from '@po-ui/ng-components';

@Injectable({ providedIn: 'root' })
export class MyService {
  private notification = inject(PoNotificationService);

  handleError(msg: string): void {
    this.notification.error(msg);
  }

  handleSuccess(msg: string): void {
    this.notification.success(msg);
  }
}
```
