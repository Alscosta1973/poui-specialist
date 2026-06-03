---
name: poui-code-generation
description: Use when generating PO-UI Angular code — complete ready-to-adapt templates for page-list, page-dynamic-search, page-edit, modal-crud, service, module, and dashboard artifacts for Protheus integration
---

# PO-UI Code Generation Templates

## Overview

Complete Angular 17+ templates for PO-UI components integrated with Protheus REST API. All templates use standalone components, `ChangeDetectionStrategy.OnPush`, and Angular signals.

## Placeholder Reference

All templates use these substitution placeholders:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{ComponentClass}}` | PascalCase component class | `ClientesListComponent` |
| `{{kebab-name}}` | kebab-case file name | `clientes-list` |
| `{{selector}}` | CSS selector | `app-clientes-list` |
| `{{ModelInterface}}` | Singular PascalCase model | `Cliente` |
| `{{modelFile}}` | Model file kebab-case | `cliente` |
| `{{ServiceClass}}` | Service class name | `ClientesService` |
| `{{serviceFile}}` | Service file kebab-case | `clientes.service` |
| `{{apiPath}}` | Protheus REST path | `/rest/api/custom/v1/clientes` |
| `{{moduleName}}` | Feature folder name | `financeiro` |
| `{{ModuleName}}` | PascalCase module label | `Financeiro` |

## Templates

### List pages

| Template | File | When to use |
|----------|------|-------------|
| **page-list** | `templates-page-list.md` | Simple list with only quick search |
| **page-dynamic-search** | `templates-page-dynamic-search.md` | List with quick search + advanced search + disclaimers (standard Protheus pattern) |

### Edit pages

| Template | File | When to use |
|----------|------|-------------|
| **page-edit** | `templates-page-edit.md` | Complex form with many fields, sections, navigates via route |
| **modal-crud** | `templates-modal-crud.md` | All-in-one list + modal add/edit (simpler entities, up to ~10 fields) |

### Other

| Template | File | Description |
|----------|------|-------------|
| **service** | `templates-service.md` | Angular service consuming Protheus REST CRUD |
| **module** | `templates-module.md` | App scaffold: config, routes, shell, package.json, proxy, tsconfig |
| **dashboard** | `templates-dashboard.md` | Analytics page: po-widget KPIs + po-chart |
| **models** | `templates-models.md` | TypeScript model interfaces: simple, composite key, flat relational |
| **tlpp-contract** | `templates-tlpp-contract.md` | Backend REST contract: endpoints, error format, WsRestFul skeleton |
| **refactor-from-tlpp** | `templates-refactor-from-tlpp.md` | Analyze existing .prw/.tlpp → extract columns/actions/rules → assertive one-shot PO-UI generation |
