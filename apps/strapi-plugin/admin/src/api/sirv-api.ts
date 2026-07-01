/**
 * Typed client over the plugin's `/sirv/*` admin routes. Kept free of Strapi runtime imports so
 * it is unit-testable with a mock fetch client; the hook injects the real `useFetchClient()`.
 * The admin only ever exchanges connection STATUS and login inputs - never secret material.
 */

export interface AdminFetchClient {
  get<T = unknown>(url: string): Promise<{ data: T }>;
  post<T = unknown>(url: string, body?: unknown): Promise<{ data: T }>;
}

export interface SirvDefaults {
  quality?: number;
  format?: 'optimal' | 'webp' | 'jpg' | 'png' | 'original';
}

export interface ConnectionStatus {
  connected: boolean;
  accountAlias?: string;
  deliveryAlias?: string;
  defaults?: SirvDefaults;
}

/** Subset of Sirv storage usage surfaced in Settings (bytes, except `files`). */
export interface UsageSummary {
  plan: number;
  used: number;
  files: number;
  burstable?: number;
  extra?: number;
}

export interface ConnectedAccount {
  accountAlias: string;
  role?: string;
}

export interface AccountChoice {
  alias: string;
  role?: string;
}

/** Successful login outcomes. The `error` stage is returned as a 4xx and surfaces as a throw. */
export type LoginResult =
  | { stage: 'otp' }
  | { stage: 'connected'; account: ConnectedAccount }
  | { stage: 'select'; connectSessionId: string; accounts: AccountChoice[] };

export interface LoginInput {
  email: string;
  password: string;
  otpToken?: string;
}

const BASE = '/sirv';

export function createSirvApi(client: AdminFetchClient) {
  return {
    async getStatus(): Promise<ConnectionStatus> {
      return (await client.get<ConnectionStatus>(`${BASE}/settings`)).data;
    },

    async login(input: LoginInput): Promise<LoginResult> {
      return (await client.post<LoginResult>(`${BASE}/auth/login`, input)).data;
    },

    async verifyOtp(input: LoginInput): Promise<LoginResult> {
      return (await client.post<LoginResult>(`${BASE}/auth/verify-otp`, input)).data;
    },

    async selectAccount(
      connectSessionId: string,
      alias: string,
    ): Promise<{ stage: 'connected'; account: ConnectedAccount }> {
      return (
        await client.post<{ stage: 'connected'; account: ConnectedAccount }>(
          `${BASE}/auth/select-account`,
          { connectSessionId, alias },
        )
      ).data;
    },

    async connectWithCredentials(input: {
      clientId: string;
      clientSecret: string;
      accountAlias?: string;
    }): Promise<{ stage: 'connected'; account: ConnectedAccount }> {
      return (
        await client.post<{ stage: 'connected'; account: ConnectedAccount }>(
          `${BASE}/auth/connect-credentials`,
          input,
        )
      ).data;
    },

    async logout(): Promise<void> {
      await client.post(`${BASE}/auth/logout`);
    },

    async updateSettings(defaults: SirvDefaults): Promise<ConnectionStatus> {
      return (await client.post<ConnectionStatus>(`${BASE}/settings`, { defaults })).data;
    },

    async getUsage(): Promise<UsageSummary> {
      return (await client.get<UsageSummary>(`${BASE}/usage`)).data;
    },
  };
}

export type SirvApi = ReturnType<typeof createSirvApi>;

/** Extracts a human-readable message from an axios-style error thrown by the fetch client. */
export function extractErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const response = (err as { response?: { data?: { error?: unknown; message?: unknown } } })
    ?.response;
  const data = response?.data;
  if (data && typeof data.error === 'string') return data.error;
  if (data && typeof data.message === 'string') return data.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
