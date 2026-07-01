import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../constants';
import { InvalidRequestError } from '../errors';
import { respondError } from './util';

/**
 * DAM controller - a thin authenticated proxy to Sirv. It returns the RAW Sirv responses
 * (readdir / search / stat / account / storage); the admin's `@sirv/core` hooks do the
 * normalization, classification, filtering and pagination client-side. The server's only job is
 * to hold the credentials and forward the call. No secret material is ever returned.
 */
const controller = ({ strapi }: { strapi: Core.Strapi }) => {
  const sirv = () => strapi.plugin(PLUGIN_ID).service('sirv-client');

  return {
    /** GET /sirv/dam/folder?dirname=&continuation= -> ReaddirResponse */
    async folder(ctx: any) {
      try {
        const dirname =
          typeof ctx.query?.dirname === 'string' && ctx.query.dirname ? ctx.query.dirname : '/';
        const continuation =
          typeof ctx.query?.continuation === 'string' ? ctx.query.continuation : undefined;
        const client = await sirv().getClient();
        ctx.body = await client.listFolder({ dirname, continuation });
      } catch (err) {
        respondError(ctx, err);
      }
    },

    /** GET /sirv/dam/search?query=&from=&size=&scroll= -> SearchResponse */
    async search(ctx: any) {
      try {
        const query = typeof ctx.query?.query === 'string' ? ctx.query.query : '';
        if (!query) throw new InvalidRequestError('query is required.');
        const from = Number.parseInt(ctx.query?.from ?? '0', 10) || 0;
        const size = Math.min(Number.parseInt(ctx.query?.size ?? '50', 10) || 50, 1000);
        const client = await sirv().getClient();
        ctx.body = await client.searchFiles({ query, from, size });
      } catch (err) {
        respondError(ctx, err);
      }
    },

    /** GET /sirv/dam/file?filename= -> FileStat */
    async file(ctx: any) {
      try {
        const filename = ctx.query?.filename;
        if (typeof filename !== 'string' || !filename) {
          throw new InvalidRequestError('filename is required.');
        }
        const client = await sirv().getClient();
        ctx.body = await client.getFileInfo(filename);
      } catch (err) {
        respondError(ctx, err);
      }
    },

    /** GET /sirv/dam/account -> AccountInfo (alias / delivery host for building URLs) */
    async account(ctx: any) {
      try {
        const client = await sirv().getClient();
        ctx.body = await client.getAccountInfo();
      } catch (err) {
        respondError(ctx, err);
      }
    },

    /** GET /sirv/usage -> StorageUsage */
    async usage(ctx: any) {
      try {
        const client = await sirv().getClient();
        ctx.body = await client.getUsage();
      } catch (err) {
        respondError(ctx, err);
      }
    },
  };
};

export default controller;
