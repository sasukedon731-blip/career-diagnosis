import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "キャリア診断AI",
  description: "夢に近づくキャリアルートを診断します",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}