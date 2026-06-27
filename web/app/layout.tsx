import type { Metadata } from "next";
import "../styles/base.css";
import "../styles/chat.css";
import "../styles/pages.css";

export const metadata: Metadata = {
  title: "Replica · 数字分身工作台",
  description: "数字分身工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
