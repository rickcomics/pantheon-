import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Файлы памяти духов читаются через fs — включаем их в серверный бандл
  outputFileTracingIncludes: {
    "/api/chat": ["./chats/**/*"],
  },
};

export default nextConfig;
