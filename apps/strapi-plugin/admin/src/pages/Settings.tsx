import { Box, Flex, Main, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { ConnectPanel } from '../components/connect/ConnectPanel';
import { getTranslation } from '../getTranslation';

/**
 * Settings page (Settings -> Sirv -> Configuration). Hosts the connection panel: login (email +
 * password + OTP + account picker) or the paste-REST-credentials fallback, and the connected
 * state with a disconnect action. Usage + default transformations arrive in milestone 7.
 */
const SettingsPage = () => {
  const { formatMessage } = useIntl();

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
              defaultMessage: 'Connect your Sirv account and set default delivery options.',
            })}
          </Typography>
        </Flex>

        <Box marginTop={8} padding={6} background="neutral0" hasRadius borderColor="neutral200">
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Typography variant="delta" tag="h2">
              Connection
            </Typography>
            <ConnectPanel />
          </Flex>
        </Box>
      </Box>
    </Main>
  );
};

export { SettingsPage };
export default SettingsPage;
