import { assetFromEntry, assetFromSearch, folderFromEntry } from '@sirv/core/assets';
import { buildSearchQuery } from '@sirv/core/search-query';
import { buildImageUrl } from '@sirv/url-builder';
import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../constants';
import { InvalidRequestError, NotConnectedError } from '../errors';
import { parseTypes, respondError } from './util';

/**
 * DAM controller - proxies folder browse / search / file-info / thumbnail / usage to Sirv via
 * the server-held credentials. Responses are normalized to the `DamFolder` / `DamAsset` shapes
 * from `@sirv/core` so the admin DAM browser can consume them directly.
 */
const controller = ({ strapi }: { strapi: Core.Strapi }) => {
  const sirv = () => strapi.plugin(PLUGIN_ID).service('sirv-client');

  return {
    async folder(ctx: any) {
      try {
        const path = typeof ctx.query?.path === 'string' && ctx.query.path ? ctx.query.path : '/';
        const continuation =
          typeof ctx.query?.continuation === 'string' ? ctx.query.continuation : undefined;
        const types = parseTypes(ctx.query?.types);

        const client = await sirv().getClient();
        const res = await client.listFolder({ dirname: path, continuation });

        const folders = res.contents
          .map((entry: any) => folderFromEntry(entry, path))
          .filter((f: unknown): f is NonNullable<typeof f> => f !== null);
        let assets = res.contents
          .map((entry: any) => assetFromEntry(entry, path))
          .filter((a: unknown): a is NonNullable<typeof a> => a !== null);
        if (types.length) assets = assets.filter((a: any) => types.includes(a.type));

        ctx.body = { path, folders, assets, continuation: res.continuation ?? null };
      } catch (err) {
        respondError(ctx, err);
      }
    },

    async search(ctx: any) {
      try {
        const q = typeof ctx.query?.q === 'string' ? ctx.query.q : '';
        const types = parseTypes(ctx.query?.types);
        const from = Number.parseInt(ctx.query?.from ?? '0', 10) || 0;
        const size = Math.min(Number.parseInt(ctx.query?.size ?? '50', 10) || 50, 1000);

        const client = await sirv().getClient();
        const query = buildSearchQuery(q, types);
        const res = await client.searchFiles({ query, from, size });

        let assets = res.hits
          .map((hit: any) => assetFromSearch(hit._source))
          .filter((a: unknown): a is NonNullable<typeof a> => a !== null);
        if (types.length) assets = assets.filter((a: any) => types.includes(a.type));

        ctx.body = { assets, total: res.total ?? assets.length, scrollId: res.scrollId ?? null };
      } catch (err) {
        respondError(ctx, err);
      }
    },

    async file(ctx: any) {
      try {
        const filename = ctx.query?.filename;
        if (typeof filename !== 'string' || !filename) {
          throw new InvalidRequestError('filename is required.');
        }
        const client = await sirv().getClient();
        ctx.body = { file: await client.getFileInfo(filename) };
      } catch (err) {
        respondError(ctx, err);
      }
    },

    async thumb(ctx: any) {
      try {
        const filename = ctx.query?.filename;
        if (typeof filename !== 'string' || !filename) {
          throw new InvalidRequestError('filename is required.');
        }
        const size = Math.min(Number.parseInt(ctx.query?.size ?? '256', 10) || 256, 1024);
        const creds = await sirv().getStoredCredentials();
        if (!creds) throw new NotConnectedError();
        const host = creds.deliveryAlias ?? `${creds.accountAlias}.sirv.com`;
        ctx.body = {
          url: buildImageUrl({ alias: host, path: filename }, { width: size, height: size }),
        };
      } catch (err) {
        respondError(ctx, err);
      }
    },

    async usage(ctx: any) {
      try {
        const client = await sirv().getClient();
        ctx.body = { usage: await client.getUsage() };
      } catch (err) {
        respondError(ctx, err);
      }
    },
  };
};

export default controller;
