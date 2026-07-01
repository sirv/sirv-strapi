import { Box, Flex, Main, Typography } from '@strapi/design-system';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { SirvPreferences } from '../components/SirvPreferences';
import { ConnectPanel } from '../components/connect/ConnectPanel';
import { getTranslation } from '../getTranslation';

/**
 * Settings page (Settings -> Sirv -> Configuration). Hosts the connection panel: login (email +
 * password + OTP + account picker) or the paste-REST-credentials fallback, and the connected
 * state with a disconnect action. Usage + default transformations arrive in milestone 7.
 */
const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const [rev, setRev] = useState(0);

  return (
    <Main>
      <Box paddingTop={8} paddingBottom={8} paddingLeft={10} paddingRight={10}>
        <Flex direction="column" alignItems="flex-start" gap={2}>
          <Typography variant="alpha" tag="h1">
            {formatMessage({
              id: getTranslation('settings.title'),
              defaultMessage: 'Sirv configuration',
            })}
          </Typography>
          <Typography variant="epsilon" textColor="neutral600">
            {formatMessage({
              id: getTranslation('settings.subtitle'),
              defaultMessage: 'Connect your Sirv account.',
            })}
          </Typography>
        </Flex>

        <Flex direction="column" alignItems="stretch" gap={6} marginTop={8}>
          <Box padding={6} background="neutral0" hasRadius borderColor="neutral200">
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography variant="delta" tag="h2">
                Connection
              </Typography>
              <ConnectPanel onConnectionChange={() => setRev((r) => r + 1)} />
            </Flex>
          </Box>

          <SirvPreferences key={rev} />
        </Flex>
      </Box>
    </Main>
  );
};

export { SettingsPage };
export default SettingsPage;
