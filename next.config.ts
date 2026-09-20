import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    // Config import posts the .xlsx plus a batch of .md templates through a
    // server action; the 1 MB default is not enough. Vercel caps requests at
    // 4.5 MB, so raising it further would not help.
    serverActions: { bodySizeLimit: '4mb' },
  },
}

export default nextConfig
