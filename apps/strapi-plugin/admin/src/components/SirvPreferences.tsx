import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type UsageSummary, createSirvApi } from '../api/sirv-api';

const GB = 1024 ** 3;
const fmtGB = (bytes: number) => `${(bytes / GB).toFixed(2)} GB`;

/**
 * Account usage summary shown on the Settings page once connected. Renders nothing while
 * disconnected. Keyed by the parent so it refetches after a connect/disconnect.
 */
export const SirvPreferences = () => {
  const { get, post } = useFetchClient();
  const api = useMemo(() => createSirvApi({ get, post }), [get, post]);

  const [usage, setUsage] = useState<UsageSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const status = await api.getStatus();
      if (!status.connected) {
        setUsage(null);
        return;
      }
      setUsage(await api.getUsage());
    } catch {
      setUsage(null);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!usage) return null;

  return (
    <Box padding={6} background="neutral0" hasRadius borderColor="neutral200">
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" tag="h2">
          Account usage
        </Typography>
        <Grid.Root gap={4}>
          <Grid.Item col={4} s={12} direction="column" alignItems="flex-start">
            <Typography variant="pi" textColor="neutral600">
              Storage used
            </Typography>
            <Typography variant="beta">{fmtGB(usage.used)}</Typography>
          </Grid.Item>
          <Grid.Item col={4} s={12} direction="column" alignItems="flex-start">
            <Typography variant="pi" textColor="neutral600">
              Plan storage
            </Typography>
            <Typography variant="beta">{fmtGB(usage.plan)}</Typography>
          </Grid.Item>
          <Grid.Item col={4} s={12} direction="column" alignItems="flex-start">
            <Typography variant="pi" textColor="neutral600">
              Files
            </Typography>
            <Typography variant="beta">{usage.files.toLocaleString()}</Typography>
          </Grid.Item>
        </Grid.Root>
      </Flex>
    </Box>
  );
};

export default SirvPreferences;
