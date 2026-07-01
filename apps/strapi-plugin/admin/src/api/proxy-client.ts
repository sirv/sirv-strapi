import type { SirvClient } from '@sirv/sirv-client';
import type { AdminFetchClient } from './sirv-api';

/**
 * A `SirvClient`-shaped adapter that routes every call through the plugin's own `/sirv/dam/*`
 * admin endpoints instead of talking to Sirv directly. This lets the `@sirv/core` data hooks
 * (`useFolders`, `useSearch`) and browser run UNCHANGED in the Strapi admin while the actual Sirv
 * credentials stay server-side. The server returns raw Sirv responses; the hooks normalize them.
 */
export function createProxyClient(client: AdminFetchClient): SirvClient {
  const get = async <T>(url: string): Promise<T> => (await client.get<T>(url)).data;

  return {
    baseUrl: '/sirv',

    // Not used client-side (the server holds/mints the bearer). Present to satisfy the interface.
    getToken: async () => '',

    listFolder: ({ dirname, continuation }) => {
      const params = new URLSearchParams({ dirname });
      if (continuation) params.set('continuation', continuation);
      return get(`/sirv/dam/folder?${params.toString()}`);
    },

    searchFiles: ({ query, from, size }) => {
      const params = new URLSearchParams({ query });
      if (from != null) params.set('from', String(from));
      if (size != null) params.set('size', String(size));
      return get(`/sirv/dam/search?${params.toString()}`);
    },

    searchScroll: async () => {
      throw new Error('Scrolling search is not available through the Strapi proxy.');
    },

    getFileInfo: (filename) => get(`/sirv/dam/file?filename=${encodeURIComponent(filename)}`),

    getAccountInfo: () => get('/sirv/dam/account'),

    getUsage: () => get('/sirv/usage'),

    getBillingPlan: async () => {
      throw new Error('Billing plan is not exposed through the Strapi proxy.');
    },
  };
}
