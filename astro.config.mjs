import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  site: process.env.SITE_URL,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  compressHTML: true,
  vite: { 
    resolve: { 
      alias: { '~': new URL('./src', import.meta.url).pathname } 
    }
  }
});

/*
// -------- debug version, ohne minify ---------------
export default defineConfig({
  site: process.env.SITE_URL,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  compressHTML: false,
  vite: { 
    resolve: { 
      alias: { '~': new URL('./src', import.meta.url).pathname } 
    },
    build: {
      minify: false  // Explizit erzwingen
    }
  }
});
*/

// Anmerkung zu site:
//
// site ist optional bei output: 'server'. 
// Es wird für absolute URLs in Integrationen gebraucht 
// (z. B. @astrojs/sitemap, @astrojs/rss, OG-Bild-Hilfen) 
// und als Fallback für Astro.url bei statischem Build.
//
// Ohne site funktionieren Server-Routen, 
// aber Integrationen erzeugen dann keine korrekten 
// absoluten URLs.
//
// Bei output: 'server' ist Astro.url immer vorhanden. 
// Bei statischem Build wäre Astro.url ohne site undefiniert.
