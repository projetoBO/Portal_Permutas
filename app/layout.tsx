import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Permutas",
  description: "Formulário Oficial de Permuta de Escala — 2ª Companhia / 10º Batalhão PMMA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
