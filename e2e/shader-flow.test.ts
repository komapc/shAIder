import { test, expect, Page } from '@playwright/test';

const VALID_SHADER = {
  vertexShader: [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform float time;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}',
  ].join('\n'),
  fragmentShader: [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform float time;',
    'void main() {',
    '  vec3 color = 0.5 + 0.5 * cos(time + vUv.xyx + vec3(0.0, 2.0, 4.0));',
    '  gl_FragColor = vec4(color, 1.0);',
    '}',
  ].join('\n'),
  uniforms: [{ name: 'time', type: 'float', value: 0, min: 0, max: 10 }],
  sceneObjects: [{ id: 'main-obj', objectType: 'sphere', position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] }],
};

// Missing semicolon after vec4(1.0) — guaranteed GLSL syntax error
const BROKEN_SHADER = {
  ...VALID_SHADER,
  fragmentShader: [
    'precision highp float;',
    'void main() {',
    '  vec4 color = vec4(1.0)',
    '  gl_FragColor = color;',
    '}',
  ].join('\n'),
};

async function mockApi(page: Page, response: object) {
  await page.route('**/api/generate-shader', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) })
  );
}

// Matches only the FixOverlay heading, not the log entry
const errorHeading = (page: Page) =>
  page.getByRole('heading', { name: 'GLSL Compilation Error' });

test.describe('Shader Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('valid shader: shows "Compilation successful" and no error overlay', async ({ page }) => {
    await mockApi(page, VALID_SHADER);

    await page.locator('textarea').first().fill('A colorful rainbow cycling sphere');
    await page.click('button:has-text("Run All")');

    await expect(page.locator('text=Compiling...')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Compilation successful')).toBeVisible({ timeout: 10000 });
    await expect(errorHeading(page)).not.toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('broken shader: all retries fail → stable error overlay with Fix button', async ({ page }) => {
    // Serve broken for all calls so auto-retries exhaust and overlay becomes stable
    await mockApi(page, BROKEN_SHADER);

    await page.locator('textarea').first().fill('Intentionally broken shader');
    await page.click('button:has-text("Run All")');

    // Wait for all 5 retries to finish
    await expect(page.locator('text=Max retries reached')).toBeVisible({ timeout: 20000 });

    // Overlay should now be stably visible
    await expect(errorHeading(page)).toBeVisible();
    await expect(page.locator('text=FIX WITH AI (REFINE)')).toBeVisible();
  });

  test('auto-recovery: broken first call → valid retry → compilation succeeds', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/generate-shader', (route) => {
      callCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(callCount === 1 ? BROKEN_SHADER : VALID_SHADER),
      });
    });

    await page.click('button:has-text("Run All")');

    // Auto-retry should recover without user intervention
    await expect(page.locator('text=Compilation successful')).toBeVisible({ timeout: 15000 });
    await expect(errorHeading(page)).not.toBeVisible();
  });

  test('reset button restores the default prompt text', async ({ page }) => {
    const promptArea = page.locator('textarea').first();
    const defaultText = await promptArea.inputValue();

    await promptArea.fill('Something completely different');
    await page.click('button:has-text("Reset")');

    await expect(promptArea).toHaveValue(defaultText);
  });

  test('scene with multiple geometry types compiles successfully', async ({ page }) => {
    await mockApi(page, {
      ...VALID_SHADER,
      sceneObjects: [
        { id: 'obj-1', objectType: 'sphere',   position: [ 0, 0,  0], scale: [1, 1, 1], rotation: [0, 0, 0] },
        { id: 'obj-2', objectType: 'box',      position: [ 2, 0,  0], scale: [1, 1, 1], rotation: [0, 0, 0] },
        { id: 'obj-3', objectType: 'torus',    position: [-2, 0,  0], scale: [1, 1, 1], rotation: [0, 0, 0] },
        { id: 'obj-4', objectType: 'cylinder', position: [ 0, 0,  2], scale: [1, 1, 1], rotation: [0, 0, 0] },
        { id: 'obj-5', objectType: 'pyramid',  position: [ 0, 0, -2], scale: [1, 1, 1], rotation: [0, 0, 0] },
      ],
    });

    await page.locator('textarea').nth(1).fill('A sphere, box, torus, cylinder and pyramid');
    await page.click('button:has-text("Run All")');

    await expect(page.locator('text=Compilation successful')).toBeVisible({ timeout: 10000 });
  });

  test('library material applies to prompt and generates', async ({ page }) => {
    await mockApi(page, VALID_SHADER);

    await page.click('button:has-text("Molten Lava")');
    await expect(page.locator('text=Library: Applied material "Molten Lava"')).toBeVisible();

    await page.click('button:has-text("Run All")');
    await expect(page.locator('text=Compilation successful')).toBeVisible({ timeout: 10000 });
  });

  test('export button downloads a file after a successful generation', async ({ page }) => {
    await mockApi(page, VALID_SHADER);

    await page.click('button:has-text("Run All")');
    await expect(page.locator('text=Compilation successful')).toBeVisible({ timeout: 10000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export")'),
    ]);
    expect(download.suggestedFilename()).toBe('shaider-export.html');
  });
});
