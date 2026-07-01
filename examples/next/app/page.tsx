import { ShowcaseView } from './ShowcaseView';

/** Strapi v5 REST flattens attributes onto the entry, so custom-field values are top-level. */
interface Showcase {
  title: string;
  image?: unknown;
  video?: unknown;
  spin?: unknown;
  viewer?: unknown;
  anyMedia?: unknown;
  gallery?: unknown[];
}

async function getShowcase(): Promise<Showcase | null> {
  const base = process.env.STRAPI_URL ?? 'http://localhost:1337';
  const token = process.env.STRAPI_API_TOKEN;
  try {
    const res = await fetch(`${base}/api/showcases?status=published`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Showcase[] };
    return json.data?.[0] ?? null;
  } catch {
    return null;
  }
}

export default async function Page() {
  const showcase = await getShowcase();

  return (
    <main>
      <h1 style={{ marginBottom: '0.25rem' }}>Sirv + Strapi</h1>
      <p style={{ color: '#666', marginTop: 0 }}>
        Every field below is a <code>sirv-media</code> value stored in Strapi and rendered with{' '}
        <code>@sirv/react</code>.
      </p>
      <ShowcaseView showcase={showcase} />
    </main>
  );
}
