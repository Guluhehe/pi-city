import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const output = path.resolve(process.cwd(), 'demo-recordings/chapter-previews/cinema-satchel.png');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(20_000);
try {
  await mkdir(path.dirname(output), { recursive: true });
  await page.goto(`${baseUrl}/?previewMission=cinema`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '和 Pi 一起去' }).click();
  await page.getByLabel('雨天的露天电影 城市故事').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /和 Pi 一起看看/ }).click();
  await page.getByRole('button', { name: /先弄清一点点/ }).click();
  await page.getByRole('button', { name: '去高处观察台看看' }).click();
  await page.getByRole('button', { name: /跟上 Pi/ }).click();
  await wait(4_000);
  await page.getByRole('button', { name: /等 Pi 带着发现回来/ }).click();
  await wait(3_300);
  await page.getByRole('button', { name: /把它记进手账/ }).click();
  await page.getByLabel(/Pi 的两格小包，已带回 1 件发现/).waitFor({ state: 'visible' });
  await page.screenshot({ path: output });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
