import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const output = path.resolve(process.cwd(), 'demo-recordings/art-prototype/hero-pi-memory-wind.png');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

await mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
try {
  await page.goto(`${baseUrl}/?story=2&artPrototype=memory-wind`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.city-hub')?.classList.contains('memory-wind-intro'));
  await wait(1000);
  await page.screenshot({ path: output });
} finally {
  await page.close();
  await browser.close();
}
