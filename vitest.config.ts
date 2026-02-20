import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.e2e.test.ts', 'src/**/*.live.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
      exclude: [
        'src/index.ts',
        'src/utils/prompt.ts',
        'src/utils/spinner.ts',
        'test/**',
        'scripts/**',
        'dist/**',
        'vitest.config.ts',
      ],
    },
  },
});
