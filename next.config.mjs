/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'api.multiavatar.com' },
      { protocol: 'https', hostname: 'robohash.org' },
      { protocol: 'https', hostname: 'api.adorable.io' },
      { protocol: 'https', hostname: 'api.hello-avatar.io' },
    ],
    unoptimized: true,
  },
  webpack: (config) => {
    config.externals.push('canvas')
    return config
  },
  reactStrictMode: true,
  trailingSlash: true,
}

export default nextConfig
