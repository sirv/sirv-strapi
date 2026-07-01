import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../constants';
import { respondError } from './util';

/**
 * Settings controller. `find` reports connection status + default transformations (never any
 * secret material). `update` persists the default transformations.
 */
const controller = ({ strapi }: { strapi: Core.Strapi }) => {
  const sirv = () => strapi.plugin(PLUGIN_ID).service('sirv-client');
  const preferences = () => strapi.plugin(PLUGIN_ID).service('preferences');

  return {
    async find(ctx: any) {
      try {
        const [status, defaults] = await Promise.all([sirv().getStatus(), preferences().read()]);
        ctx.body = { ...status, defaults };
      } catch (err) {
        respondError(ctx, err);
      }
    },

    async update(ctx: any) {
      try {
        const input = ctx.request.body?.defaults ?? ctx.request.body ?? {};
        const defaults = await preferences().write(input);
        const status = await sirv().getStatus();
        ctx.body = { ...status, defaults };
      } catch (err) {
        respondError(ctx, err);
      }
    },
  };
};

export default controller;
