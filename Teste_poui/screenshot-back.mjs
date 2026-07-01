import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.setViewportSize({ width: 1280, height: 800 });
await p.goto('http://localhost:4200/rh/onboarding', { waitUntil: 'networkidle', timeout: 20000 });
await p.waitForTimeout(2000);

// Avançar para step 2
await p.locator('po-button').filter({ hasText: 'Próximo' }).locator('button').click();
await p.waitForTimeout(1000);

// Voltar para step 1
await p.locator('po-button').filter({ hasText: 'Anterior' }).locator('button').click();
await p.waitForTimeout(1000);

await p.screenshot({ path: './onboarding-back.png' });
console.log('ok');
await b.close();
