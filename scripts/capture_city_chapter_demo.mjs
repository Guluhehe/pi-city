import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const outputDir = path.resolve(process.cwd(), 'demo-recordings/city-chapter');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function button(page, name) {
  const target = page.getByRole('button', { name });
  await target.waitFor({ state: 'visible', timeout: 20_000 });
  await target.click();
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(20_000);

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByLabel('Pi City 心愿码头').waitFor({ state: 'visible' });
  await wait(10_500);
  await page.screenshot({ path: path.join(outputDir, 'wish-dock.png') });

  await button(page, '和 Pi 一起去');
  await page.getByLabel('灯塔还亮着吗？ 城市故事').waitFor({ state: 'visible' });
  await wait(5_000);
  await page.screenshot({ path: path.join(outputDir, 'lighthouse-arrival.png') });

  await button(page, /和 Pi 一起看看/);
  await wait(900);
  await button(page, /先弄清一点点/);
  await wait(850);
  await page.screenshot({ path: path.join(outputDir, 'lighthouse-open-questions.png') });

  await button(page, /去灯塔观察台看看/);
  await wait(700);
  await page.screenshot({ path: path.join(outputDir, 'lighthouse-plan.png') });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
