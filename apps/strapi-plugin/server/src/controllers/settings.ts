import type { Core } from '@strapi/strapi';

/**
 * Settings controller. `find` reports connection status WITHOUT exposing any secret material
 * (hard constraint: Sirv credentials never reach the browser). Milestone 1 always reports
 * "not connected"; milestone 3 reads the encrypted plugin store.
 */
const controller = ({ strapi: _strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    ctx.body = { connected: false };
  },

  async update(ctx: any) {
    // Milestone 7: persist default transformations etc.
    ctx.body = { connected: false };
  },
});

export default controller;
