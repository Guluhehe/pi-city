import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const output = path.resolve(process.cwd(), 'demo-recordings/p0-blind-opening');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await context.newPage();
try {
  await page.goto(`${baseUrl}/?story=2&blindOpening=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.city-hub')?.classList.contains('blind-opening'));
  await wait(1100);
  const earlyText = await page.locator('.city-hub').innerText();
  if (earlyText.includes('Pi 正在看向风里的纸页') || earlyText.includes('风把一段旧记忆吹散了') || earlyText.includes('Pi 先抬头看见了它')) throw new Error('Blind opening leaked explanatory copy before the prompt.');
  if (await page.locator('.blind-opening-prompt').count()) throw new Error('Blind prompt appeared before the three-second pure-picture window.');
  await page.screenshot({ path: path.join(output, '01-blind-pure-picture.png') });

  await page.waitForSelector('.blind-opening-prompt');
  await page.screenshot({ path: path.join(output, '02-blind-neutral-question.png') });
  await page.locator('#blind-opening-response').fill('它好像发现了飘着的纸，准备过去看看。');
  await page.getByRole('button', { name: '记录后继续' }).click();
  await page.waitForFunction(() => document.querySelector('.city-hub')?.classList.contains('memory-wind-stage-invite'));
  await page.screenshot({ path: path.join(output, '03-invite-after-response.png') });

  await page.goto(`${baseUrl}/?story=2`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.city-hub')?.classList.contains('memory-wind-stage-invite'));
  await wait(15500);
  if (!await page.locator('.city-hub.memory-wind-stage-invite').count()) throw new Error('Invite auto-advanced to explore without a player response.');
  await page.screenshot({ path: path.join(output, '04-invite-held-for-player.png') });
  await page.getByRole('button', { name: '和 Pi 一起看看' }).click();
  await page.waitForSelector('.mission-story.mission-kite');
  await page.screenshot({ path: path.join(output, '05-kite-mission-after-cta.png') });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
