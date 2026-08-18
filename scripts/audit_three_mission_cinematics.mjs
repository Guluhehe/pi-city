import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const outputDir = path.resolve(process.cwd(), 'demo-recordings/three-mission-audit');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function click(page, name) {
  const control = page.getByRole('button', { name });
  await control.waitFor({ state: 'visible', timeout: 20_000 });
  await control.click();
}

async function runStoryQuestion(page, destination, label) {
  await click(page, new RegExp(`去${destination}看看`));
  await wait(700);
  await page.screenshot({ path: path.join(outputDir, `${label}-plan.png`) });
  await click(page, /跟上 Pi/);
  await wait(2_850);
  await page.screenshot({ path: path.join(outputDir, `${label}-arrival.png`) });
  await click(page, /等 Pi 带着发现回来/);
  await wait(2_300);
  await page.screenshot({ path: path.join(outputDir, `${label}-return.png`) });
  await click(page, /把它记进手账/);
  await wait(650);
}

async function enterCityMission(page, label) {
  await click(page, '和 Pi 一起去');
  await page.getByLabel(new RegExp(`${label} 城市故事`)).waitFor({ state: 'visible' });
  await wait(1_000);
  await click(page, /和 Pi 一起看看/);
  await wait(600);
  await click(page, /先弄清一点点/);
  await wait(600);
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(20_000);

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByLabel('Pi City 心愿码头').waitFor({ state: 'visible' });
  await wait(4_000);
  await page.screenshot({ path: path.join(outputDir, 'harbor-start.png') });

  await enterCityMission(page, '灯塔还亮着吗？');
  await runStoryQuestion(page, '灯塔观察台', 'lighthouse');
  await runStoryQuestion(page, '铜工工具坊', 'lighthouse-workshop');
  await runStoryQuestion(page, '暮色花园', 'lighthouse-confirm');
  await runStoryQuestion(page, '露露的回信码头', 'lighthouse-reply');
  await click(page, /带 Pi 回到心愿码头/);
  await wait(1_000);
  await page.screenshot({ path: path.join(outputDir, 'harbor-after-lighthouse.png') });

  await enterCityMission(page, '迷路的邮包');
  await runStoryQuestion(page, '旧日图书馆', 'parcel-library');
  await runStoryQuestion(page, '新门牌观察台', 'parcel-overlook');
  await runStoryQuestion(page, '邮局红门', 'parcel-delivery');
  await click(page, /带 Pi 回到心愿码头/);
  await wait(1_000);
  await page.screenshot({ path: path.join(outputDir, 'harbor-after-parcel.png') });

  await click(page, '和 Pi 一起去');
  await page.getByLabel('喷泉的乐声 城市故事').waitFor({ state: 'visible' });
  await wait(1_000);
  await click(page, /和 Pi 一起看看/);
  await wait(650);
  await click(page, /静静听一听/);
  await wait(650);
  await click(page, /去码头乐手看看/);
  await wait(650);
  await page.screenshot({ path: path.join(outputDir, 'fountain-plan.png') });
  await click(page, /跟上 Pi/);
  await wait(2_850);
  await page.screenshot({ path: path.join(outputDir, 'fountain-arrival.png') });
  await click(page, /等 Pi 带着发现回来/);
  await wait(2_300);
  await page.screenshot({ path: path.join(outputDir, 'fountain-return.png') });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
