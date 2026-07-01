import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../constants';

/** Default transformations applied to picked assets unless overridden per field. Not secret. */
export interface SirvDefaults {
  quality?: number;
  format?: 'optimal' | 'webp' | 'jpg' | 'png' | 'original';
}

const KEY = 'preferences';
const FORMATS = new Set(['optimal', 'webp', 'jpg', 'png', 'original']);

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  const store = () => strapi.store({ type: 'plugin', name: PLUGIN_ID });

  return {
    async read(): Promise<SirvDefaults> {
      const value = await store().get({ key: KEY });
      return value && typeof value === 'object' ? (value as SirvDefaults) : {};
    },

    async write(input: SirvDefaults): Promise<SirvDefaults> {
      const clean: SirvDefaults = {};
      if (typeof input.quality === 'number' && Number.isFinite(input.quality)) {
        clean.quality = Math.max(1, Math.min(100, Math.round(input.quality)));
      }
      if (typeof input.format === 'string' && FORMATS.has(input.format)) {
        clean.format = input.format as SirvDefaults['format'];
      }
      await store().set({ key: KEY, value: clean });
      return clean;
    },
  };
};

export default service;
