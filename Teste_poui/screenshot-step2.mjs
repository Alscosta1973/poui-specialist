import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.setViewportSize({ width: 1280, height: 800 });
await p.goto('http://localhost:4200/rh/onboarding', { waitUntil: 'networkidle', timeout: 20000 });
await p.waitForTimeout(2000);

// Preencher step 1 — Nome, CPF, Data Nascimento
const nomeInput = p.locator('po-input').filter({ has: p.locator('label', { hasText: 'Nome' }) }).locator('input');
await nomeInput.fill('JOAO SILVA');

const cpfInput = p.locator('po-input').filter({ has: p.locator('label', { hasText: 'CPF' }) }).locator('input');
await cpfInput.fill('12345678901');

// Datepicker: digitar direto
const dateInput = p.locator('po-datepicker').first().locator('input');
await dateInput.fill('01/01/1990');
await p.keyboard.press('Tab');
await p.waitForTimeout(500);

// Clicar Próximo — po-button é wrapper; o clique real é no button interno
await p.locator('po-button').filter({ hasText: 'Próximo' }).locator('button').click();
await p.waitForTimeout(2000);

await p.screenshot({ path: './onboarding-step2.png' });
console.log('ok - step atual:', await p.locator('po-stepper .po-stepper-step-active').textContent().catch(() => 'n/a'));
await b.close();
