import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const outputDir = path.resolve(process.cwd(), 'demo-recordings/chapter-previews');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const scenarios = [
  { chapter: 2, mission: '找不到家的小风筝' },
  { chapter: 3, mission: '花园里醒不过来的种子' },
  { chapter: 4, mission: '同一晚的两张心愿单' },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(20_000);

try {
  for (const scenario of scenarios) {
    await page.goto(`${baseUrl}/?story=${scenario.chapter}`, { waitUntil: 'networkidle' });
    await page.getByLabel('Pi City 心愿码头').waitFor({ state: 'visible' });
    await wait(3_400);
    await page.screenshot({ path: path.join(outputDir, `chapter-${scenario.chapter}-harbor.png`) });
    await page.getByRole('button', { name: '和 Pi 一起去' }).click();
    await page.getByLabel(new RegExp(`${scenario.mission} 城市故事`)).waitFor({ state: 'visible' });
    await wait(2_300);
    await page.screenshot({ path: path.join(outputDir, `chapter-${scenario.chapter}-arrival.png`) });
    await page.getByRole('button', { name: /和 Pi 一起看看/ }).click();
    await wait(600);
    await page.getByRole('button', { name: /先弄清一点点/ }).click();
    await wait(700);
    await page.screenshot({ path: path.join(outputDir, `chapter-${scenario.chapter}-questions.png`) });
  }
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
