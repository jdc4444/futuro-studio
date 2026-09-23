import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FUTURO',
  description: 'futuro — brooklyn, new york.',
  icons: {
    // The opening screen's clean all-caps FUTURO wordmark. Each fallback size
    // is drawn independently by scripts/make-icons.py.
    icon: [
      { url: '/futuro-logo-v1.ico', type: 'image/x-icon', sizes: '16x16 32x32 48x48' },
      { url: '/futuro-logo-v1.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/futuro-logo-v1-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/futuro-logo-v1-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/futuro-logo-v1-48.png', type: 'image/png', sizes: '48x48' },
    ],
    shortcut: '/futuro-logo-v1.ico',
    apple: { url: '/futuro-logo-v1-180.png', sizes: '180x180' },
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
