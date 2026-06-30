import type { ControllerFactory } from '../types';
import auth from './auth';
import dam from './dam';
import settings from './settings';

const controllers: Record<string, ControllerFactory> = {
  auth,
  dam,
  settings,
};

export default controllers;
