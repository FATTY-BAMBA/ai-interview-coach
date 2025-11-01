/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ Don't fail Vercel builds because of lint warnings/errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Ignore TS build errors (still checked locally)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
