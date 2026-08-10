import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const artifactDir = join('docs', 'browser-acceptance-artifacts');

test.beforeAll(() => {
  mkdirSync(artifactDir, { recursive: true });
});

async function enterWatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A request has entered the harbor.' })).toBeVisible();
  await page.getByRole('button', { name: /Enter the city/ }).click({ force: true });
  await expect(page.locator('.cinematic-title h1')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.cinematic-transport .play')).toBeVisible({ timeout: 15_000 });
}

test('landing renders and enters Watch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await enterWatch(page);
  await expect(page.locator('.cinematic-transport .play')).toHaveText(/Pause|Play/);
  await expect(page.locator('.cinematic-title h1')).toContainText('authentication bug');
  expect(errors.filter((message) => !/deprecated/i.test(message)), errors.join('\n')).toEqual([]);
});

test('Watch can pause and resume', async ({ page }) => {
  test.setTimeout(60_000);
  await enterWatch(page);

  // Scrubbing the timeline always pauses playback.
  await page.locator('.cinematic-transport input[type="range"]').fill('2');
  await expect(page.locator('.cinematic-transport .play')).toHaveText('Play');
  await expect(page.locator('.cinematic-title .micro')).toContainText('PAUSED');

  await page.evaluate(() => {
    const button = document.querySelector('.cinematic-transport .play');
    if (button instanceof HTMLButtonElement) button.click();
  });
  await expect(page.locator('.cinematic-transport .play')).toHaveText('Pause', { timeout: 15_000 });
  await expect(page.locator('.cinematic-title .micro')).toContainText('FOLLOWING RUN');
});

test('canonical frame deep links open expected frames', async ({ page }) => {
  for (const [frame, eyebrow] of [
    ['arrival', 'FRAME 01 · ARRIVAL HARBOR'],
    ['context', 'FRAME 02 · CONTEXT WORKS'],
    ['model', 'FRAME 03 · MODEL CORE'],
  ] as const) {
    await page.goto(`/?frame=${frame}`);
    await expect(page.locator('.frame-caption small')).toHaveText(eyebrow);
    await expect(page.locator('.frame-mode')).toHaveCount(1);
    await page.screenshot({
      path: join(artifactDir, `canonical-${frame}.webp`),
      type: 'webp',
      fullPage: false,
    });
  }
});

test('H toggles clean Photo Mode and Escape exits', async ({ page }) => {
  await page.goto('/?frame=arrival');
  await expect(page.locator('.frame-caption')).toBeVisible();
  await page.keyboard.press('h');
  await expect(page.locator('.frame-clean')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A request has entered the harbor.' })).toBeVisible();
  await expect(page).toHaveURL((url) => !url.searchParams.has('frame'));
});

test('completion exposes Explore and Evidence Explorer', async ({ page }) => {
  test.setTimeout(90_000);
  await enterWatch(page);
  await page.locator('.cinematic-transport select').selectOption('2');
  // Second-to-last auth frame; Play on the final index restarts the run.
  await page.locator('.cinematic-transport input[type="range"]').fill('13');
  const play = page.locator('.cinematic-transport .play');
  if ((await play.textContent()) === 'Play') {
    await play.click({ force: true });
  }
  await expect(play).toHaveText('Pause');
  const complete = page.locator('.cinematic-complete');
  await expect(complete.getByRole('heading', { name: 'You just watched one Agent run become a city.' })).toBeVisible({
    timeout: 45_000,
  });
  await expect(complete.getByRole('button', { name: 'Explore the city' })).toBeVisible();
  await expect(complete.getByRole('button', { name: 'Evidence Explorer' })).toBeVisible();
  await complete.getByRole('button', { name: 'Explore the city' }).dispatchEvent('click');
  await expect(page.locator('.explore-copy strong')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.cinematic-app')).toHaveClass(/explore-mode/);
});
