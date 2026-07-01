import { type SirvClient, type StoredCredentials, createSirvClient } from '@sirv/sirv-client';
import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../constants';
import { NotConnectedError } from '../errors';

/**
 * Builds an authed `@sirv/sirv-client` from the stored per-account REST credentials and exposes
 * the proxy surface the DAM controllers need. Bearer tokens are minted/cached/refreshed inside
 * the client from clientId/secret; we never persist a bearer.
 */
const service = ({ strapi }: { strapi: Core.Strapi }) => {
  const tokenStorage = () => strapi.plugin(PLUGIN_ID).service('token-storage');

  async function getStoredCredentials(): Promise<StoredCredentials | null> {
    return tokenStorage().read();
  }

  async function getClient(): Promise<SirvClient> {
    const creds = await getStoredCredentials();
    if (!creds) throw new NotConnectedError();
    return createSirvClient({ clientId: creds.clientId, clientSecret: creds.clientSecret });
  }

  return {
    getStoredCredentials,
    getClient,

    /** Connection status for the admin (never includes secret material). */
    async getStatus(): Promise<{
      connected: boolean;
      accountAlias?: string;
      deliveryAlias?: string;
    }> {
      const creds = await getStoredCredentials();
      if (!creds) return { connected: false };
      return {
        connected: true,
        accountAlias: creds.accountAlias,
        deliveryAlias: creds.deliveryAlias,
      };
    },
  };
};

export default service;
