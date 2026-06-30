import type { Core } from '@strapi/strapi';

/**
 * DAM controller - proxies folder browse / search / file-info / thumbnail requests to Sirv
 * using the server-held tokens. Milestone 1 ships stubs; milestone 2 implements them on top
 * of `@sirv/sirv-client`.
 */
const notImplemented = (ctx: any) => {
  ctx.status = 501;
  ctx.body = { error: 'Not implemented yet (milestone 2).' };
};

const controller = ({ strapi: _strapi }: { strapi: Core.Strapi }) => ({
  async folder(ctx: any) {
    notImplemented(ctx);
  },
  async search(ctx: any) {
    notImplemented(ctx);
  },
  async file(ctx: any) {
    notImplemented(ctx);
  },
  async thumb(ctx: any) {
    notImplemented(ctx);
  },
  async usage(ctx: any) {
    notImplemented(ctx);
  },
});

export default controller;
