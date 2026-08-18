import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const output = path.resolve(process.cwd(), 'demo-recordings/memory-wind/kite-return-reframe.png');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

await mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(20_000);
try {
  await page.goto(`${baseUrl}/?previewMission=kite`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.city-hub')?.classList.contains('memory-wind-invite'));
  await page.getByRole('button', { name: '和 Pi 一起看看' }).click();
  await page.getByRole('button', { name: /和 Pi 一起看看/ }).last().click();
  await page.getByRole('button', { name: /先弄清一点点/ }).click();
  await page.getByRole('button', { name: '去旧日图书馆看看' }).click();
  await page.getByRole('button', { name: /跟上 Pi/ }).click();
  await wait(3_700);
  await page.getByRole('button', { name: /等 Pi 带着发现回来/ }).click();
  await wait(1_250);
  await page.screenshot({ path: output });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
