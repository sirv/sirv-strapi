import { z } from 'zod';
import { SirvApiError } from './errors.js';
import { type HttpContext, request } from './http.js';
import { createTokenManager } from './token-manager.js';
import {
  type AccountWithToken,
  AccountWithTokenSchema,
  type RestCredentials,
  RestCredentialsSchema,
} from './types.js';

/**
 * The end-user connect flow (email + password + OTP + account picker). This is the "Path B"
 * authentication used by hosts that run server-side code (Strapi, Webflow, Framer): the user
 * never sees a clientId/secret. It is intentionally framework-agnostic - callers pass an
 * HttpContext (from `resolveContext`) and handle persistence themselves.
 *
 * Flow:
 *   1. mintAppToken(appClientId, appClientSecret)         -> app bearer (server-only secret)
 *   2. listUserAccounts(appToken, { email, password, ... }) -> otp | accounts | error
 *   3. getRestCredentials(account.token)                  -> per-account clientId/secret
 *   4. validateAndGetAlias(clientId, clientSecret, ...)   -> canonical delivery alias
 * Then persist the clientId/secret (Path A) and mint bearers via POST /v2/token thereafter.
 *
 * Endpoints `/user/accounts` and `/rest/credentials` are not in the published REST reference;
 * the shapes are taken from the shipping Sirv plugins (Webflow/Framer/Adobe). See
 * docs/sirv-api-notes.md.
 */

/** Roles that may connect an account (owner-equivalent). `user` / `guest` cannot. */
const CONNECTABLE_ROLES = new Set(['owner', 'primaryOwner', 'admin']);

export function isConnectableRole(role?: string): boolean {
  return role ? CONNECTABLE_ROLES.has(role) : false;
}

export interface LoginParams {
  email: string;
  password: string;
  /** Supplied on retry when the account has MFA enabled. */
  otpToken?: string;
}

export type LoginOutcome =
  | { kind: 'otp_required' }
  | { kind: 'accounts'; accounts: AccountWithToken[] }
  | { kind: 'error'; message: string };

interface TokenResponse {
  token: string;
  expiresIn: number;
  scope?: string[];
}

/** Mint an app bootstrap bearer from the plugin's app clientId/secret (POST /v2/token). */
export async function mintAppToken(
  ctx: HttpContext,
  appClientId: string,
  appClientSecret: string,
): Promise<string> {
  const res = await request<TokenResponse>(ctx, '/token', {
    method: 'POST',
    body: { clientId: appClientId, clientSecret: appClientSecret },
  });
  return res.token;
}

/**
 * Log the user in and list the accounts they can access (POST /v2/user/accounts). Returns a
 * discriminated outcome rather than throwing, because OTP-required and bad-credentials are
 * expected control-flow, not exceptional.
 */
export async function listUserAccounts(
  ctx: HttpContext,
  appToken: string,
  params: LoginParams,
): Promise<LoginOutcome> {
  const body: Record<string, string> = { email: params.email, password: params.password };
  if (params.otpToken) body.otpToken = params.otpToken;

  try {
    const raw = await request<unknown>(ctx, '/user/accounts', {
      method: 'POST',
      token: appToken,
      body,
    });
    const parsed = z.array(AccountWithTokenSchema).safeParse(raw);
    return { kind: 'accounts', accounts: parsed.success ? parsed.data : [] };
  } catch (err) {
    if (!(err instanceof SirvApiError)) throw err;
    const errBody = (err.body ?? {}) as { message?: string; error?: string };

    // OTP required: HTTP 417, or 401 "Missing authentication" when no OTP was sent yet.
    const otpRequired =
      err.status === 417 ||
      (err.status === 401 && errBody.message === 'Missing authentication' && !params.otpToken);
    if (otpRequired) return { kind: 'otp_required' };

    let message = errBody.message || errBody.error || `Login failed (${err.status})`;
    if (err.status === 403 || String(message).toLowerCase().includes('forbidden')) {
      message = 'Login details are incorrect. Please check your email and password.';
    }
    return { kind: 'error', message };
  }
}

/** Fetch the selected account's durable REST credentials (GET /v2/rest/credentials). */
export async function getRestCredentials(
  ctx: HttpContext,
  accountToken: string,
): Promise<RestCredentials> {
  const raw = await request<unknown>(ctx, '/rest/credentials', {
    method: 'GET',
    token: accountToken,
  });
  return RestCredentialsSchema.parse(raw);
}

/**
 * Validate a clientId/secret pair by minting a token and reading GET /v2/account, returning the
 * canonical account alias (or the fallback when the account lookup fails).
 */
export async function validateAndGetAlias(
  ctx: HttpContext,
  clientId: string,
  clientSecret: string,
  fallbackAlias: string,
): Promise<string> {
  const tokens = createTokenManager(ctx, { clientId, clientSecret });
  const token = await tokens.getToken();
  try {
    const info = await request<{ alias?: string }>(ctx, '/account', { token });
    return info.alias || fallbackAlias;
  } catch {
    return fallbackAlias;
  }
}
