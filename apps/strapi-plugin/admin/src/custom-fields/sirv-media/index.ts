import { PLUGIN_ID } from '../../pluginId';

/** The custom field's short name (as registered) and its fully-qualified uid. */
export const SIRV_MEDIA_FIELD = 'sirv-media';
export const SIRV_MEDIA_UID = `plugin::${PLUGIN_ID}.${SIRV_MEDIA_FIELD}` as const;

/** Asset types a schema author may allow on a `sirv-media` field. */
export const ALLOWED_ASSET_TYPES = ['image', 'video', 'spin', 'view'] as const;
export type AllowedAssetType = (typeof ALLOWED_ASSET_TYPES)[number];
