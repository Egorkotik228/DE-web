import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DE Academy — С нуля до Data Engineer',
  description: 'Интерактивная образовательная платформа для будущих Data Engineer',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark h-full antialiased">
      <body className="min-h-full bg-[#0D1117] text-[#E6EDF3] font-sans flex flex-col selection:bg-emerald-900 selection:text-emerald-100">
        {children}
      </body>
    </html>
  );
}
