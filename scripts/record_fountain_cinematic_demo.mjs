import { chromium } from 'playwright';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const outputDir = path.resolve(process.cwd(), 'demo-recordings');
const videoDir = path.join(outputDir, '.playwright-video');

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function clickButton(page, expression) {
  const button = page.getByRole('button', { name: expression });
  await button.waitFor({ state: 'visible', timeout: 15_000 });
  await button.click();
}

await mkdir(videoDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
page.setDefaultTimeout(15_000);

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await clickButton(page, /和 Pi 一起调查/);
  await page.locator('.fountain-story').waitFor({ state: 'visible' });
  await wait(900);

  await clickButton(page, /和 Pi 一起看看/);
  await wait(900);
  await clickButton(page, /静静听一听/);
  await wait(700);

  await clickButton(page, /去码头乐手看看/);
  await wait(1_050);
  await page.screenshot({ path: path.join(outputDir, 'fountain-plan-closeup.png') });

  await clickButton(page, /跟上 Pi/);
  await wait(2_950);
  await page.screenshot({ path: path.join(outputDir, 'fountain-expedition-arrival.png') });

  await clickButton(page, /等 Pi 带着发现回来/);
  await wait(2_420);
  await page.screenshot({ path: path.join(outputDir, 'fountain-return-closeup.png') });

  await clickButton(page, /把它记进手账/);
  await wait(900);
} finally {
  const video = page.video();
  await page.close();
  await context.close();
  if (video) {
    const recordingPath = await video.path();
    await cp(recordingPath, path.join(outputDir, 'pi-fountain-investigation-cinematic.webm'));
  }
  await browser.close();
}
