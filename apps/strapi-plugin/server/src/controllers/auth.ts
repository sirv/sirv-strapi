import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../constants';
import { InvalidRequestError } from '../errors';
import { respondError } from './util';

/**
 * Auth controller - the email/password/OTP/account-picker flow runs entirely server-side
 * (credentials never reach the browser). Delegates to the `auth` service; maps results and
 * typed errors to HTTP.
 */
const controller = ({ strapi }: { strapi: Core.Strapi }) => {
  const auth = () => strapi.plugin(PLUGIN_ID).service('auth');

  function loginBody(ctx: any): { email: string; password: string; otpToken?: string } {
    const { email, password, otpToken } = ctx.request.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new InvalidRequestError('email and password are required.');
    }
    return { email, password, otpToken: typeof otpToken === 'string' ? otpToken : undefined };
  }

  return {
    async login(ctx: any) {
      try {
        const result = await auth().login(loginBody(ctx));
        if (result.stage === 'error') {
          ctx.status = 400;
          ctx.body = { error: result.message };
          return;
        }
        ctx.body = result;
      } catch (err) {
        respondError(ctx, err);
      }
    },

    async verifyOtp(ctx: any) {
      try {
        const body = loginBody(ctx);
        if (!body.otpToken) throw new InvalidRequestError('otpToken is required.');
        const result = await auth().login(body);
        if (result.stage === 'error') {
          ctx.status = 400;
          ctx.body = { error: result.message };
          return;
        }
        ctx.body = result;
      } catch (err) {
        respondError(ctx, err);
      }
    },

    async accounts(ctx: any) {
      try {
        const connectSessionId = ctx.query?.connectSessionId;
        if (typeof connectSessionId !== 'string') {
          throw new InvalidRequestError('connectSessionId is required.');
        }
        ctx.body = { accounts: await auth().accounts(connectSessionId) };
      } catch (err) {
        respondError(ctx, err);
      }
    },

    async selectAccount(ctx: any) {
      try {
        const { connectSessionId, alias } = ctx.request.body ?? {};
        if (typeof connectSessionId !== 'string' || typeof alias !== 'string') {
          throw new InvalidRequestError('connectSessionId and alias are required.');
        }
        const account = await auth().selectAccount(connectSessionId, alias);
        ctx.body = { stage: 'connected', account };
      } catch (err) {
        respondError(ctx, err);
      }
    },

    /** Fallback / self-hosted connect with a pasted REST clientId/secret. */
    async connectWithCredentials(ctx: any) {
      try {
        const { clientId, clientSecret, accountAlias } = ctx.request.body ?? {};
        if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
          throw new InvalidRequestError('clientId and clientSecret are required.');
        }
        const account = await auth().connectWithCredentials({
          clientId,
          clientSecret,
          accountAlias: typeof accountAlias === 'string' ? accountAlias : undefined,
        });
        ctx.body = { stage: 'connected', account };
      } catch (err) {
        respondError(ctx, err);
      }
    },

    async logout(ctx: any) {
      try {
        await auth().logout();
        ctx.body = { connected: false };
      } catch (err) {
        respondError(ctx, err);
      }
    },
  };
};

export default controller;
