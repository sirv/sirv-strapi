import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from './constants';

/**
 * Server-side half of the custom field registration. The admin half (the Input component) is
 * registered in `admin/src/index.ts`; here we declare the field so Strapi knows how to store
 * it and how big the input is. The underlying type is `json` (a `SirvFieldValue` object).
 */
const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.customFields.register({
    name: 'sirv-media',
    plugin: PLUGIN_ID,
    type: 'json',
    inputSize: {
      default: 12,
      isResizable: true,
    },
  });
};

export default register;
