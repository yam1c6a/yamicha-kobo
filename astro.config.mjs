// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  vite: {
    server: { allowedHosts: ['terminal.local'] }
  },
  adapter: cloudflare({
    // Static pages do not need Workers bindings while Astro prerenders them.
    // On-demand routes such as /api/chat still run in the Worker at runtime.
    prerenderEnvironment: 'node',
    // Local UI previews must not connect to remote Workers AI bindings.
    // Normal development, builds, and deployed Workers retain their defaults.
    ...(process.env.ATELIER_LOCAL_PREVIEW === '1'
      ? { inspectorPort: false, remoteBindings: false }
      : {})
  })
});
