import { Badge, Box, Button, Flex, Main, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { getTranslation } from '../getTranslation';

/**
 * Settings page (Settings -> Sirv -> Configuration). Milestone 1 renders connection
 * status as "Not connected" plus a disabled Connect action. Milestones 3-4 wire the
 * login modal + account picker (from `@sirv/core`) to the server auth endpoints, and
 * milestone 7 adds usage + default transformations.
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
          <Flex justifyContent="space-between" alignItems="center">
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="delta" tag="h2">
                Connection
              </Typography>
              <Badge>
                {formatMessage({
                  id: getTranslation('settings.status.disconnected'),
                  defaultMessage: 'Not connected',
                })}
              </Badge>
            </Flex>
            <Button disabled>Connect Sirv account</Button>
          </Flex>
        </Box>
      </Box>
    </Main>
  );
};

export { SettingsPage };
export default SettingsPage;
