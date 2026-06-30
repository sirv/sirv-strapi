import type { Core } from '@strapi/strapi';

/** Runs on server shutdown. Nothing to tear down yet. */
const destroy = (_: { strapi: Core.Strapi }) => {};

export default destroy;
