import { describe, expect, it, vi } from 'vitest';
import { createProxyClient } from './proxy-client';

function mockClient() {
  const get = vi.fn(async (_url: string) => ({ data: { ok: true } }));
  const post = vi.fn(async () => ({ data: {} }));
  return { client: { get, post } as any, get };
}

describe('createProxyClient', () => {
  it('listFolder hits /sirv/dam/folder with dirname + continuation', async () => {
    const { client, get } = mockClient();
    await createProxyClient(client).listFolder({ dirname: '/products', continuation: 'abc' });
    const url = get.mock.calls[0]?.[0] as string;
    expect(url).toContain('/sirv/dam/folder?');
    expect(url).toContain('dirname=%2Fproducts');
    expect(url).toContain('continuation=abc');
  });

  it('searchFiles hits /sirv/dam/search with query/from/size', async () => {
    const { client, get } = mockClient();
    await createProxyClient(client).searchFiles({
      query: 'contentType:image*',
      from: 10,
      size: 20,
    });
    const url = get.mock.calls[0]?.[0] as string;
    expect(url).toContain('/sirv/dam/search?');
    expect(url).toContain('query=contentType%3Aimage');
    expect(url).toContain('from=10');
    expect(url).toContain('size=20');
  });

  it('getFileInfo, getAccountInfo, getUsage hit their routes', async () => {
    const { client, get } = mockClient();
    const proxy = createProxyClient(client);
    await proxy.getFileInfo('/a/b.jpg');
    await proxy.getAccountInfo();
    await proxy.getUsage();
    const urls = get.mock.calls.map((c) => c[0]);
    expect(urls).toContain('/sirv/dam/file?filename=%2Fa%2Fb.jpg');
    expect(urls).toContain('/sirv/dam/account');
    expect(urls).toContain('/sirv/usage');
  });

  it('unsupported operations throw', async () => {
    const { client } = mockClient();
    const proxy = createProxyClient(client);
    await expect(proxy.searchScroll('x')).rejects.toThrow();
    await expect(proxy.getBillingPlan()).rejects.toThrow();
  });
});
