/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  basePath: '/project2', // 👈 ให้ Next.js รู้ว่าตัวเองสถิตอยู่ที่ /project2
  
  async redirects() {
    return [
      {
        source: '/',
        destination: '/Motorcontrol', // 👈 เด้งไปที่ /Motorcontrol (M ตัวใหญ่ ตรงตามชื่อโฟลเดอร์)
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;