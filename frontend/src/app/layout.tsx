import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketFLASH - Premium E-Ticketing Platform",
  description: "High concurrency war ticket booking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#0b0c10] text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
