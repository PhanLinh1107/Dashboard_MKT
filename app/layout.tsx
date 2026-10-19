import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IconSprite } from '@/components/Icon';
import { CFG } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = { title: CFG.app.name, description: CFG.app.tagline };

/* Đọc lựa chọn sáng/tối đã lưu TRƯỚC khi vẽ, để không nháy trắng khi người dùng đang ở chế độ tối. */
const THEME = "try{if(localStorage.getItem('theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
        {/* Inter qua <link>, không qua next/font: build không cần mạng, bộ chữ có đủ dấu tiếng Việt. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
