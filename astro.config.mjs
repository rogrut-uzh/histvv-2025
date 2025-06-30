import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  /*site: 'http://localhost',*/
  site: process.env.SITE_URL,
  vite: {
    resolve: {
      alias: {
        '~': new URL('./src', import.meta.url).pathname,
      },
    },
  },
  integrations: [react()],
  compressHTML: true,
});
