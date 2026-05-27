import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx', 'googleapis'],
  devIndicators: false,
};

export default nextConfig;
