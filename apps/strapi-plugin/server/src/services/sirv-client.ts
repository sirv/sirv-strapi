import type { Core } from '@strapi/strapi';

/**
 * Wraps `@sirv/sirv-client` for use inside Strapi services/controllers. Milestone 1 is a
 * placeholder; milestone 2 builds an authed client from the encrypted stored credentials and
 * exposes folder/search/file-info helpers.
 */
const service = ({ strapi: _strapi }: { strapi: Core.Strapi }) => ({
  isConfigured(): boolean {
    return false;
  },
});

export default service;
