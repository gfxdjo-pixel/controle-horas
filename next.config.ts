import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Só ativa o PWA quando for pro Vercel
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Se você tinha alguma configuração aqui antes, ela continua igual
};

export default withPWA(nextConfig);