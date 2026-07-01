import { SirvApiError } from '@sirv/sirv-client';

/** Maps typed service errors to an HTTP status + JSON body on the Koa context. */
export function respondError(ctx: any, err: unknown): void {
  const status =
    (err as { httpStatus?: number })?.httpStatus ??
    (err instanceof SirvApiError ? err.status : undefined) ??
    500;
  const message = err instanceof Error ? err.message : 'Unexpected error';
  ctx.status = status;
  ctx.body = { error: message };
}

/** Parses a `types` csv query param into the supported media types. */
const MEDIA_TYPES = new Set(['image', 'video', 'spin', 'view']);
export function parseTypes(raw: unknown): Array<'image' | 'video' | 'spin' | 'view'> {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is 'image' | 'video' | 'spin' | 'view' => MEDIA_TYPES.has(t));
}
