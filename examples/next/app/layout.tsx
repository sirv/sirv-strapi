import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sirv + Strapi example',
  description: 'Rendering Sirv Showcase fields from Strapi with @sirv/react',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          padding: '2rem',
          maxWidth: 820,
          marginInline: 'auto',
          lineHeight: 1.5,
          background: '#ffffff',
          color: '#111111',
          colorScheme: 'light',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
