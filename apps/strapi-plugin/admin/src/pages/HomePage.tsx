import { Box, Flex, Main, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { getTranslation } from '../getTranslation';

/**
 * The dedicated Sirv DAM page (admin sidebar -> Sirv). Milestone 1 renders a placeholder;
 * milestone 8 mounts `<DamBrowser>` from `@sirv/core` here in a full-page layout.
 */
const HomePage = () => {
  const { formatMessage } = useIntl();

  return (
    <Main>
      <Box paddingTop={8} paddingBottom={8} paddingLeft={10} paddingRight={10}>
        <Flex direction="column" alignItems="flex-start" gap={2}>
          <Typography variant="alpha" tag="h1">
            {formatMessage({ id: getTranslation('page.dam.title'), defaultMessage: 'Sirv media' })}
          </Typography>
          <Typography variant="epsilon" textColor="neutral600">
            {formatMessage({
              id: getTranslation('page.dam.subtitle'),
              defaultMessage: 'Browse and search your connected Sirv account.',
            })}
          </Typography>
        </Flex>

        <Box marginTop={8} padding={10} background="neutral0" hasRadius borderColor="neutral200">
          <Typography textColor="neutral600">
            The Sirv DAM browser will mount here. Connect your account in Settings -&gt; Sirv to get
            started.
          </Typography>
        </Box>
      </Box>
    </Main>
  );
};

export { HomePage };
export default HomePage;
