import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from './providers';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Controle de Horas",
  description: "Sistema de apontamento",
  manifest: "/manifest.json",
  // ESSA É A PARTE QUE ESTAVA FALTANDO PARA O IOS:
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Controle de Horas",
    // startUpImage: ["/icon.png"], 
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* O Next.js já adiciona o link do manifest automaticamente devido à propriedade "manifest" lá em cima. */}
        {/* Você só precisa garantir que o apple-touch-icon esteja apontando para o seu ícone: */}
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}