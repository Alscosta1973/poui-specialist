---
name: poui-code-generation
description: Use when generating PO-UI Angular code — complete ready-to-adapt templates for page-list, page-edit, service, and module artifacts for Protheus integration
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
| `{{apiPath}}` | Protheus REST path | `/api/custom/v1/clientes` |
| `{{moduleName}}` | Feature folder name | `financeiro` |

## Templates

- **page-list:** `templates-page-list.md`
- **page-edit:** `templates-page-edit.md`
- **service:** `templates-service.md`
- **module:** `templates-module.md`
