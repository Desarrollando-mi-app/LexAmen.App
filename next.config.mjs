/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14 usa experimental.serverComponentsExternalPackages (renombrado en Next 15).
  experimental: {
    serverComponentsExternalPackages: ["sharp", "pdf-parse", "pdfkit"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
