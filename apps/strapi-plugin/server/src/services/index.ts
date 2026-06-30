import type { ServiceFactory } from '../types';
import sirvClient from './sirv-client';

const services: Record<string, ServiceFactory> = {
  'sirv-client': sirvClient,
};

export default services;
