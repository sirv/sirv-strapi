import { Box, Button, Field, Flex, Link, TextInput, Typography } from '@strapi/design-system';
import { type FormEvent, useState } from 'react';

export interface CredentialsFormProps {
  onSubmit: (clientId: string, clientSecret: string, accountAlias?: string) => void;
  /** When provided, shows a "use email and password instead" toggle (currently disabled). */
  onUseLogin?: () => void;
  busy: boolean;
  error?: string;
}

const API_SETTINGS_URL = 'https://my.sirv.com/#/account/settings/api';

/**
 * Connect by pasting a per-account REST clientId/secret. The values are POSTed straight to the
 * server, validated against Sirv, and stored encrypted - never persisted client-side.
 */
export const CredentialsForm = ({ onSubmit, onUseLogin, busy, error }: CredentialsFormProps) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(clientId.trim(), clientSecret.trim());
  };

  return (
    <Box tag="form" onSubmit={submit}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Field.Root name="clientId" required>
          <Field.Label>Client ID</Field.Label>
          <TextInput
            name="clientId"
            value={clientId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientId(e.target.value)}
          />
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="neutral600">
              Create or find your REST API keys at{' '}
              <Link href={API_SETTINGS_URL} isExternal>
                my.sirv.com &rarr; Settings &rarr; API
              </Link>
            </Typography>
          </Box>
        </Field.Root>

        <Field.Root name="clientSecret" required>
          <Field.Label>Client secret</Field.Label>
          <TextInput
            name="clientSecret"
            type="password"
            value={clientSecret}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSecret(e.target.value)}
          />
        </Field.Root>

        {error ? (
          <Typography variant="pi" textColor="danger600">
            {error}
          </Typography>
        ) : null}

        <Flex justifyContent="space-between" gap={2} wrap="wrap">
          <Button type="submit" loading={busy} disabled={!clientId || !clientSecret}>
            Connect
          </Button>
          {onUseLogin ? (
            <Button type="button" variant="tertiary" onClick={onUseLogin}>
              Use email and password instead
            </Button>
          ) : null}
        </Flex>
      </Flex>
    </Box>
  );
};

export default CredentialsForm;
