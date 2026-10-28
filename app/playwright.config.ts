import { defineConfig, devices } from "@playwright/test";

// Runs against a local Postgres (see .env.test / CI service). Start fresh: pnpm db:migrate && pnpm db:seed with ENV_FILE=.env.test.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3100", ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
  webServer: {
    command: "pnpm start -p 3100",
    url: "http://localhost:3100/survey",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
