import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const multiFixture = resolve('fixtures/multi-tool/runtime.jsonl');
const sessionFixture = resolve('fixtures/auth-bug/session.jsonl');

test('importing multi-tool fixture shows event-derived narration and actual totals', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
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

  await page.goto('/');
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
