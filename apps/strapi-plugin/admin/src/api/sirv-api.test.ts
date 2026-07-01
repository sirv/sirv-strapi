import { describe, expect, it, vi } from 'vitest';
import { createSirvApi, extractErrorMessage } from './sirv-api';

// The fetch client is generic (`<T>`); mocks return concrete shapes, so type as `any`.
function mockClient(overrides: { get?: any; post?: any } = {}): any {
  return {
    get: vi.fn(async () => ({ data: {} })),
    post: vi.fn(async () => ({ data: {} })),
    ...overrides,
  };
}

describe('createSirvApi', () => {
  it('getStatus hits /sirv/settings', async () => {
    const client = mockClient({
      get: vi.fn(async () => ({ data: { connected: true, accountAlias: 'demo' } })),
    });
    const api = createSirvApi(client);
    expect(await api.getStatus()).toEqual({ connected: true, accountAlias: 'demo' });
    expect(client.get).toHaveBeenCalledWith('/sirv/settings');
  });

  it('login posts credentials to /sirv/auth/login', async () => {
    const client = mockClient({ post: vi.fn(async () => ({ data: { stage: 'otp' } })) });
    const api = createSirvApi(client);
    const result = await api.login({ email: 'a@b.com', password: 'pw' });
    expect(result).toEqual({ stage: 'otp' });
    expect(client.post).toHaveBeenCalledWith('/sirv/auth/login', {
      email: 'a@b.com',
      password: 'pw',
    });
  });

  it('selectAccount posts session + alias', async () => {
    const client = mockClient({
      post: vi.fn(async () => ({ data: { stage: 'connected', account: { accountAlias: 'x' } } })),
    });
    const api = createSirvApi(client);
    await api.selectAccount('sess-1', 'acme');
    expect(client.post).toHaveBeenCalledWith('/sirv/auth/select-account', {
      connectSessionId: 'sess-1',
      alias: 'acme',
    });
  });

  it('connectWithCredentials posts to the fallback route', async () => {
    const client = mockClient({
      post: vi.fn(async () => ({
        data: { stage: 'connected', account: { accountAlias: 'igor' } },
      })),
    });
    const api = createSirvApi(client);
    await api.connectWithCredentials({ clientId: 'cid', clientSecret: 'csec' });
    expect(client.post).toHaveBeenCalledWith('/sirv/auth/connect-credentials', {
      clientId: 'cid',
      clientSecret: 'csec',
    });
  });

  it('logout posts to /sirv/auth/logout', async () => {
    const client = mockClient();
    await createSirvApi(client).logout();
    expect(client.post).toHaveBeenCalledWith('/sirv/auth/logout');
  });
});

describe('extractErrorMessage', () => {
  it('prefers response.data.error', () => {
    expect(extractErrorMessage({ response: { data: { error: 'bad creds' } } })).toBe('bad creds');
  });
  it('falls back to Error.message', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
  });
  it('uses the default when nothing matches', () => {
    expect(extractErrorMessage({}, 'nope')).toBe('nope');
  });
});
