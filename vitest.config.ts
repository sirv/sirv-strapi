import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // React-facing code needs a DOM; pure libs run faster under node.
    environmentMatchGlobs: [
      ['packages/core/**', 'jsdom'],
      ['apps/strapi-plugin/admin/**', 'jsdom'],
    ],
    include: [
      'packages/*/src/**/*.test.{ts,tsx}',
      'apps/strapi-plugin/**/src/**/*.test.{ts,tsx}',
      'tests/**/*.test.ts',
    ],
    // The live test hits the real Sirv API; opt in via `pnpm test:live`.
    exclude: ['**/node_modules/**', '**/dist/**', '**/live.test.ts'],
  },
});
