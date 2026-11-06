import { defineConfig, type Project } from "@playwright/test";

import { LEARNERS } from "./e2e/learners";

/*
 * End-to-end tests: the static site as GitHub Pages serves it, built in local mode, with Derive's
 * local server answering for it and showing drafts, once for each test learner. Every page is
 * opened at phone, tablet and desktop widths and checked in both themes; the performance budgets
 * are measured once, at desktop width. The first server builds the site and the server.
 */

const CI = Boolean(process.env.CI);

const servers = Object.values(LEARNERS).map((learner, i) => ({
  command: `${i === 0 ? "npm run build && " : ""}node .derive-build/server.mjs --port ${learner.port} --static out`,
  url: `${learner.url}/_derive/api/health`,
  env: {
    DERIVE_LOCAL_STORE: "1",
    NEXT_PUBLIC_DERIVE_LOCAL_STORE: "1",
    NEXT_PUBLIC_BASE_PATH: "",
    NEXT_PUBLIC_DERIVE_API_URL: "",
    DERIVE_LOCAL_DIR: learner.dir,
    DERIVE_SHOW_DRAFTS: "1",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  reuseExistingServer: !CI,
  timeout: 300_000,
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
