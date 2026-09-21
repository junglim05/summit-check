import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "정상석 인증 — 서울·경기 산 정복",
  description: "GPS 기반으로 정상에서만 인증되는 정상석 사진 컬렉션. 서울·경기 28개 산을 정복하세요.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2f5d3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh flex flex-col">
        <Nav />
        <main className="flex-1 w-full max-w-md mx-auto px-4 pb-24 pt-4">{children}</main>
      </body>
    </html>
  );
}
