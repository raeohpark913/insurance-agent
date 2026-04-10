import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "보험 AI 설계사 — 공정한 보험 추천",
  description: "수수료 편향 없이 공시 데이터 기반으로 나에게 맞는 보험 상품을 추천해드립니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" style={{ height: '100%' }}>
      <body style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </body>
    </html>
  );
}
