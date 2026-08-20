import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const output = path.resolve(process.cwd(), 'demo-recordings/p0-landmark-choice');

async function clickWhenReady(page, name) {
  const button = page.getByRole('button', { name });
  await button.waitFor();
  await page.waitForFunction((label) => [...document.querySelectorAll('button')].some((item) => item.textContent?.includes(label) && !(item instanceof HTMLButtonElement && item.disabled)), name);
  await button.click();
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await context.newPage();
try {
  await page.goto(`${baseUrl}/?story=2`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.memory-wind-invite button');
  await page.locator('.memory-wind-invite button').click();
  await page.waitForSelector('.mission-story.mission-kite');
  await clickWhenReady(page, '和 Pi 一起看看');
  await clickWhenReady(page, '先弄清一点点');
  await page.waitForSelector('.landmark-choice-note');
  const canvas = page.locator('.fountain-scene canvas');
  await canvas.click({ position: { x: 631, y: 193 } });
  await page.locator('.pi-plan').waitFor();
  const plan = await page.locator('.pi-plan').innerText();
  if (!plan.includes('旧日风向') || !plan.includes('旧日图书馆')) throw new Error('Canvas landmark click did not select the library investigation plan.');
  await page.screenshot({ path: path.join(output, '02-canvas-click-selects-library.png') });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
