import { test, expect } from '@playwright/test';

test('has title and basic UI elements', async ({ page }) => {
  await page.goto('/');

  // Check if main UI labels are present
  await expect(page.locator('text=Shader Description')).toBeVisible();
  await expect(page.locator('text=Scene Description')).toBeVisible();
  await expect(page.locator('text=Run All')).toBeVisible();
  
  // Check if Canvas is rendered
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});

test('can toggle sidebar', async ({ page }) => {
  await page.goto('/');
  
  // Sidebar should be visible by default (check for Vertex tab)
  await expect(page.locator('text=Vertex')).toBeVisible();
  
  // Click toggle button (title "Hide Sidebar")
  await page.click('button[title="Hide Sidebar"]');
  
  // Vertex tab should be gone
  await expect(page.locator('text=Vertex')).not.toBeVisible();
});
