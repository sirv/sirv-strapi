import type { Core } from '@strapi/strapi';

/**
 * Auth controller - proxies the Sirv end-user login flow (email + password + OTP + account
 * picker) server-side so credentials never touch the browser. Milestone 1 ships stubs that
 * report "not implemented"; milestones 2-4 wire these to `@sirv/sirv-client` and the
 * encrypted token store.
 */
const notImplemented = (ctx: any) => {
  ctx.status = 501;
  ctx.body = { error: 'Not implemented yet (milestones 2-4).' };
};

const controller = ({ strapi: _strapi }: { strapi: Core.Strapi }) => ({
  async login(ctx: any) {
    notImplemented(ctx);
  },
  async verifyOtp(ctx: any) {
    notImplemented(ctx);
  },
  async accounts(ctx: any) {
    notImplemented(ctx);
  },
  async selectAccount(ctx: any) {
    notImplemented(ctx);
  },
  async logout(ctx: any) {
    ctx.body = { connected: false };
  },
});

export default controller;
