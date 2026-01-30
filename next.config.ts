import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken', 'otplib', 'qrcode'],
};

export default nextConfig;
