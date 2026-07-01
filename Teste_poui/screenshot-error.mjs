import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto('http://localhost:4200/rh/onboarding', { waitUntil: 'networkidle', timeout: 20000 });
await p.waitForTimeout(3000);
await p.screenshot({ path: './error-overlay.png', fullPage: true });
console.log('ok');
await b.close();
