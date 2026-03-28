import { test, expect } from '@playwright/test';

test.describe('Shader Flow and Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('can apply material from library', async ({ page }) => {
    // Click on Molten Lava material
    const lavaButton = page.locator('button:has-text("Molten Lava")');
    await lavaButton.click();

    // Check if prompt was updated
    const shaderPrompt = page.locator('textarea[placeholder*="Describe the visual effect"]');
    await expect(shaderPrompt).toHaveValue(/Molten Lava/i);
    
    // Check if log entry appeared
    await expect(page.locator('text=Library: Applied material "Molten Lava"')).toBeVisible();
  });

  test('can apply object from library', async ({ page }) => {
    // Switch to Objects tab
    await page.click('button[title="Objects"]');
    
    // Click on Torus Knot
    await page.click('button:has-text("Torus Knot")');
    
    // Check if log entry appeared
    await expect(page.locator('text=Library: Changed object to Torus Knot')).toBeVisible();
  });

  test('manual shader editing updates the scene state', async ({ page }) => {
    // Switch to Vertex tab
    await page.click('button:has-text("Vertex")');
    
    const editor = page.locator('.cm-content');
    const originalText = await editor.innerText();
    
    // Type something new
    await editor.click();
    await page.keyboard.type('// manual edit test\n');
    
    const newText = await editor.innerText();
    expect(newText).not.toBe(originalText);
  });

  test('shows error banner on invalid shader', async ({ page }) => {
    test.slow();

    // Switch to Vertex tab (Vertex errors are very reliable)
    await page.click('button:has-text("Vertex")');
    
    const editor = page.locator('.cm-content');
    
    // Clear and insert an invalid shader
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('void main() { this_is_invalid_glsl_code; }', { delay: 10 });
    
    // Wait for error banner with a longer timeout
    const errorBanner = page.locator('text=Shader compilation failed');
    await expect(errorBanner).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=FIX WITH AI (REFINE)')).toBeVisible();
  });
});
