import { test, expect } from '@playwright/test';

test.describe('Shader Flow and Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to be fully interactive
    await page.waitForLoadState('networkidle');
  });

  test('UI shows error banner when global error callback is triggered', async ({ page }) => {
    // Wait a bit for React to mount and Scene to register its callback
    await page.waitForTimeout(2000);

    // Manually trigger the callback that Three.js would call on error
    await page.evaluate(() => {
      if (window.__GLSL_ERROR_CALLBACK__) {
        window.__GLSL_ERROR_CALLBACK__('MOCK ERROR: THREE.WebGLProgram: shader error: intentional mock error');
      } else {
        throw new Error('window.__GLSL_ERROR_CALLBACK__ not found');
      }
    });
    
    // UI should show error banner
    const errorBanner = page.locator('text=Shader compilation failed');
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=FIX WITH AI (REFINE)')).toBeVisible();

    // Now type something valid to see if it clears
    await page.click('button:has-text("Vertex")');
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.type('// clearing error', { delay: 10 });
    
    // Banner should disappear
    await expect(errorBanner).not.toBeVisible();
  });

  test('can apply material and object from library', async ({ page }) => {
    // Apply Lava
    await page.click('button:has-text("Molten Lava")');
    await expect(page.locator('text=Library: Applied material "Molten Lava"')).toBeVisible();
    
    // Apply Torus Knot
    await page.click('button[title="Objects"]');
    await page.click('button:has-text("Torus Knot")');
    await expect(page.locator('text=Library: Changed object to Torus Knot')).toBeVisible();
  });
});
