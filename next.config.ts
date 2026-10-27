import type { NextConfig } from "next";

// Cấu hình trung lập nền tảng: không dùng tính năng riêng của Vercel/Netlify.
// `standalone` tạo thư mục .next/standalone chạy được bằng `node server.js` trên mọi server.
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@electric-sql/pglite", "exceljs", "pg"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@electric-sql/pglite/dist/**/*"],
  },
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
