import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const multiFixture = resolve('fixtures/multi-tool/runtime.jsonl');
const authRuntimeFixture = resolve('fixtures/auth-bug/runtime.jsonl');
const sessionFixture = resolve('fixtures/auth-bug/session.jsonl');
const importedNarration = 'A user message became new work for the Agent.';

test('importing multi-tool fixture shows event-derived narration and actual totals', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?quality=fallback');
  await expect(page.getByRole('heading', { name: 'A request has entered the harbor.' })).toBeVisible();
  await page.locator('.cinematic-top-actions input[type="file"]').setInputFiles(multiFixture);

  const title = page.locator('.cinematic-title');
  await expect(title.getByRole('heading', { level: 1 })).toContainText(
    'Investigate the auth failure, fix it, and run the tests',
    { timeout: 20_000 },
  );
  await page.locator('.cinematic-transport input[type="range"]').fill('0');
  await expect(title.locator('p')).toHaveText('A user message became new work for the Agent.');
  await expect(page.locator('.cinematic-inspector')).toContainText('observed · REQUEST_ARRIVED');
  await expect(page.locator('.cinematic-inspector')).not.toContainText('Decision:');
  await expect(title).toContainText(/MODEL\s+\d+\/3/);
  await expect(title).toContainText(/TOOLS\s+\d+\/4/);
  expect(errors.filter((message) => !/deprecated/i.test(message)), errors.join('\n')).toEqual([]);
});

test('importing incompatible Session opens Evidence Explorer fallback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?quality=fallback');
  await page.locator('.cinematic-top-actions input[type="file"]').setInputFiles(sessionFixture);

  await expect(page.getByRole('heading', { name: 'PI CITY' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.import-fallback-notice')).toContainText(
    'no compatible guided lesson yet',
  );
  await expect(page.locator('.import-fallback-notice')).toContainText(
    'evidence-preserving explorer',
  );
  expect(errors.filter((message) => !/deprecated/i.test(message)), errors.join('\n')).toEqual([]);
});

test('Photo Mode never replaces an imported run without consent', async ({ page }) => {
  await page.goto('/?quality=fallback');
  await page.locator('.cinematic-top-actions input[type="file"]').setInputFiles(multiFixture);
  const runTitle = page.getByRole('heading', {
    level: 1,
    name: 'Investigate the auth failure, fix it, and run the tests',
  });
  await expect(runTitle).toBeVisible();

  await page.keyboard.press('1');
  const confirmation = page.getByRole('dialog', { name: 'Switch to bundled Photo Mode?' });
  await expect(confirmation).toContainText('replace your imported run in this view');
  await expect(runTitle).toBeVisible();

  await confirmation.getByRole('button', { name: 'Stay with my run' }).click();
  await expect(confirmation).toHaveCount(0, { timeout: 15_000 });
  await expect(runTitle).toBeVisible();
  await expect(page).toHaveURL((url) => !url.searchParams.has('frame'));
});

test('Photo Mode asks before replacing a compatible imported auth run', async ({ page }) => {
  await page.goto('/?quality=fallback');
  await page.locator('.cinematic-top-actions input[type="file"]').setInputFiles(authRuntimeFixture);
  await expect(page.locator('.cinematic-title p')).toHaveText(importedNarration);

  await page.keyboard.press('1');
  const confirmation = page.getByRole('dialog', { name: 'Switch to bundled Photo Mode?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Stay with my run' }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(page.locator('.cinematic-title p')).toHaveText(importedNarration);
  await expect(page).toHaveURL((url) => !url.searchParams.has('frame'));

  await page.keyboard.press('1');
  await confirmation.getByRole('button', { name: 'Switch to demo frames' }).click();
  await expect(page.locator('.frame-mode')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.cinematic-title p')).toHaveText(importedNarration);
  await expect(page.locator('.cinematic-app')).toHaveClass(/watch-mode/);
});

test('Photo Mode restores the imported run after an approved demo switch', async ({ page }) => {
  await page.goto('/?quality=fallback');
  await page.locator('.cinematic-top-actions input[type="file"]').setInputFiles(multiFixture);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Investigate the auth failure, fix it, and run the tests',
  );

  await page.keyboard.press('1');
  const confirmation = page.getByRole('dialog', { name: 'Switch to bundled Photo Mode?' });
  await confirmation.getByRole('button', { name: 'Switch to demo frames' }).click();
  await expect(page.locator('.frame-mode')).toHaveCount(1);
  await expect(page).toHaveURL((url) => url.searchParams.get('frame') === 'arrival');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Investigate the auth failure, fix it, and run the tests',
  );
  await expect(page.locator('.cinematic-app')).toHaveClass(/watch-mode/);
  await expect(page).toHaveURL((url) => !url.searchParams.has('frame'));
});
