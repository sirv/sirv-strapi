import { Route, Routes } from 'react-router-dom';
import { HomePage } from './HomePage';

/**
 * Router for the plugin's sidebar entry, mounted by Strapi at `/plugins/sirv`.
 * Child routes are relative to that base.
 */
const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
    </Routes>
  );
};

export { App };
export default App;
