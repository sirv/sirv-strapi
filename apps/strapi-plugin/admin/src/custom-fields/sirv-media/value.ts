import type { DamAsset } from '@sirv/core/types';
import { buildUrl } from '@sirv/url-builder';

/**
 * The value stored by a `sirv-media` field. This is the `SirvFieldValue` discriminated union
 * (spec section 8) - and, deliberately, the exact shape `@sirv/react` consumes as `SirvMediaLike`
 * (`_type` + `asset.{sirvAlias,sirvPath,...}`), so a frontend renders it directly with
 * `<SirvMedia value={stored} />` - no converter needed (unlike the Sanity plugin). Dimensions are
 * optional because Sirv does not always report them; `@sirv/react` handles their absence.
 */
export interface SirvStoredAsset {
  sirvPath: string;
  sirvAlias: string;
  /** Canonical (untransformed) delivery URL, for consumers that do not use @sirv/react. */
  originalUrl: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  format?: string;
}

export type SirvFieldValue =
  | { _type: 'sirv.image'; asset: SirvStoredAsset; alt?: string; caption?: string }
  | {
      _type: 'sirv.video';
      asset: SirvStoredAsset;
      controls?: boolean;
      autoplay?: boolean;
      loop?: boolean;
      muted?: boolean;
      caption?: string;
    }
  | { _type: 'sirv.spin'; asset: SirvStoredAsset; caption?: string }
  | { _type: 'sirv.view'; asset: SirvStoredAsset; caption?: string };

function extensionFormat(path: string): string | undefined {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? undefined : path.slice(dot + 1).toLowerCase();
}

/** Builds the stored field value from a picked DAM asset and the account delivery host. */
export function damAssetToFieldValue(asset: DamAsset, alias: string): SirvFieldValue {
  const base: SirvStoredAsset = {
    sirvPath: asset.path,
    sirvAlias: alias,
    originalUrl: buildUrl({ alias, path: asset.path }),
    bytes: asset.bytes,
    format: extensionFormat(asset.path),
  };

  switch (asset.type) {
    case 'image':
      return {
        _type: 'sirv.image',
        asset: { ...base, width: asset.width, height: asset.height },
        alt: '',
      };
    case 'video':
      return {
        _type: 'sirv.video',
        asset: {
          ...base,
          width: asset.width,
          height: asset.height,
          durationSec: asset.durationSec,
        },
        controls: true,
      };
    case 'spin':
      return { _type: 'sirv.spin', asset: base };
    case 'view':
      return { _type: 'sirv.view', asset: base };
    default:
      throw new Error(`Cannot store asset of type "${asset.type}" as Sirv media.`);
  }
}

/** Short human label for a stored value (used in the field preview). */
export function describeFieldValue(value: SirvFieldValue): string {
  const name = value.asset.sirvPath.split('/').pop() ?? value.asset.sirvPath;
  const kind = value._type.replace('sirv.', '');
  return `${kind} - ${name}`;
}
