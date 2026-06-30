import { useEffect, useRef } from 'react';
import { PLUGIN_ID } from '../pluginId';

interface InitializerProps {
  setPlugin: (id: string) => void;
}

/**
 * Strapi calls this once on admin boot to mark the plugin "ready". Required by
 * `registerPlugin({ isReady: false, initializer })`.
 */
const Initializer = ({ setPlugin }: InitializerProps) => {
  const ref = useRef(setPlugin);

  useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);

  return null;
};

export { Initializer };
export default Initializer;
