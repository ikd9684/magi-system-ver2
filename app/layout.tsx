import type { Metadata } from 'next';
import './globals.css';
import { MAGIProvider } from '@/contexts/MAGIContext';

export const metadata: Metadata = {
  title: 'MAGI SYSTEM ver.2',
  description: 'Multi-Agent General Intelligence — Three AI personalities debate and vote',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <MAGIProvider>{children}</MAGIProvider>
      </body>
    </html>
  );
}
