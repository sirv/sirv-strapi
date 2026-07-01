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
import { Box, Button, Flex, Link, Loader, Typography } from '@strapi/design-system';
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

const THUMB = 220;

const TYPE_DISPLAY: Record<BrowseType, string> = {
  image: 'Image',
  video: 'Video',
  spin: '360 Spin',
  view: 'Media Viewer',
  model: '3D Model',
  file: 'File',
};

const assetUrl = (asset: DamAsset, alias: string) => buildUrl({ alias, path: asset.path });

/** The my.sirv.com file-manager deep link for an asset (matches the other Sirv plugins). */
function manageUrl(asset: DamAsset): string {
  const dir = asset.path.slice(0, asset.path.lastIndexOf('/')) || '/';
  return `https://my.sirv.com/#/browse${dir}?preview=${encodeURIComponent(asset.path)}`;
}

/**
 * A static thumbnail per type. Spins use a rendered frame; views append `?thumb`; videos and
 * 3D models append `?thumbnail=<size>`. Returns null for generic files (icon fallback).
 */
function thumbUrl(asset: DamAsset, alias: string, size = THUMB): string | null {
  if (!alias) return null;
  const input = { alias, path: asset.path };
  switch (asset.type) {
    case 'image':
      return buildUrl(input, { width: size, height: size, scale: 'fit', format: 'optimal' });
    case 'video':
    case 'model':
      return `${buildUrl(input)}?thumbnail=${size}`;
    case 'spin':
      return buildUrl(input, { width: size, height: size, extras: { image: 24 } });
    case 'view':
      return `${buildUrl(input)}?thumb`;
    default:
      return null;
  }
}

const ICON_STYLE: React.CSSProperties = { width: '3rem', height: '3rem' };

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
            <button
              type="button"
              onClick={() => !last && onNavigate(c.path)}
              disabled={last}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: last ? 'default' : 'pointer',
                padding: i === 0 ? 0 : '0 4px',
                color: last ? 'inherit' : '#4945ff',
                font: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {i === 0 ? <House aria-hidden /> : null}
              {i === 0 ? 'Home' : c.name}
            </button>
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

const cardStyle: React.CSSProperties = { cursor: 'pointer', textAlign: 'center', color: '#fff' };
const cardLabel: React.CSSProperties = { color: '#fff' };

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
        <Box
          style={{ height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Folder style={ICON_STYLE} aria-hidden />
        </Box>
        <Typography variant="pi" ellipsis title={folder.name} style={cardLabel}>
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
            <FileIcon style={ICON_STYLE} aria-hidden />
          ) : (
            <Typography variant="pi" style={cardLabel}>
              {TYPE_DISPLAY[asset.type]}
            </Typography>
          )}
        </Flex>
        <Typography variant="pi" ellipsis title={asset.name} style={cardLabel}>
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
  const [thumbFailed, setThumbFailed] = useState(false);
  const url = assetUrl(asset, alias);
  const still = thumbUrl(asset, alias, 640);
  const isImage = asset.type === 'image';
  const isVideo = asset.type === 'video';
  const imageSrc =
    isImage && alias
      ? buildUrl({ alias, path: asset.path }, { width: 640, format: 'optimal' })
      : null;

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: 280, overflow: 'hidden' }}
      >
        {isVideo ? (
          // biome-ignore lint/a11y/useMediaCaption: source assets have no caption track
          <video
            src={url}
            poster={still ?? undefined}
            controls
            preload="metadata"
            style={{ maxWidth: '100%', maxHeight: 420, background: '#000' }}
          />
        ) : imageSrc ? (
          <img src={imageSrc} alt={asset.name} style={{ maxWidth: '100%', maxHeight: 420 }} />
        ) : still && !thumbFailed ? (
          <img
            src={still}
            alt={asset.name}
            onError={() => setThumbFailed(true)}
            style={{ maxWidth: '100%', maxHeight: 420 }}
          />
        ) : (
          <Typography textColor="neutral500">{TYPE_DISPLAY[asset.type]}</Typography>
        )}
      </Flex>

      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography fontWeight="bold">{asset.name}</Typography>
        <Typography variant="pi" textColor="neutral600">
          {TYPE_DISPLAY[asset.type]}
          {asset.width && asset.height ? ` - ${asset.width}x${asset.height}` : ''}
        </Typography>
        <Flex gap={4} paddingTop={1} wrap="wrap">
          <Link href={url} isExternal>
            Open original
          </Link>
          <Link href={manageUrl(asset)} isExternal>
            Open in Sirv
          </Link>
        </Flex>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '0.75rem',
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
      <Search aria-hidden />
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
