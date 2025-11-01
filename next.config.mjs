/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: [
    '@livekit/components-react',
    '@livekit/components-styles',
    'livekit-client',
  ],
  productionBrowserSourceMaps: true,
};

export default nextConfig;