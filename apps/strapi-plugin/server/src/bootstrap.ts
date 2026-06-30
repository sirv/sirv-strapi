import type { Core } from '@strapi/strapi';

/**
 * Runs once after all plugins are registered. Milestone 1 is a no-op; later milestones
 * register RBAC permission actions for the DAM/settings endpoints here.
 */
const bootstrap = (_: { strapi: Core.Strapi }) => {};

export default bootstrap;
