import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'futuro',
  description: 'futuro — brooklyn, new york.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=futuro-stacked-20260909', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-32.png?v=futuro-stacked-20260909', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.svg?v=futuro-stacked-20260909', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png?v=futuro-stacked-20260909',
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
