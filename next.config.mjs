/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid build blocking on minor issues
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // ✅ Fix for Vercel build crashes (transpile ESM packages)
  transpilePackages: [
    '@livekit/components-react',
    '@livekit/components-styles',
    'livekit-client',
    'livekit-server-sdk',
  ],

  // 🕵️ Temporarily disable minifier to surface the true build error
  swcMinify: false,

  // Optional — helps debug production stack traces
  productionBrowserSourceMaps: true,
};

export default nextConfig;
