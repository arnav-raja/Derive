import { defineConfig, type Project } from "@playwright/test";

import { LEARNERS } from "./e2e/learners";

/*
 * End-to-end tests: the production build, run in local mode with drafts shown, once for each test
 * learner. Every page is opened at phone, tablet and desktop widths and checked in both themes;
 * the performance budgets are measured once, at desktop width. The first server builds the app.
 */

const CI = Boolean(process.env.CI);

const servers = Object.values(LEARNERS).map((learner, i) => ({
  command: i === 0 ? `npx next build && npx next start -p ${learner.port}` : `npx next start -p ${learner.port}`,
  url: `${learner.url}/api/health`,
  env: { DERIVE_LOCAL_STORE: "1", DERIVE_LOCAL_DIR: learner.dir, DERIVE_SHOW_DRAFTS: "1", NEXT_TELEMETRY_DISABLED: "1" },
  reuseExistingServer: !CI,
  timeout: 240_000,
  stdout: "ignore" as const,
  stderr: "pipe" as const,
}));

const sizes: Project[] = [
  { name: "phone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  { name: "tablet", use: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true } },
  { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
];

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 4,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    browserName: "chromium",
    deviceScaleFactor: 1,
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    ...sizes.map((p) => ({ ...p, testIgnore: /performance\.spec\.ts/ })),
    { name: "performance", testMatch: /performance\.spec\.ts/, use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: servers,
});
