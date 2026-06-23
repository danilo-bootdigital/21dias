/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fixa a raiz do workspace neste projeto (há outro lockfile em ~/).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
