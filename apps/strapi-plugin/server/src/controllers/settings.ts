import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../constants';
import { respondError } from './util';

/**
 * Settings controller. `find` reports connection status (connected account alias + delivery
 * alias) WITHOUT exposing any secret material.
 */
const controller = ({ strapi }: { strapi: Core.Strapi }) => {
  const sirv = () => strapi.plugin(PLUGIN_ID).service('sirv-client');

  return {
    async find(ctx: any) {
      try {
        ctx.body = await sirv().getStatus();
      } catch (err) {
        respondError(ctx, err);
      }
    },
  };
};

export default controller;
