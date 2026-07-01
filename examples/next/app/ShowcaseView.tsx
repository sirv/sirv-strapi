'use client';

import { SirvImage, SirvMedia, SirvProvider, SirvSpin, SirvVideo, SirvView } from '@sirv/react';
import type { ReactNode } from 'react';

interface Showcase {
  title: string;
  image?: unknown;
  video?: unknown;
  spin?: unknown;
  viewer?: unknown;
  anyMedia?: unknown;
}

function Section({ title, code, children }: { title: string; code: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: '2.5rem' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>{title}</h2>
      <p style={{ color: '#888', marginTop: 0, fontSize: '0.85rem' }}>
        <code>{code}</code>
      </p>
      {children}
    </section>
  );
}

/**
 * Renders each stored Sirv field with the matching @sirv/react component. The stored value IS a
 * `SirvMediaLike`, so it is passed straight through as `value` - no conversion needed.
 */
export function ShowcaseView({ showcase }: { showcase: Showcase | null }) {
  if (!showcase) {
    return (
      <p style={{ marginTop: '2rem', color: '#b00' }}>
        No published Showcase found. In Strapi, create a <strong>Sirv Showcase</strong> entry, pick
        assets for each field, publish it, then reload.
      </p>
    );
  }

  // The stored JSON is already a SirvMediaLike; cast for the strict component prop types.
  const asValue = (v: unknown) => v as never;

  return (
    <SirvProvider>
      {showcase.image ? (
        <Section title="Image" code="<SirvImage value={image} />">
          <SirvImage value={asValue(showcase.image)} width={640} />
        </Section>
      ) : null}

      {showcase.video ? (
        <Section title="Video" code="<SirvVideo value={video} />">
          <SirvVideo value={asValue(showcase.video)} width={640} />
        </Section>
      ) : null}

      {showcase.spin ? (
        <Section title="360 Spin" code="<SirvSpin value={spin} />">
          <SirvSpin value={asValue(showcase.spin)} width={500} height={500} />
        </Section>
      ) : null}

      {showcase.viewer ? (
        <Section title="Media Viewer" code="<SirvView value={viewer} />">
          <SirvView value={asValue(showcase.viewer)} width={640} height={440} />
        </Section>
      ) : null}

      {showcase.anyMedia ? (
        <Section title="Any media (polymorphic)" code="<SirvMedia value={anyMedia} />">
          <SirvMedia value={asValue(showcase.anyMedia)} width={640} />
        </Section>
      ) : null}
    </SirvProvider>
  );
}
