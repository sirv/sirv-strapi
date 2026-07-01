import { describe, expect, it } from 'vitest';
import {
  getRestCredentials,
  isConnectableRole,
  listUserAccounts,
  mintAppToken,
  validateAndGetAlias,
} from './connect.js';
import { resolveContext } from './http.js';
import { TOKEN_OK, mockFetch } from './test-utils.js';

const ctxWith = (fetch: ReturnType<typeof mockFetch>['fetch']) => resolveContext({ fetch });

describe('isConnectableRole', () => {
  it('accepts owner-equivalent roles only', () => {
    expect(isConnectableRole('owner')).toBe(true);
    expect(isConnectableRole('primaryOwner')).toBe(true);
    expect(isConnectableRole('admin')).toBe(true);
    expect(isConnectableRole('user')).toBe(false);
    expect(isConnectableRole('guest')).toBe(false);
    expect(isConnectableRole(undefined)).toBe(false);
  });
});

describe('mintAppToken', () => {
  it('POSTs app credentials to /token and returns the bearer', async () => {
    const { fetch, calls } = mockFetch(() => TOKEN_OK);
    const token = await mintAppToken(ctxWith(fetch), 'app-id', 'app-secret');
    expect(token).toBe('minted-bearer');
    expect(calls[0]?.url).toContain('/token');
    expect(calls[0]?.body).toEqual({ clientId: 'app-id', clientSecret: 'app-secret' });
  });
});

describe('listUserAccounts', () => {
  const params = { email: 'a@b.com', password: 'pw' };

  it('returns accounts on success', async () => {
    const { fetch, calls } = mockFetch(() => ({
      body: [
        { alias: 'acme', role: 'owner', token: 't1' },
        { alias: 'other', role: 'user', token: 't2' },
      ],
    }));
    const outcome = await listUserAccounts(ctxWith(fetch), 'app-bearer', params);
    expect(outcome.kind).toBe('accounts');
    if (outcome.kind === 'accounts') expect(outcome.accounts).toHaveLength(2);
    expect(calls[0]?.headers.Authorization).toBe('Bearer app-bearer');
    expect(calls[0]?.body).toEqual({ email: 'a@b.com', password: 'pw' });
  });

  it('detects OTP required via 417', async () => {
    const { fetch } = mockFetch(() => ({ status: 417, body: {} }));
    const outcome = await listUserAccounts(ctxWith(fetch), 'app-bearer', params);
    expect(outcome.kind).toBe('otp_required');
  });

  it('detects OTP required via 401 Missing authentication (no otp sent)', async () => {
    const { fetch } = mockFetch(() => ({
      status: 401,
      body: { message: 'Missing authentication' },
    }));
    const outcome = await listUserAccounts(ctxWith(fetch), 'app-bearer', params);
    expect(outcome.kind).toBe('otp_required');
  });

  it('maps 403 to an invalid-credentials message', async () => {
    const { fetch } = mockFetch(() => ({ status: 403, body: { message: 'Forbidden' } }));
    const outcome = await listUserAccounts(ctxWith(fetch), 'app-bearer', params);
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') expect(outcome.message).toMatch(/incorrect/i);
  });

  it('sends otpToken on retry', async () => {
    const { fetch, calls } = mockFetch(() => ({
      body: [{ alias: 'acme', role: 'owner', token: 't' }],
    }));
    await listUserAccounts(ctxWith(fetch), 'app-bearer', { ...params, otpToken: '123456' });
    expect(calls[0]?.body).toMatchObject({ otpToken: '123456' });
  });
});

describe('getRestCredentials', () => {
  it('GETs /rest/credentials with the account token', async () => {
    const { fetch, calls } = mockFetch(() => ({ body: { clientId: 'cid', clientSecret: 'csec' } }));
    const creds = await getRestCredentials(ctxWith(fetch), 'account-token');
    expect(creds).toEqual({ clientId: 'cid', clientSecret: 'csec' });
    expect(calls[0]?.headers.Authorization).toBe('Bearer account-token');
  });
});

describe('validateAndGetAlias', () => {
  it('mints a token then resolves the canonical alias', async () => {
    const { fetch } = mockFetch((call) => {
      if (call.url.endsWith('/token')) return TOKEN_OK;
      if (call.url.endsWith('/account')) return { body: { alias: 'canonical' } };
      return { status: 404 };
    });
    const alias = await validateAndGetAlias(ctxWith(fetch), 'cid', 'csec', 'fallback');
    expect(alias).toBe('canonical');
  });

  it('falls back when the account lookup fails', async () => {
    const { fetch } = mockFetch((call) => {
      if (call.url.endsWith('/token')) return TOKEN_OK;
      return { status: 500 };
    });
    const alias = await validateAndGetAlias(ctxWith(fetch), 'cid', 'csec', 'fallback');
    expect(alias).toBe('fallback');
  });
});
