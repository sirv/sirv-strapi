import type { AccountInfo, SirvClient } from '@sirv/sirv-client';
import { Box, Flex, Link, Loader, Main, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { createProxyClient } from '../api/proxy-client';
import { SirvDamBrowser } from '../components/SirvDamBrowser';
import { getTranslation } from '../getTranslation';

function deliveryHost(info: AccountInfo): string {
  if (info.cdnURL) return info.cdnURL;
  return info.alias.includes('.') ? info.alias : `${info.alias}.sirv.com`;
}

/**
 * The dedicated Sirv DAM page (admin sidebar -> Sirv). A full-page, browse-only mount of the same
 * `SirvDamBrowser` used by the field picker - no selection, just navigation/search/preview.
 */
const HomePage = () => {
  const { formatMessage } = useIntl();
  const fetchClient = useFetchClient();
  const client: SirvClient = useMemo(
    () => createProxyClient({ get: fetchClient.get, post: fetchClient.post }),
    [fetchClient],
  );

  const [alias, setAlias] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'disconnected'>('loading');

  useEffect(() => {
    let cancelled = false;
    client
      .getAccountInfo()
      .then((info) => {
        if (cancelled) return;
        setAlias(deliveryHost(info));
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('disconnected');
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  return (
    <Main>
      <Box paddingTop={8} paddingBottom={8} paddingLeft={10} paddingRight={10}>
        <Flex direction="column" alignItems="flex-start" gap={2} paddingBottom={6}>
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

        {status === 'loading' ? (
          <Flex justifyContent="center" padding={10}>
            <Loader>Loading your Sirv account...</Loader>
          </Flex>
        ) : status === 'disconnected' ? (
          <Box padding={8} background="neutral0" hasRadius borderColor="neutral200">
            <Typography textColor="neutral600">
              No Sirv account is connected.{' '}
              <Link href="/admin/settings/sirv">Connect one in Settings.</Link>
            </Typography>
          </Box>
        ) : (
          alias && <SirvDamBrowser client={client} alias={alias} />
        )}
      </Box>
    </Main>
  );
};

export { HomePage };
export default HomePage;
