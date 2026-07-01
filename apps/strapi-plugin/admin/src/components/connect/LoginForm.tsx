import { Box, Button, Field, Flex, TextInput, Typography } from '@strapi/design-system';
import { type FormEvent, useState } from 'react';

export interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  onUseCredentials: () => void;
  busy: boolean;
  error?: string;
}

/** Email + password login (Path B). Presentational: state is local, the flow lives in the hook. */
export const LoginForm = ({ onSubmit, onUseCredentials, busy, error }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <Box tag="form" onSubmit={submit}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Field.Root name="email" required>
          <Field.Label>Sirv email</Field.Label>
          <TextInput
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          />
        </Field.Root>
        <Field.Root name="password" required>
          <Field.Label>Password</Field.Label>
          <TextInput
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
        </Field.Root>

        {error ? (
          <Typography variant="pi" textColor="danger600">
            {error}
          </Typography>
        ) : null}

        <Flex justifyContent="space-between" gap={2} wrap="wrap">
          <Button type="submit" loading={busy} disabled={!email || !password}>
            Connect
          </Button>
          <Button type="button" variant="tertiary" onClick={onUseCredentials}>
            Use REST credentials instead
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default LoginForm;
