import { chromium } from 'playwright';

const baseUrl = process.env.PI_CITY_URL ?? 'http://127.0.0.1:5173';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
try {
  await page.goto(`${baseUrl}/?story=2`, { waitUntil: 'domcontentloaded' });
  for (const delay of [500, 1500, 2600, 5000, 8500, 10500]) {
    await wait(delay === 500 ? delay : delay - (delay === 1500 ? 500 : delay === 2600 ? 1500 : delay === 5000 ? 2600 : delay === 8500 ? 5000 : 8500));
    const snapshot = await page.evaluate(() => {
      const hub = document.querySelector('.city-hub');
      const hero = document.querySelector('.hub-hero');
      const dock = document.querySelector('.wish-dock');
      const invite = document.querySelector('.memory-wind-invite');
      return {
        hubClass: hub?.className ?? null,
        heroVisible: hero ? getComputedStyle(hero).display !== 'none' : false,
        dockVisible: dock ? getComputedStyle(dock).display !== 'none' : false,
        inviteOpacity: invite ? getComputedStyle(invite).opacity : null,
      };
    });
    console.log(`${delay}ms ${JSON.stringify(snapshot)}`);
  }
} finally {
  await page.close();
  await browser.close();
}
