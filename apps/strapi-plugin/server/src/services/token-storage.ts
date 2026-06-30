import { type StoredCredentials, StoredCredentialsSchema } from '@sirv/sirv-client';
import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../constants';

/**
 * The Strapi implementation of the TokenStorage seam (`@sirv/core`). Persists the durable
 * per-account REST credentials (clientId/secret + alias) encrypted in Strapi's plugin store,
 * server-side only. This is the durable secret that lets later sessions skip the connect flow.
 */

const STORE_KEY = 'credentials';

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  const store = () => strapi.store({ type: 'plugin', name: PLUGIN_ID });
  const encryption = () => strapi.plugin(PLUGIN_ID).service('encryption');

  return {
    async read(): Promise<StoredCredentials | null> {
      const blob = await store().get({ key: STORE_KEY });
      if (typeof blob !== 'string' || blob.length === 0) return null;
      try {
        const json = encryption().decrypt(blob);
        const parsed = StoredCredentialsSchema.safeParse(JSON.parse(json));
        return parsed.success ? parsed.data : null;
      } catch {
        // Corrupt or undecryptable (e.g. APP_KEYS rotated): treat as not connected.
        return null;
      }
    },

    async write(credentials: StoredCredentials): Promise<void> {
      const blob = encryption().encrypt(JSON.stringify(credentials));
      await store().set({ key: STORE_KEY, value: blob });
    },

    async clear(): Promise<void> {
      await store().delete({ key: STORE_KEY });
    },
  };
};

export default service;
