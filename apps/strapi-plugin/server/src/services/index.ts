import type { ServiceFactory } from '../types';
import auth from './auth';
import encryption from './encryption';
import preferences from './preferences';
import sirvClient from './sirv-client';
import tokenStorage from './token-storage';

const services: Record<string, ServiceFactory> = {
  encryption,
  'token-storage': tokenStorage,
  'sirv-client': sirvClient,
  auth,
  preferences,
};

export default services;
