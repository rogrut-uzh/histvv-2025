import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  site: process.env.SITE_URL,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  vite: { resolve: { alias: { '~': new URL('./src', import.meta.url).pathname } } },
  compressHTML: true,
});

//import { defineConfig } from 'astro/config';
//import react from '@astrojs/react';

//export default defineConfig({
  // SITE_URL is set here:
  // For local development:     .env.production
  // For cloud TEST and PROD:   .gitlab.ci.yml
//  site: process.env.SITE_URL, 
//  vite: {
//    resolve: {
//      alias: {
//        '~': new URL('./src', import.meta.url).pathname,
//      },
//    },
//  },
//  integrations: [react()],
//  compressHTML: true,
//});
