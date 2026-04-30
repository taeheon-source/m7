import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '매매내역 정리',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-gray-800 antialiased">{children}</body>
    </html>
  );
}
