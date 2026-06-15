/** @type {import('next').NextConfig} */
const nextConfig = {
  // Baileys uses Node-specific APIs, keep bot logic server-side only
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }
    return config
  },
}

export default nextConfig
