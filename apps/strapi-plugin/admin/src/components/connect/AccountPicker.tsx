import { Box, Button, Flex, Typography } from '@strapi/design-system';
import type { AccountChoice } from '../../api/sirv-api';

export interface AccountPickerProps {
  accounts: AccountChoice[];
  onPick: (alias: string) => void;
  onBack: () => void;
  busy: boolean;
  error?: string;
}

/** Account picker shown when a login has access to more than one connectable account. */
export const AccountPicker = ({ accounts, onPick, onBack, busy, error }: AccountPickerProps) => {
  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography variant="omega" textColor="neutral700">
        Choose the Sirv account to connect.
      </Typography>

      <Flex direction="column" alignItems="stretch" gap={2}>
        {accounts.map((account) => (
          <Box
            key={account.alias}
            padding={3}
            hasRadius
            background="neutral0"
            borderColor="neutral200"
          >
            <Flex justifyContent="space-between" alignItems="center" gap={2}>
              <Flex direction="column" alignItems="flex-start">
                <Typography fontWeight="bold">{account.alias}</Typography>
                {account.role ? (
                  <Typography variant="pi" textColor="neutral600">
                    {account.role}
                  </Typography>
                ) : null}
              </Flex>
              <Button variant="secondary" loading={busy} onClick={() => onPick(account.alias)}>
                Connect
              </Button>
            </Flex>
          </Box>
        ))}
      </Flex>

      {error ? (
        <Typography variant="pi" textColor="danger600">
          {error}
        </Typography>
      ) : null}

      <Box>
        <Button type="button" variant="tertiary" onClick={onBack}>
          Back
        </Button>
      </Box>
    </Flex>
  );
};

export default AccountPicker;
