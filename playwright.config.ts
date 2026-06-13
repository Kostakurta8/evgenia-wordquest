import { defineConfig, devices } from "@playwright/test";

/**
 * E2E specs live in ./e2e (vitest owns ./tests), so the two runners never
 * pick up each other's files. Point PW_BASE at the running dev server if it
 * isn't on :3000.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PW_BASE ?? "http://localhost:3000",
    ...devices["Pixel 7"],
    trace: "off",
  },
});
