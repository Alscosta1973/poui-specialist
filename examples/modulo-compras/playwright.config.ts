import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env['PO_E2E_BASE_URL'] ?? 'http://localhost:4200',
  },
  reporter: 'list',
});
