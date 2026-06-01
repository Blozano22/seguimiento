import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx', 'googleapis'],
  devIndicators: false,
  basePath: isProd ? '/seguimiento' : '',
};

export default nextConfig;
