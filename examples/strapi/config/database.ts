import path from 'node:path';

export default ({ env }: { env: any }) => ({
  connection: {
    client: 'sqlite',
    connection: {
      // Two `..` on purpose: Strapi runs the compiled config from `dist/config`, so this resolves
      // to the app root (examples/strapi/.tmp/data.db) and the db survives `dist/` rebuilds.
      filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
    },
    useNullAsDefault: true,
  },
});
