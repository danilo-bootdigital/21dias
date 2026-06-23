import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Código 21",
  description: "21 dias para provar a si mesmo que você não é a pessoa que desiste.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
