import { Box, Flex, Link, Typography } from '@strapi/design-system';

const DOCS_URL = 'https://sirv.com/help/';
const SUPPORT_URL = 'https://sirv.com/help/support/';
const API_KEYS_URL = 'https://my.sirv.com/#/account/settings/api';

/** Help & support section for the Settings page (mirrors the Sanity/Storyblok plugins). */
export const SirvHelp = () => (
  <Box padding={6} background="neutral0" hasRadius borderColor="neutral200">
    <Flex direction="column" alignItems="flex-start" gap={4}>
      <Typography variant="delta" tag="h2">
        Help &amp; support
      </Typography>
      <Typography textColor="neutral600">
        We'd love to hear from you. Send us your questions and feedback - this plugin is improved
        based on customer input.
      </Typography>
      <Flex gap={6} wrap="wrap">
        <Link href={DOCS_URL} isExternal>
          Documentation
        </Link>
        <Link href={SUPPORT_URL} isExternal>
          Contact support
        </Link>
        <Link href={API_KEYS_URL} isExternal>
          Your API keys
        </Link>
      </Flex>
    </Flex>
  </Box>
);

export default SirvHelp;
