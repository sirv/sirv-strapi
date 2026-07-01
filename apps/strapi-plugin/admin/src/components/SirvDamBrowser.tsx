import {
  type BrowseType,
  type DamAsset,
  type DamFolder,
  filterAssetsByType,
  useFolders,
  useSearch,
  useTypeFilter,
} from '@sirv/core';
import type { SirvClient } from '@sirv/sirv-client';
import { buildUrl } from '@sirv/url-builder';
import { Box, Button, Flex, Loader, Typography } from '@strapi/design-system';
import { ArrowLeft, File as FileIcon, Folder, House, Search } from '@strapi/icons';
import { useState } from 'react';

export interface SirvDamBrowserProps {
  client: SirvClient;
  /** Account delivery host for thumbnails, e.g. "igor.sirv.com". */
  alias: string;
  allowedTypes?: BrowseType[];
  /** Called when an asset is confirmed. Omit for a browse-only view (the dedicated DAM page). */
  onSelect?: (asset: DamAsset) => void;
}

const THUMB = 200;

const TYPE_DISPLAY: Record<BrowseType, string> = {
  image: 'Image',
  video: 'Video',
  spin: '360 Spin',
  view: 'Media Viewer',
  model: '3D Model',
  file: 'File',
};

const assetUrl = (asset: DamAsset, alias: string) => buildUrl({ alias, path: asset.path });

/** Thumbnail URL per type (null for views/models, which have no static thumbnail). */
function thumbUrl(asset: DamAsset, alias: string): string | null {
  if (!alias) return null;
  const input = { alias, path: asset.path };
  switch (asset.type) {
    case 'image':
      return buildUrl(input, { width: THUMB, height: THUMB, scale: 'fit', format: 'optimal' });
    case 'video':
      return buildUrl(input, { extras: { thumbnail: THUMB } });
    case 'spin':
      return buildUrl(input, { width: THUMB, height: THUMB, extras: { image: 24 } });
    default:
      return null;
  }
}

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const segs = path.split('/').filter(Boolean);
  const crumbs = [{ name: 'Home', path: '/' }].concat(
    segs.map((s, i) => ({ name: s, path: `/${segs.slice(0, i + 1).join('/')}` })),
  );
  return (
    <Flex alignItems="center" gap={1} wrap="wrap">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <Flex key={c.path} alignItems="center" gap={1}>
            <Button
              type="button"
              variant="tertiary"
              disabled={last}
              startIcon={i === 0 ? <House /> : undefined}
              onClick={() => onNavigate(c.path)}
            >
              {i === 0 ? 'Home' : c.name}
            </Button>
            {last ? null : (
              <Typography variant="pi" textColor="neutral400">
                /
              </Typography>
            )}
          </Flex>
        );
      })}
    </Flex>
  );
}

const cardStyle: React.CSSProperties = { cursor: 'pointer', textAlign: 'center' };

function FolderCard({ folder, onOpen }: { folder: DamFolder; onOpen: () => void }) {
  return (
    <Box
      tag="button"
      type="button"
      onClick={onOpen}
      padding={3}
      hasRadius
      background="neutral0"
      borderColor="neutral200"
      style={cardStyle}
    >
      <Flex direction="column" alignItems="center" gap={2}>
        <Box style={{ height: 72, display: 'flex', alignItems: 'center', fontSize: '2.5rem' }}>
          <Folder />
        </Box>
        <Typography variant="pi" ellipsis title={folder.name}>
          {folder.name}
        </Typography>
      </Flex>
    </Box>
  );
}

