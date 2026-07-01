import { Box, Button, Field, Flex, TextInput, Typography } from '@strapi/design-system';
import { type FormEvent, useState } from 'react';

export interface OtpFormProps {
  onSubmit: (otpToken: string) => void;
  onBack: () => void;
  busy: boolean;
  error?: string;
}

/** One-time passcode step, shown when the Sirv account has MFA enabled. */
export const OtpForm = ({ onSubmit, onBack, busy, error }: OtpFormProps) => {
  const [otp, setOtp] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(otp.trim());
  };

  return (
    <Box tag="form" onSubmit={submit}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="omega" textColor="neutral700">
          Enter the one-time passcode from your authenticator app.
        </Typography>
        <Field.Root name="otp" required>
          <Field.Label>One-time passcode</Field.Label>
          <TextInput
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)}
          />
        </Field.Root>

        {error ? (
          <Typography variant="pi" textColor="danger600">
            {error}
          </Typography>
        ) : null}

        <Flex justifyContent="space-between" gap={2} wrap="wrap">
          <Button type="submit" loading={busy} disabled={!otp}>
            Verify
          </Button>
          <Button type="button" variant="tertiary" onClick={onBack}>
            Back
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default OtpForm;
