/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the shAIder project.
 * Uses jsdom for React component testing.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
});
