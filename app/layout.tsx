import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FUTURO',
  description: 'futuro — brooklyn, new york.',
  icons: {
    icon: [
      { url: '/futuro-icon-v2.ico', type: 'image/x-icon', sizes: '16x16 32x32 48x48' },
      { url: '/futuro-icon-v2-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/futuro-icon-v2-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/futuro-icon-v2-48.png', type: 'image/png', sizes: '48x48' },
    ],
    shortcut: '/futuro-icon-v2.ico',
    apple: { url: '/futuro-icon-v2-180.png', sizes: '180x180' },
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
