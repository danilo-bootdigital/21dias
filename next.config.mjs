/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fixa a raiz do workspace neste projeto (há outro lockfile em ~/).
  outputFileTracingRoot: import.meta.dirname,
  images: {
    // Avatares servidos pelo Supabase Storage (bucket público `avatars`).
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/**" }],
  },
};

export default nextConfig;
