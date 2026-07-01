import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type SirvDefaults, type UsageSummary, createSirvApi } from '../api/sirv-api';

const GB = 1024 ** 3;
const fmtGB = (bytes: number) => `${(bytes / GB).toFixed(2)} GB`;

const FORMAT_OPTIONS: Array<{ value: NonNullable<SirvDefaults['format']>; label: string }> = [
  { value: 'optimal', label: 'Optimal (AVIF/WebP)' },
  { value: 'webp', label: 'WebP' },
  { value: 'jpg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'original', label: 'Original' },
];

/**
 * Shown on the Settings page once connected: account usage summary + a default-transformations
 * form (quality / format) persisted server-side. Renders nothing while disconnected. Keyed by the
 * parent so it refetches after a connect/disconnect.
 */
export const SirvPreferences = () => {
  const { get, post } = useFetchClient();
  const api = useMemo(() => createSirvApi({ get, post }), [get, post]);
  const { toggleNotification } = useNotification();

  const [connected, setConnected] = useState(false);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [quality, setQuality] = useState<number | undefined>(undefined);
  const [format, setFormat] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const status = await api.getStatus();
      setConnected(status.connected);
      if (!status.connected) return;
      setQuality(status.defaults?.quality);
      setFormat(status.defaults?.format ?? '');
      try {
        setUsage(await api.getUsage());
      } catch {
        setUsage(null);
      }
    } catch {
      setConnected(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const defaults: SirvDefaults = {};
      if (typeof quality === 'number') defaults.quality = quality;
      if (format) defaults.format = format as SirvDefaults['format'];
      await api.updateSettings(defaults);
      toggleNotification({ type: 'success', message: 'Default transformations saved.' });
    } catch {
      toggleNotification({ type: 'danger', message: 'Could not save transformations.' });
    } finally {
      setSaving(false);
    }
  }, [api, quality, format, toggleNotification]);

  if (!connected) return null;

  return (
    <Flex direction="column" alignItems="stretch" gap={6}>
      {usage ? (
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
      ) : null}

      <Box padding={6} background="neutral0" hasRadius borderColor="neutral200">
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="delta" tag="h2">
              Default transformations
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              Applied to delivered assets unless a field overrides them.
            </Typography>
          </Flex>

          <Grid.Root gap={4}>
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Field.Root name="quality" hint="1-100">
                <Field.Label>Image quality</Field.Label>
                <NumberInput
                  name="quality"
                  value={quality}
                  onValueChange={(v: number | undefined) => setQuality(v)}
                />
                <Field.Hint />
              </Field.Root>
            </Grid.Item>
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Field.Root name="format">
                <Field.Label>Image format</Field.Label>
                <SingleSelect
                  value={format}
                  onChange={(v: string | number) => setFormat(String(v))}
                  placeholder="Sirv default"
                >
                  {FORMAT_OPTIONS.map((o) => (
                    <SingleSelectOption key={o.value} value={o.value}>
                      {o.label}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Field.Root>
            </Grid.Item>
          </Grid.Root>

          <Box>
            <Button onClick={save} loading={saving}>
              Save defaults
            </Button>
          </Box>
        </Flex>
      </Box>
    </Flex>
  );
};

export default SirvPreferences;
