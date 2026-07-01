import { Box, Button, Field, Flex, TextInput, Typography } from '@strapi/design-system';
import { type FormEvent, useState } from 'react';

export interface CredentialsFormProps {
  onSubmit: (clientId: string, clientSecret: string, accountAlias?: string) => void;
  onUseLogin: () => void;
  busy: boolean;
  error?: string;
}

/**
 * Connect by pasting a per-account REST clientId/secret (fallback / self-hosted path). The
 * values are POSTed straight to the server, validated against Sirv, and stored encrypted - they
 * are never persisted client-side.
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
        <Field.Root name="clientId" required hint="From my.sirv.com -> Settings -> API">
          <Field.Label>Client ID</Field.Label>
          <TextInput
            name="clientId"
            value={clientId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientId(e.target.value)}
          />
          <Field.Hint />
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
          <Button type="button" variant="tertiary" onClick={onUseLogin}>
            Use email and password instead
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default CredentialsForm;
