import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "하이피크 — 전국 100대 명산 정상석 기록",
  description: "GPS 로 정상에서만 인증되는 정상석 컬렉션. 전국 100대 명산을 하이피크에서 기록하세요.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#101010",
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
