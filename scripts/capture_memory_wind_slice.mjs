import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const output = path.resolve(process.cwd(), 'demo-recordings/memory-wind');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await context.newPage();
try {
  await page.goto(`${baseUrl}/?story=2`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.city-hub')?.classList.contains('memory-wind-stage-intro'));
  await wait(900);
  await page.screenshot({ path: path.join(output, '01-phenomenon-notice.png') });
  await page.waitForFunction(() => document.querySelector('.city-hub')?.classList.contains('memory-wind-stage-invite'));
  await wait(3000);
  await page.screenshot({ path: path.join(output, '02-single-invite.png') });
  await page.waitForFunction(() => document.querySelector('.city-hub')?.classList.contains('memory-wind-stage-explore'));
  await wait(350);
  await page.screenshot({ path: path.join(output, '03-city-explore.png') });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
