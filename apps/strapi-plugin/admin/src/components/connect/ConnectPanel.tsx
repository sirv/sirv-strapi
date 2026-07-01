import { Badge, Box, Button, Flex, Loader, Typography } from '@strapi/design-system';
import { useEffect, useRef, useState } from 'react';
import type { ConnectionStatus } from '../../api/sirv-api';
import { useSirvConnection } from '../../hooks/useSirvConnection';
import { AccountPicker } from './AccountPicker';
import { CredentialsForm } from './CredentialsForm';
import { LoginForm } from './LoginForm';
import { OtpForm } from './OtpForm';

interface ConnectedViewProps {
  connection: ConnectionStatus | null;
  onDisconnect: () => void;
  busy: boolean;
}

const ConnectedView = ({ connection, onDisconnect, busy }: ConnectedViewProps) => (
  <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
    <Flex direction="column" alignItems="flex-start" gap={1}>
      <Badge>Connected</Badge>
      <Typography variant="omega">
        Account <Typography fontWeight="bold">{connection?.accountAlias ?? 'Sirv'}</Typography>
      </Typography>
      {connection?.deliveryAlias ? (
        <Typography variant="pi" textColor="neutral600">
          Delivering from {connection.deliveryAlias}
        </Typography>
      ) : null}
    </Flex>
    <Button variant="danger-light" onClick={onDisconnect} loading={busy}>
      Disconnect
    </Button>
  </Flex>
);

/**
 * Orchestrates the connect flow using `useSirvConnection`: renders the connected view, or the
 * appropriate step (login / OTP / account picker / paste-credentials) while disconnected.
 */
export interface ConnectPanelProps {
  /** Fired when the connection phase settles to connected/disconnected (for parent refresh). */
  onConnectionChange?: (connected: boolean) => void;
}

export const ConnectPanel = ({ onConnectionChange }: ConnectPanelProps) => {
  const conn = useSirvConnection();
  const [mode, setMode] = useState<'login' | 'credentials'>('login');

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

  if (conn.stage === 'otp') {
    return (
      <OtpForm onSubmit={conn.submitOtp} onBack={conn.reset} busy={conn.busy} error={conn.error} />
    );
  }

  if (conn.stage === 'select') {
    return (
      <AccountPicker
        accounts={conn.accounts}
        onPick={conn.pickAccount}
        onBack={conn.reset}
        busy={conn.busy}
        error={conn.error}
      />
    );
  }

  return (
    <Box>
      {mode === 'login' ? (
        <LoginForm
          onSubmit={conn.login}
          onUseCredentials={() => setMode('credentials')}
          busy={conn.busy}
          error={conn.error}
        />
      ) : (
        <CredentialsForm
          onSubmit={conn.connectWithCredentials}
          onUseLogin={() => setMode('login')}
          busy={conn.busy}
          error={conn.error}
        />
      )}
    </Box>
  );
};

export default ConnectPanel;
