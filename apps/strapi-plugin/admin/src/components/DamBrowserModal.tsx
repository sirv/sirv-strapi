import type { BrowseType, DamAsset } from '@sirv/core';
import type { AccountInfo, SirvClient } from '@sirv/sirv-client';
import { Box, Flex, Loader, Modal, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { useEffect, useMemo, useState } from 'react';
import { createProxyClient } from '../api/proxy-client';
import {
  type SirvFieldValue,
  damAssetToFieldValue,
  enrichFieldValue,
} from '../custom-fields/sirv-media/value';
import { SirvDamBrowser } from './SirvDamBrowser';

export interface DamBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedTypes?: BrowseType[];
  /** Single-select pick. */
  onPicked?: (value: SirvFieldValue) => void;
  /** Multi-select: when set, the browser runs in multiple mode and returns all picks at once. */
  multiple?: boolean;
  onPickedMany?: (values: SirvFieldValue[]) => void;
}

function deliveryHost(info: AccountInfo): string {
  if (info.cdnURL) return info.cdnURL;
  return info.alias.includes('.') ? info.alias : `${info.alias}.sirv.com`;
}

/**
 * The DAM browser in a Strapi modal. Builds a proxy `SirvClient` (routes through `/sirv/*`),
 * resolves the delivery host, and renders `SirvDamBrowser`. Picked `DamAsset`s are converted to
 * `SirvFieldValue`s (enriched with the asset's Sirv title/description) before being handed back.
 */
export const DamBrowserModal = ({
  open,
  onOpenChange,
  allowedTypes,
  onPicked,
  multiple,
  onPickedMany,
}: DamBrowserModalProps) => {
  const fetchClient = useFetchClient();
  const client: SirvClient = useMemo(
    () => createProxyClient({ get: fetchClient.get, post: fetchClient.post }),
    [fetchClient],
  );

  const [alias, setAlias] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>();

  useEffect(() => {
    if (!open || status !== 'idle') return;
    setStatus('loading');
    client
      .getAccountInfo()
      .then((info) => {
        setAlias(deliveryHost(info));
        setStatus('ready');
      })
      .catch(() => {
        setErrorMsg('Connect a Sirv account in Settings -> Sirv before browsing.');
        setStatus('error');
      });
  }, [open, status, client]);

  const handleSelect = async (asset: DamAsset) => {
    if (!alias) return;
    const value = await enrichFieldValue(damAssetToFieldValue(asset, alias));
    onPicked?.(value);
    onOpenChange(false);
  };

  const handleSelectMany = async (assets: DamAsset[]) => {
    if (!alias) return;
    const values = await Promise.all(
      assets.map((a) => enrichFieldValue(damAssetToFieldValue(a, alias))),
    );
    onPickedMany?.(values);
    onOpenChange(false);
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content style={{ width: '90vw' }}>
        <Modal.Header>
          <Modal.Title>Pick from Sirv</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Box style={{ minHeight: '60vh' }}>
            {status === 'ready' && alias ? (
              <SirvDamBrowser
                client={client}
                alias={alias}
                allowedTypes={allowedTypes}
                onSelect={handleSelect}
                multiple={multiple}
                onSelectMany={handleSelectMany}
              />
            ) : status === 'error' ? (
              <Flex justifyContent="center" padding={8}>
                <Typography textColor="neutral600">{errorMsg}</Typography>
              </Flex>
            ) : (
              <Flex justifyContent="center" padding={8}>
                <Loader>Loading your Sirv account...</Loader>
              </Flex>
            )}
          </Box>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
};

export default DamBrowserModal;
