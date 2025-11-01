/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: [
    '@livekit/components-react',
    '@livekit/components-styles',
    'livekit-client',
    'livekit-server-sdk',
    'next-auth',
    'bcryptjs',
    'drizzle-orm',
  ],
  productionBrowserSourceMaps: true,
  // ❌ remove experimental.runtime
};

export default nextConfig;
