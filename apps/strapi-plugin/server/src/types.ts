/**
 * Loose, self-contained types for the plugin's server interface. Deliberately kept free of
 * `@strapi/types` deep references so the generated `.d.ts` files stay portable: when an
 * aggregator's default export infers a type that points at `@strapi/types/dist/core`, the
 * declaration emit fails with TS2742. Naming the shapes here sidesteps that. Leaf controllers /
 * services keep their precise `Core.Strapi` typing for dev ergonomics.
 */

type Ctx = { strapi: any };

export type ControllerFactory = (
  ctx: Ctx,
) => Record<string, (koaCtx: any) => unknown | Promise<unknown>>;

export type ServiceFactory = (ctx: Ctx) => Record<string, (...args: any[]) => unknown>;

export interface PluginRoute {
  method: string;
  path: string;
  handler: string;
  config?: { policies?: string[] };
}

export interface PluginRouters {
  admin: { type: string; routes: PluginRoute[] };
}

export interface PluginServer {
  register: (ctx: Ctx) => void;
  bootstrap: (ctx: Ctx) => void;
  destroy: (ctx: Ctx) => void;
  config: { default: Record<string, unknown>; validator: (...args: any[]) => void };
  controllers: Record<string, ControllerFactory>;
  routes: PluginRouters;
  services: Record<string, ServiceFactory>;
  contentTypes: Record<string, unknown>;
  policies: Record<string, unknown>;
  middlewares: Record<string, unknown>;
}
