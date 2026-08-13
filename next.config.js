/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Allows verification builds to use a separate output while the local preview is running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  compiler: {
    styledComponents: true,
  },
  transpilePackages: [
    "antd",
    "@ant-design/icons",
    "rc-util",
    "rc-pagination",
    "rc-picker",
  ],
};

module.exports = nextConfig;
