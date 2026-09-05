// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    // Static pages do not need Workers bindings while Astro prerenders them.
    // On-demand routes such as /api/chat still run in the Worker at runtime.
    prerenderEnvironment: 'node'
  })
});
