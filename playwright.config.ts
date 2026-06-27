import { defineConfig, devices } from '@playwright/test';

/**
 * Scoped Playwright setup — the first browser driver in this repo, added in
 * Slice 8 / Part 4 for two things only:
 *   1. a light smoke pass (e2e/smoke.e2e.ts), and
 *   2. the two-tab overbooking demo capture (e2e/overbooking.e2e.ts).
 *
 * This is deliberately NOT a sprawling E2E suite — the project verifies behavior
 * at the contract level. The dev server (Vite on 5173) and the backend (8080)
 * must be running; we don't manage them here so the capture can be rehearsed by
 * hand against the live stack.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
