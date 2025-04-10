/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if your project has ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if your project has type errors
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'platform-lookaside.fbsbx.com',
      'picsum.photos',
      'images.unsplash.com',
      'plus.unsplash.com',
      'api.dicebear.com',
      'ui-avatars.com',
      'api.multiavatar.com',
      'robohash.org',
      'api.adorable.io',
      'api.hello-avatar.io'
    ],
    unoptimized: true,
  },
  webpack: (config) => {
    config.externals.push('canvas')
    return config
  },
  // Configure for Netlify deployment
  output: 'export',
  // Enable static optimization
  reactStrictMode: true,
  swcMinify: true,
  // Configure dynamic routes for static export
  trailingSlash: true,
  exportPathMap: async function () {
    return {
      '/': { page: '/' },
      '/login': { page: '/login' },
      '/feed': { page: '/feed' },
      '/profile/[userId]': { page: '/profile/[userId]' },
      // Add a fallback profile page
      '/profile': { page: '/profile/[userId]' },
      // Add other static routes here
      // Dynamic routes will be handled client-side
    }
  }
}

export default nextConfig
