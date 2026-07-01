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
  onPicked: (value: SirvFieldValue) => void;
}

/** Resolve the delivery host (for thumbnails / URLs) from account info. */
function deliveryHost(info: AccountInfo): string {
  if (info.cdnURL) return info.cdnURL;
  return info.alias.includes('.') ? info.alias : `${info.alias}.sirv.com`;
}

/**
 * The DAM browser in a Strapi modal. Builds a proxy `SirvClient` (routes through `/sirv/*`),
 * resolves the account delivery host, and renders `SirvDamBrowser`. On confirm, converts the
 * picked `DamAsset` into a `SirvFieldValue` and hands it back.
 */
export const DamBrowserModal = ({
  open,
  onOpenChange,
  allowedTypes,
  onPicked,
}: DamBrowserModalProps) => {
  const fetchClient = useFetchClient();
  const client: SirvClient = useMemo(
    () => createProxyClient({ get: fetchClient.get, post: fetchClient.post }),
    [fetchClient],
  );

  const [alias, setAlias] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>();

  // Resolve the delivery host once the modal opens (also acts as a connection check).
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
    // Enrich with the asset's Sirv title/description (alt/caption) before storing.
    const value = await enrichFieldValue(damAssetToFieldValue(asset, alias));
    onPicked(value);
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
