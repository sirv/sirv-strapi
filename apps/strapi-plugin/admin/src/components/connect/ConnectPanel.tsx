import { Box, Button, Flex, Loader, Typography } from '@strapi/design-system';
import { useEffect, useRef } from 'react';
import type { ConnectionStatus } from '../../api/sirv-api';
import { useSirvConnection } from '../../hooks/useSirvConnection';
import { CredentialsForm } from './CredentialsForm';
// Email/password + OTP + account-picker login is temporarily disabled (Client ID/secret only).
// The flow is still implemented in useSirvConnection and these components, kept for re-enabling:
// import { AccountPicker } from './AccountPicker';
// import { LoginForm } from './LoginForm';
// import { OtpForm } from './OtpForm';

interface ConnectedViewProps {
  connection: ConnectionStatus | null;
  onDisconnect: () => void;
  busy: boolean;
}

const ConnectedView = ({ connection, onDisconnect, busy }: ConnectedViewProps) => (
  <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
    <Typography>Connected account: {connection?.accountAlias ?? 'Sirv'}</Typography>
    <Button variant="danger-light" onClick={onDisconnect} loading={busy}>
      Disconnect
    </Button>
  </Flex>
);

export interface ConnectPanelProps {
  /** Fired when the connection phase settles to connected/disconnected (for parent refresh). */
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * Orchestrates the connect flow. Currently Client ID / secret only; the email/password login is
 * commented out above until the app bootstrap credential is available.
 */
export const ConnectPanel = ({ onConnectionChange }: ConnectPanelProps) => {
  const conn = useSirvConnection();

  // Notify the parent when connection settles, so it can refetch usage / defaults.
  const lastPhase = useRef<string>('');
  useEffect(() => {
    if (conn.phase === 'loading' || conn.phase === lastPhase.current) return;
    lastPhase.current = conn.phase;
    onConnectionChange?.(conn.phase === 'connected');
  }, [conn.phase, onConnectionChange]);

  if (conn.phase === 'loading') {
    return (
      <Flex justifyContent="center" padding={6}>
        <Loader small>Checking Sirv connection...</Loader>
      </Flex>
    );
  }

  if (conn.phase === 'connected') {
    return (
      <ConnectedView connection={conn.connection} onDisconnect={conn.disconnect} busy={conn.busy} />
    );
  }

  // Disconnected: Client ID / secret entry only.
  return (
    <Box>
      <CredentialsForm onSubmit={conn.connectWithCredentials} busy={conn.busy} error={conn.error} />
    </Box>
  );
};

export default ConnectPanel;
