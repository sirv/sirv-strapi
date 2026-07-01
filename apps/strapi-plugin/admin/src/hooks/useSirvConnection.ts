import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AccountChoice,
  type ConnectionStatus,
  type LoginResult,
  type SirvApi,
  createSirvApi,
  extractErrorMessage,
} from '../api/sirv-api';

/** Top-level connection phase. */
export type ConnectionPhase = 'loading' | 'disconnected' | 'connected';

/** Sub-step while connecting (only meaningful when phase is 'disconnected'). */
export type ConnectStage = 'form' | 'otp' | 'select';

export interface UseSirvConnection {
  phase: ConnectionPhase;
  connection: ConnectionStatus | null;
  stage: ConnectStage;
  accounts: AccountChoice[];
  busy: boolean;
  error?: string;
  login(email: string, password: string): Promise<void>;
  submitOtp(otpToken: string): Promise<void>;
  pickAccount(alias: string): Promise<void>;
  connectWithCredentials(
    clientId: string,
    clientSecret: string,
    accountAlias?: string,
  ): Promise<void>;
  disconnect(): Promise<void>;
  /** Return to the initial login form, clearing any in-flight connect stage. */
  reset(): void;
  refresh(): Promise<void>;
}

/**
 * Drives the connect flow against the plugin's server endpoints. All secret material stays on
 * the server; this hook only moves through stages (form -> otp -> select -> connected) and
 * reports status. The pending email/password are held in a ref for the OTP retry and never
 * persisted or rendered.
 */
export function useSirvConnection(apiOverride?: SirvApi): UseSirvConnection {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const api = useMemo(() => apiOverride ?? createSirvApi({ get, post }), [apiOverride, get, post]);

  const [phase, setPhase] = useState<ConnectionPhase>('loading');
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [stage, setStage] = useState<ConnectStage>('form');
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const pending = useRef<{ email: string; password: string } | null>(null);
  const sessionId = useRef<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const status = await api.getStatus();
      setConnection(status);
      setPhase(status.connected ? 'connected' : 'disconnected');
    } catch {
      setPhase('disconnected');
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onConnected = useCallback(async () => {
    pending.current = null;
    sessionId.current = undefined;
    setStage('form');
    setAccounts([]);
    toggleNotification({ type: 'success', message: 'Connected to Sirv.' });
    await refresh();
  }, [refresh, toggleNotification]);

  const handleResult = useCallback(
    async (result: LoginResult) => {
      if (result.stage === 'otp') {
        setStage('otp');
        return;
      }
      if (result.stage === 'select') {
        sessionId.current = result.connectSessionId;
        setAccounts(result.accounts);
        setStage('select');
        return;
      }
      await onConnected();
    },
    [onConnected],
  );

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) =>
      run(async () => {
        pending.current = { email, password };
        await handleResult(await api.login({ email, password }));
      }),
    [api, handleResult, run],
  );

  const submitOtp = useCallback(
    (otpToken: string) =>
      run(async () => {
        if (!pending.current) throw new Error('Your login session expired. Please start again.');
        await handleResult(await api.verifyOtp({ ...pending.current, otpToken }));
      }),
    [api, handleResult, run],
  );

  const pickAccount = useCallback(
    (alias: string) =>
      run(async () => {
        if (!sessionId.current) throw new Error('Your login session expired. Please start again.');
        await api.selectAccount(sessionId.current, alias);
        await onConnected();
      }),
    [api, onConnected, run],
  );

  const connectWithCredentials = useCallback(
    (clientId: string, clientSecret: string, accountAlias?: string) =>
      run(async () => {
        await api.connectWithCredentials({ clientId, clientSecret, accountAlias });
        await onConnected();
      }),
    [api, onConnected, run],
  );

  const disconnect = useCallback(
    () =>
      run(async () => {
        await api.logout();
        toggleNotification({ type: 'success', message: 'Disconnected from Sirv.' });
        await refresh();
      }),
    [api, refresh, run, toggleNotification],
  );

  const reset = useCallback(() => {
    pending.current = null;
    sessionId.current = undefined;
    setAccounts([]);
    setError(undefined);
    setStage('form');
  }, []);

  return {
    phase,
    connection,
    stage,
    accounts,
    busy,
    error,
    login,
    submitOtp,
    pickAccount,
    connectWithCredentials,
    disconnect,
    reset,
    refresh,
  };
}
