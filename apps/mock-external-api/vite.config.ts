import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/mock-external-api',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'mock-external-api',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    reporters: ['default'],
    passWithNoTests: false,
    coverage: {
      reportsDirectory: '../../coverage/apps/mock-external-api',
      provider: 'v8' as const,
    },
  },
}));
