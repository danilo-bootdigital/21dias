import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Fonte de display da marca (grotesca atlética). Self-hosted pelo next/font —
// baixada no build, servida pela própria origem, sem CDN em runtime.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-display-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Código 21",
  description: "21 dias para provar a si mesmo que você não é a pessoa que desiste.",
};

// Mobile-first: a janela cobre a área segura (notch / barra do iOS) e a barra
// do navegador acompanha o fundo da marca.
export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
