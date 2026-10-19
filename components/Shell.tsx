'use client';
/* #viewport (mặt bàn --page) bọc #stage (tấm 1600×900 bo góc, nổi trên mặt bàn).
   Hàm fit gán transform:scale() vào style inline của #stage. Lề quanh shell do `scale:.94` trên #viewport
   trong globals.css sinh ra — thuộc tính rời, trình duyệt NHÂN với transform này thay vì đè lên. */
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { CV } from '@/lib/tokens';

export function Shell({ id = 'stage', className, children }: {
  id?: 'stage' | 'login';
  className?: string;
  children: ReactNode;
}) {
  const [s, setS] = useState<number | null>(null);

  useLayoutEffect(() => {
    const fit = () => setS(Math.min(innerWidth / CV.w, innerHeight / CV.h)); // không chặn trên 1: màn lớn thì phóng cho đầy
    fit();
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, []);

  return (
    <div id="viewport">
      <div id={id} className={className || undefined}
           style={{ transform: `scale(${s ?? 1})`, visibility: s === null ? 'hidden' : undefined }}>
        {children}
      </div>
    </div>
  );
}
