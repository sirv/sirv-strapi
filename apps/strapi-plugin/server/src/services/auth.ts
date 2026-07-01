import { randomUUID } from 'node:crypto';
import {
  type AccountWithToken,
  type LoginParams,
  SirvApiError,
  type StoredCredentials,
  getRestCredentials,
  isConnectableRole,
  listUserAccounts,
  mintAppToken,
  resolveContext,
  validateAndGetAlias,
} from '@sirv/sirv-client';
import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../constants';
import {
  AppCredentialsMissingError,
  ConnectSessionExpiredError,
  InvalidRequestError,
} from '../errors';

/** A connected account, surfaced to the admin (no secret material). */
export interface ConnectedAccount {
  accountAlias: string;
  role?: string;
}

export type LoginResult =
  | { stage: 'otp' }
  | { stage: 'error'; message: string }
  | { stage: 'connected'; account: ConnectedAccount }
  | {
      stage: 'select';
      connectSessionId: string;
      accounts: Array<{ alias: string; role?: string }>;
    };

/** Pending account choices stashed server-side between login and select-account. */
interface ConnectSession {
  accounts: AccountWithToken[];
  createdAt: number;
}

const SESSION_PREFIX = 'connect-session:';
const SESSION_TTL_MS = 10 * 60 * 1000;

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  // The Sirv REST host context (uses Node's global fetch). Re-created per call is cheap.
  const ctx = resolveContext();
  const store = () => strapi.store({ type: 'plugin', name: PLUGIN_ID });
  const encryption = () => strapi.plugin(PLUGIN_ID).service('encryption');
  const tokenStorage = () => strapi.plugin(PLUGIN_ID).service('token-storage');

  function appCredentials(): { clientId: string; clientSecret: string } {
    const clientId = strapi.plugin(PLUGIN_ID).config('appClientId') as string;
    const clientSecret = strapi.plugin(PLUGIN_ID).config('appClientSecret') as string;
    if (!clientId || !clientSecret) throw new AppCredentialsMissingError();
    return { clientId, clientSecret };
  }

  /** Fetch REST credentials for a chosen account, validate, resolve alias, and persist. */
  async function connectAccount(account: AccountWithToken): Promise<ConnectedAccount> {
    if (!account.token) {
      throw new InvalidRequestError('Account token missing; please log in again.');
    }
    const creds = await getRestCredentials(ctx, account.token);
    const accountAlias = await validateAndGetAlias(
      ctx,
      creds.clientId,
      creds.clientSecret,
      account.alias,
    );
    const stored: StoredCredentials = {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      accountAlias,
    };
    await tokenStorage().write(stored);
    return { accountAlias, role: account.role };
  }

  async function putConnectSession(accounts: AccountWithToken[]): Promise<string> {
    const id = randomUUID();
    const session: ConnectSession = { accounts, createdAt: Date.now() };
    const blob = encryption().encrypt(JSON.stringify(session));
    await store().set({ key: `${SESSION_PREFIX}${id}`, value: blob });
    return id;
  }

  async function readConnectSession(id: string): Promise<ConnectSession | null> {
    const blob = await store().get({ key: `${SESSION_PREFIX}${id}` });
    if (typeof blob !== 'string' || blob.length === 0) return null;
    try {
      const session = JSON.parse(encryption().decrypt(blob)) as ConnectSession;
      if (Date.now() - session.createdAt > SESSION_TTL_MS) {
        await store().delete({ key: `${SESSION_PREFIX}${id}` });
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  return {
    /** Email + password (+ OTP) login. Returns otp / error / connected / select. */
    async login(params: LoginParams): Promise<LoginResult> {
      const app = appCredentials();
      const appToken = await mintAppToken(ctx, app.clientId, app.clientSecret);
      const outcome = await listUserAccounts(ctx, appToken, params);

      if (outcome.kind === 'otp_required') return { stage: 'otp' };
      if (outcome.kind === 'error') return { stage: 'error', message: outcome.message };

      const connectable = outcome.accounts.filter((a) => isConnectableRole(a.role));
      if (connectable.length === 0) {
        return {
          stage: 'error',
          message: 'No account with owner or admin access was found for this login.',
        };
      }
      if (connectable.length === 1) {
        // biome-ignore lint/style/noNonNullAssertion: length checked above
        const account = await connectAccount(connectable[0]!);
        return { stage: 'connected', account };
      }
      const connectSessionId = await putConnectSession(connectable);
      return {
        stage: 'select',
        connectSessionId,
        accounts: connectable.map((a) => ({ alias: a.alias, role: a.role })),
      };
    },

    /** List the pending account choices for a connect session (the account picker). */
    async accounts(connectSessionId: string): Promise<Array<{ alias: string; role?: string }>> {
      const session = await readConnectSession(connectSessionId);
      if (!session) throw new ConnectSessionExpiredError();
      return session.accounts.map((a) => ({ alias: a.alias, role: a.role }));
    },

    /** Finalize a multi-account login by picking one alias. */
    async selectAccount(connectSessionId: string, alias: string): Promise<ConnectedAccount> {
      const session = await readConnectSession(connectSessionId);
      if (!session) throw new ConnectSessionExpiredError();
      const account = session.accounts.find((a) => a.alias === alias);
      if (!account) throw new InvalidRequestError('Selected account not found in this session.');
      const result = await connectAccount(account);
      await store().delete({ key: `${SESSION_PREFIX}${connectSessionId}` });
      return result;
    },

    /**
     * Fallback / self-hosted connect: persist a pasted per-account REST clientId/secret directly
     * (mirrors the Sanity plugin). Validates by minting a token and resolving the alias. This is
     * the path exercised by the live test using .env.local credentials.
     */
    async connectWithCredentials(input: {
      clientId: string;
      clientSecret: string;
      accountAlias?: string;
    }): Promise<ConnectedAccount> {
      const fallback = input.accountAlias ?? '';
      let accountAlias: string;
      try {
        accountAlias = await validateAndGetAlias(ctx, input.clientId, input.clientSecret, fallback);
      } catch (err) {
        // A bad Client ID / secret fails token minting with 401/403.
        if (err instanceof SirvApiError && (err.status === 401 || err.status === 403)) {
          throw new InvalidRequestError(
            'Wrong credentials. Please check your Client ID and secret.',
          );
        }
        throw err;
      }
      if (!accountAlias) {
        throw new InvalidRequestError('Wrong credentials. Please check your Client ID and secret.');
      }
      const stored: StoredCredentials = {
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        accountAlias,
      };
      await tokenStorage().write(stored);
      return { accountAlias };
    },

    async logout(): Promise<void> {
      await tokenStorage().clear();
    },
  };
};

export default service;
