import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pi-agent-core / pi-ai 内部用动态 import(lazy api)，Turbopack 无法静态分析，
  // 标为 external 让其在服务端走 Node 原生模块解析。
  serverExternalPackages: ['@earendil-works/pi-agent-core', '@earendil-works/pi-ai'],
};

export default nextConfig;
