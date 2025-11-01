/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    runtime: 'nodejs', // 👈 Forces Node runtime by default
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: [
    'next-auth',
    'bcryptjs',
    'drizzle-orm',
    '@livekit/components-react',
    '@livekit/components-styles',
    'livekit-client',
    'livekit-server-sdk',
  ],
  productionBrowserSourceMaps: true,
};

export default nextConfig;
