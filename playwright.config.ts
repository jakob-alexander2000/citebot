import { defineConfig, devices } from "@playwright/test";

const viewports = [
  { name: "iphone", width: 390, height: 844 },
  { name: "ipad", width: 744, height: 1133 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const browsers = [
  { name: "chromium" as const, device: devices["Desktop Chrome"] },
  { name: "webkit" as const, device: devices["Desktop Safari"] },
];

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: browsers.flatMap((browser) =>
    viewports.map((viewport) => ({
      name: `${browser.name}-${viewport.name}`,
      use: {
        ...browser.device,
        browserName: browser.name,
        viewport: { width: viewport.width, height: viewport.height },
      },
    })),
  ),
});
