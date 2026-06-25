import type {Metadata} from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Portal de Permutas - 2ª Companhia / 10º BPM',
  description: 'Formulário de Permuta de Serviço Oficial - 2ª Companhia / 10º Batalhão PMMA',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning className="bg-[#0f172a] min-h-screen text-slate-200 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
