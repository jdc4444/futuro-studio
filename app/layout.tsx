import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FUTURO',
  description: 'futuro — brooklyn, new york.',
  icons: {
    // The opening screen's clean all-caps FUTURO wordmark. Each fallback size
    // is drawn independently by scripts/make-icons.py.
    icon: [
      { url: '/futuro-logo-v2.ico', type: 'image/x-icon', sizes: '16x16 32x32 48x48' },
      { url: '/futuro-logo-v2-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/futuro-logo-v2-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/futuro-logo-v2-48.png', type: 'image/png', sizes: '48x48' },
      { url: '/futuro-logo-v2.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/futuro-logo-v2.ico',
    apple: { url: '/futuro-logo-v2-180.png', sizes: '180x180' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
