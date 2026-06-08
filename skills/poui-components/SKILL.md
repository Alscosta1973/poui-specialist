---
name: poui-components
description: Use when generating or reviewing PO-UI Angular components — reference for inputs, outputs, TypeScript types, and usage examples for po-page-list, po-page-edit, po-table, and form fields | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
---

# PO-UI Components Reference (v17+)

## Package Installation

```bash
npm install @po-ui/ng-components @po-ui/ng-templates
```

## angular.json — Add PO-UI theme

```json
"styles": [
  "node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
  "node_modules/@totvs/po-theme/css/po-theme-default.min.css",
  "node_modules/@po-ui/style/css/po-theme-core.min.css",
  "src/styles.scss"
]
```

## Component Reference Files

- **Page layout components** (po-page-list, po-page-edit, po-page-detail): see `page-components.md`
- **Data table** (po-table, PoTableColumn, PoTableAction): see `table-components.md`
- **Form fields** (po-input, po-select, po-lookup, po-datepicker, etc.): see `form-fields.md`
- **Modal, Dialog & Dynamic View** (po-modal, PoDialogService, po-dynamic-view): see `modal-dialog.md`
- **Feedback & Status** (po-tag, po-info, [p-tooltip], po-progress): see `feedback-components.md`
- **Layout** (po-container, po-accordion, po-list-view): see `layout-components.md`
- **Dynamic Pages** (PoPageDynamic* do @po-ui/ng-templates — table, search, edit, detail): see `dynamic-pages.md`
- **Dynamic Form & View Fields** (PoDynamicFormField completo, PoDynamicViewField, mapeamento tipo→componente): see `dynamic-form-fields.md`
- **Navigation** (po-menu com PoMenuItem, po-toolbar com PoToolbarProfile, PoBreadcrumb): see `navigation-components.md`
- **Utilities** (po-loading-overlay, po-widget, po-avatar, po-badge): see `utility-components.md`

## Common Imports for Standalone Components

```typescript
// Minimal import set for a page-list
import {
  PoPageModule,       // ← único módulo para po-page-list, po-page-edit, po-page-detail, po-page-default
  PoTableModule,
  PoTableColumn,
  PoTableAction,
  PoPageAction,
  PoPageFilter,
} from '@po-ui/ng-components';

// Minimal import set for a page-edit
import {
  PoPageModule,       // ← não existe PoPageEditModule, PoPageListModule, etc.
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
