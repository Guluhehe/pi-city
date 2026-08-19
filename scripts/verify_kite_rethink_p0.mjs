import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const output = path.resolve(process.cwd(), 'demo-recordings/p0-kite-rethink');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function clickWhenReady(page, name) {
  const button = page.getByRole('button', { name });
  await button.waitFor();
  await page.waitForFunction((label) => {
    const buttons = [...document.querySelectorAll('button')];
    return buttons.some((item) => item.textContent?.includes(label) && !(item instanceof HTMLButtonElement && item.disabled));
  }, name);
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
  await page.getByRole('button', { name: /旧日图书馆/ }).click();
  await clickWhenReady(page, '跟上 Pi');
  await clickWhenReady(page, '等 Pi 带着发现回来');
  await clickWhenReady(page, '把它记进手账');

  await page.getByRole('button', { name: /高处观察台/ }).click();
  await clickWhenReady(page, '跟上 Pi');
  await clickWhenReady(page, '等 Pi 带着发现回来');
  await page.waitForSelector('.kite-rethink-cue');
  const rethinkText = await page.locator('.kite-rethink-cue').innerText();
  if (!rethinkText.includes('屋顶风向札记') || !rethinkText.includes('新鲜的风筝线') || !rethinkText.includes('红门')) throw new Error('Rethink cue did not preserve the two factual anchors and new route.');
  await page.screenshot({ path: path.join(output, '01-two-facts-change-direction.png') });

  await clickWhenReady(page, '按这个新方向继续');
  await page.waitForSelector('.world-clue-guide');
  const newRoute = await page.locator('.world-clue-guide').innerText();
  if (!newRoute.includes('屋顶红门')) throw new Error('Acknowledging the rethink did not expose the new red-door action.');
  await page.screenshot({ path: path.join(output, '02-player-chooses-red-door.png') });
  await wait(100);
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
