/**
 * StrapiTokenStorage - the Strapi seam over `@sirv/core`'s TokenStorage concept.
 *
 * IMPORTANT divergence from the Sanity plugin: in Sanity (self-hosted Studio, no server)
 * the per-account REST credentials live client-side and `packages/core`'s `useSirvAuth`
 * mints bearer tokens in the browser. Strapi HAS a server half, and the hard constraint
 * (strapi-plugin.md sections 4.3 / 4.4) is that Sirv credentials NEVER reach the browser.
 *
 * So this adapter never reads or writes raw `StoredCredentials` in the admin. Instead it is
 * a thin client over the plugin's server endpoints (`/sirv/settings`, `/sirv/auth/*`): the
 * server holds the encrypted tokens and proxies every Sirv call. The admin only learns the
 * connection STATUS (connected? which account?), never the secret material.
 *
 * Milestone 1 ships this as a typed stub returning a not-connected status. Milestones 3-4
 * implement login/select-account/logout against the live server endpoints.
 */

export interface SirvConnectionStatus {
  connected: boolean;
  accountAlias?: string;
  deliveryAlias?: string;
  userEmail?: string;
}

/** Minimal slice of Strapi's admin fetch client used by this adapter. */
export interface FetchClientLike {
  get<T = unknown>(url: string): Promise<{ data: T }>;
  post<T = unknown>(url: string, body?: unknown): Promise<{ data: T }>;
}

export interface StrapiTokenStorageOptions {
  /** Strapi fetch client from `useFetchClient()` (admin) - baseURL is already the admin API. */
  fetchClient: FetchClientLike;
  /** Plugin route prefix; defaults to `/sirv`. */
  basePath?: string;
}

export class StrapiTokenStorage {
  private readonly fetchClient: FetchClientLike;
  private readonly basePath: string;

  constructor(options: StrapiTokenStorageOptions) {
    this.fetchClient = options.fetchClient;
    this.basePath = options.basePath ?? '/sirv';
  }

  /** Ask the server whether an account is connected. Secrets never cross this boundary. */
  async status(): Promise<SirvConnectionStatus> {
    const { data } = await this.fetchClient.get<SirvConnectionStatus>(`${this.basePath}/settings`);
    return data;
  }

  /** Clear the server-side stored credentials. */
  async disconnect(): Promise<void> {
    await this.fetchClient.post(`${this.basePath}/auth/logout`);
  }
}
