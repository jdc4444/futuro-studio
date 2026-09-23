import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // GitHub Pages serves pre-rendered files, so keep this project fully static.
  // The public GitHub Pages workflow needs HTML files. The separate Studio
  // host retains the dynamic private front door and its state API.
  output: process.env.GITHUB_ACTIONS === 'true' ? 'export' : undefined,
  trailingSlash: true,
};

export default nextConfig;
