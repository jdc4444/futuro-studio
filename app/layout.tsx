import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FUTURO',
  description: 'futuro — brooklyn, new york.',
  icons: {
    // butterflies in squares, after the opening animation; each size is a drawing of its own (scripts/make-icons.py)
    icon: [
      { url: '/futuro-icon-v3.ico', type: 'image/x-icon', sizes: '16x16 32x32 48x48' },
      { url: '/futuro-icon-v3.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/futuro-icon-v3-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/futuro-icon-v3-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/futuro-icon-v3-48.png', type: 'image/png', sizes: '48x48' },
    ],
    shortcut: '/futuro-icon-v3.ico',
    apple: { url: '/futuro-icon-v3-180.png', sizes: '180x180' },
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
