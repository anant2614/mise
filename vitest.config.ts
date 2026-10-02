import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Pure logic + the full pipeline against in-memory fakes, in Node.
        test: { name: "unit", include: ["test/unit/**/*.test.ts", "test/eval/**/*.test.ts"], environment: "node" },
      },
      {
        // The real Worker + InboxAgent Durable Object, running in workerd.
        plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.test.jsonc" } })],
        test: { name: "worker", include: ["test/worker/**/*.test.ts"] },
      },
    ],
  },
});
