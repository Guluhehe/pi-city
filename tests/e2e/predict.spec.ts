import { expect, test } from '@playwright/test';

test('Predict pauses at trace checkpoints and produces a decision-based debrief', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/?quality=fallback');
  await page.getByRole('button', { name: 'Play & Predict' }).click();
  await page.locator('.cinematic-transport select').selectOption('8');

  const predict = page.getByRole('dialog', { name: 'What will the Agent do next?' });
  await expect(predict).toBeVisible({ timeout: 8_000 });
  await expect(predict).toContainText('DERIVED');
  await expect(predict.getByRole('button')).toHaveText(['READ', 'EDIT', 'BASH', 'ANSWER']);
  await predict.getByRole('button', { name: 'READ' }).click();

  const reveal = page.getByRole('dialog', { name: 'Prediction revealed' });
  await expect(reveal).toContainText('Correct');
  await expect(reveal).toContainText('read');
  await reveal.getByRole('button', { name: 'Continue replay' }).click();

  await expect(predict).toBeVisible({ timeout: 10_000 });
  await predict.getByRole('button', { name: 'ANSWER' }).click();
  await expect(reveal).toContainText('Correct');
  await reveal.getByRole('button', { name: 'Continue replay' }).click();

  const debrief = page.getByRole('region', { name: 'Prediction debrief' });
  await expect(debrief).toContainText('2/2', { timeout: 8_000 });
  await expect(debrief).toContainText('READ');
  await expect(debrief).toContainText('ANSWER');
});

test('Predict overlay locks playback and Photo Mode shortcuts', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/?quality=fallback');
  await page.getByRole('button', { name: 'Play & Predict' }).click();
  await page.locator('.cinematic-transport select').selectOption('8');

  const predict = page.getByRole('dialog', { name: 'What will the Agent do next?' });
  await expect(predict).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('.cinematic-transport .play')).toBeDisabled();

  await page.keyboard.press('1');
  await expect(page.getByRole('dialog', { name: 'Switch to bundled Photo Mode?' })).toHaveCount(0);
  await expect(page.locator('.frame-mode')).toHaveCount(0);
  await expect(predict).toBeVisible();
});

test('ordinary Watch never shows Predict controls', async ({ page }) => {
  await page.goto('/?quality=fallback');
  await page.getByRole('button', { name: /Enter the city/ }).click();
  await expect(page.getByRole('dialog', { name: 'What will the Agent do next?' })).toHaveCount(0);
  await expect(page.locator('.cinematic-transport .play')).toBeVisible();
});
