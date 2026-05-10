import { test, expect } from '@playwright/test';

test('basic UI check', async ({ page }) => {
  await page.goto('/');
  
  // Check title
  await expect(page).toHaveTitle(/shAIder/i);
  
  // Check for the Export button
  const exportBtn = page.getByRole('button', { name: /Export/i });
  await expect(exportBtn).toBeVisible();
  
  // Check for the Generate button
  const generateBtn = page.getByRole('button', { name: /Run All/i });
  await expect(generateBtn).toBeVisible();
  
  // Check if Canvas exists
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});
