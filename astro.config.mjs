import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'http://localhost:3000',
  vite: {
    resolve: {
      alias: {
        '~': new URL('./src', import.meta.url).pathname,
      },
    },
  },
});
