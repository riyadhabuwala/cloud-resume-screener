/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose permissive CORS headers from Next.js routes/assets when needed.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