function AssetCard({
  asset,
  alias,
  onClick,
}: { asset: DamAsset; alias: string; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  const src = thumbUrl(asset, alias);
  return (
    <Box
      tag="button"
      type="button"
      onClick={onClick}
      padding={2}
      hasRadius
      background="neutral0"
      borderColor="neutral200"
      style={cardStyle}
    >
      <Flex direction="column" alignItems="stretch" gap={2}>
        <Flex
          alignItems="center"
          justifyContent="center"
          background="neutral100"
          hasRadius
          style={{ height: 120, overflow: 'hidden' }}
        >
          {src && !failed ? (
            <img
              src={src}
              alt=""
              onError={() => setFailed(true)}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : asset.type === 'file' ? (
            <Box style={{ fontSize: '1.6rem' }}>
              <FileIcon />
            </Box>
          ) : (
            <Typography variant="pi" textColor="neutral500">
              {TYPE_DISPLAY[asset.type]}
            </Typography>
          )}
        </Flex>
        <Typography variant="pi" ellipsis title={asset.name}>
          {asset.name}
        </Typography>
      </Flex>
    </Box>
  );
}

function Preview({
  asset,
  alias,
  onConfirm,
  onBack,
}: {
  asset: DamAsset;
  alias: string;
  onConfirm: (a: DamAsset) => void;
  onBack: () => void;
}) {
  const url = assetUrl(asset, alias);
  const interactive = asset.type === 'spin' || asset.type === 'view' || asset.type === 'model';
  const imageSrc =
    asset.type === 'image' && alias
      ? buildUrl({ alias, path: asset.path }, { width: 640, format: 'optimal' })
      : null;
  const stillSrc = alias
    ? buildUrl({ alias, path: asset.path }, { width: 640, extras: { image: 24 } })
    : undefined;
  const videoPoster = alias
    ? buildUrl({ alias, path: asset.path }, { extras: { thumbnail: 640 } })
    : undefined;

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex
        alignItems="center"
        justifyContent="center"
        background="neutral100"
        hasRadius
        style={{ minHeight: 280, overflow: 'hidden' }}
      >
        {asset.type === 'video' ? (
          // biome-ignore lint/a11y/useMediaCaption: source assets have no caption track
          <video
            src={url}
            poster={videoPoster}
            controls
            preload="metadata"
            style={{ maxWidth: '100%', maxHeight: 420, background: '#000' }}
          />
        ) : imageSrc ? (
          <img src={imageSrc} alt={asset.name} style={{ maxWidth: '100%', maxHeight: 420 }} />
        ) : interactive && stillSrc ? (
          <img src={stillSrc} alt={asset.name} style={{ maxWidth: '100%', maxHeight: 420 }} />
        ) : (
          <Typography textColor="neutral500">{TYPE_DISPLAY[asset.type]}</Typography>
        )}
      </Flex>

      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography fontWeight="bold">{asset.name}</Typography>
        <Typography variant="pi" textColor="neutral600">
          {TYPE_DISPLAY[asset.type]}
          {asset.width && asset.height ? ` - ${asset.width}x${asset.height}` : ''}
          {interactive ? ' - interactive on your site via @sirv/react' : ''}
        </Typography>
      </Flex>

      <Flex justifyContent="space-between" gap={2}>
        <Button type="button" variant="tertiary" startIcon={<ArrowLeft />} onClick={onBack}>
          Back
        </Button>
        {onConfirm ? (
          <Button type="button" onClick={() => onConfirm(asset)}>
            Use this asset
          </Button>
        ) : null}
      </Flex>
    </Flex>
  );
}

/** Strapi Design System DAM browser driven by the @sirv/core data hooks. */
export function SirvDamBrowser({ client, alias, allowedTypes, onSelect }: SirvDamBrowserProps) {
  const [path, setPath] = useState('/');
  const [term, setTerm] = useState('');
  const [preview, setPreview] = useState<DamAsset | null>(null);
  const typeFilter = useTypeFilter(allowedTypes);
  const includeOther = typeFilter.allowed.includes('file');

  const searching = term.trim().length > 0;
  const folderState = useFolders(client, path, { includeOther });
  const searchState = useSearch(client, term, {
    types: typeFilter.active,
    enabled: searching,
    includeOther,
  });

  const folders = searching ? [] : folderState.folders;
  const assets = filterAssetsByType(
    searching ? searchState.results : folderState.assets,
    typeFilter.active,
  );
  const loading = searching ? searchState.loading : folderState.loading;
  const error = searching ? searchState.error : folderState.error;
  const empty = folders.length === 0 && assets.length === 0;
  const hasMore = searching ? searchState.hasMore : folderState.hasMore;
  const loadMore = searching ? searchState.loadMore : folderState.loadMore;

  const navigate = (next: string) => {
    setTerm('');
    setPreview(null);
    setPath(next);
  };

  if (preview) {
    return (
      <Preview
        asset={preview}
        alias={alias}
        onConfirm={onSelect ?? (() => undefined)}
        onBack={() => setPreview(null)}
      />
    );
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <TextInputSearch value={term} onChange={setTerm} />

      {typeFilter.visible ? (
        <Flex gap={2} wrap="wrap">
          {typeFilter.allowed.map((t) => (
            <Button
              key={t}
              type="button"
              variant={typeFilter.active.includes(t) ? 'default' : 'tertiary'}
              onClick={() => typeFilter.toggle(t)}
            >
              {TYPE_DISPLAY[t]}
            </Button>
          ))}
        </Flex>
      ) : null}

      {searching ? null : <Breadcrumb path={path} onNavigate={navigate} />}

      {error ? (
        <Typography textColor="danger600" role="alert">
          {error}
        </Typography>
      ) : null}

      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {folders.map((f) => (
          <FolderCard key={f.path} folder={f} onOpen={() => navigate(f.path)} />
        ))}
        {assets.map((a) => (
          <AssetCard key={a.path} asset={a} alias={alias} onClick={() => setPreview(a)} />
        ))}
      </Box>

      {loading ? (
        <Flex justifyContent="center" padding={4}>
          <Loader small>Loading...</Loader>
        </Flex>
      ) : null}

      {empty && !loading ? (
        <Box padding={4}>
          <Typography textColor="neutral600">
            {searching ? 'No matching assets.' : 'This folder is empty.'}
          </Typography>
        </Box>
      ) : null}

      {hasMore ? (
        <Flex justifyContent="center">
          <Button type="button" variant="tertiary" onClick={loadMore} disabled={loading}>
            Load more
          </Button>
        </Flex>
      ) : null}
    </Flex>
  );
}

/** Small controlled search field (kept separate so the icon import stays local). */
function TextInputSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Flex
      alignItems="center"
      gap={2}
      paddingLeft={3}
      paddingRight={3}
      background="neutral0"
      hasRadius
      borderColor="neutral200"
      style={{ height: 40 }}
    >
      <Search />
      <input
        placeholder="Search this account..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          flex: 1,
          height: '100%',
          color: 'inherit',
          font: 'inherit',
        }}
      />
    </Flex>
  );
}
