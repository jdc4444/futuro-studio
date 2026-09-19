import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // GitHub Pages serves pre-rendered files, so keep this project fully static.
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
