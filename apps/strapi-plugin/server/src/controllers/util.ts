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
