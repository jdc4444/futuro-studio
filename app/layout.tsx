import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'futuro',
  description: 'futuro — brooklyn, new york.',
  icons: {
    icon: [
      { url: '/favicon-wordmark.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-wordmark-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-wordmark.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: '/apple-touch-wordmark.png',
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
