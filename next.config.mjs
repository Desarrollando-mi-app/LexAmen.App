/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sharp", "pdf-parse", "pdfkit"],
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
