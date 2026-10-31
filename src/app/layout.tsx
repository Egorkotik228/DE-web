import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DE Academy — С нуля до Data Engineer",
  description: "Интерактивная образовательная платформа для будущих Data Engineer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#0D1117] text-[#E6EDF3] font-sans flex flex-col selection:bg-emerald-900 selection:text-emerald-100">
        {children}
      </body>
    </html>
  );
}
