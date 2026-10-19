'use client';
/* Thanh chào 52px: lời chào + bối cảnh theo giờ Việt Nam (UTC+7) bên trái, chip bộ lọc đang áp bên phải. */
import { useEffect, useState } from 'react';
import { CFG } from '@/lib/config';
import { clockVN, greetVN, nowVN, todayVN } from '@/lib/format';
import { Icon } from './Icon';

export type Chip = { key: string; label: string; remove: () => void };

export function GreetBar({ context, chips, onClear }: { context: string; chips: Chip[]; onClear: () => void }) {
  // Giờ chỉ tính ở trình duyệt (giờ server khác giờ máy ⇒ lệch khi hydrate). Tự đổi lời chào khi qua mốc giờ.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(nowVN());
    const id = setInterval(() => setNow(nowVN()), 30_000);
    return () => clearInterval(id);
  }, []);
  const first = CFG.app.user?.first ?? 'bạn';
  return (
    <div id="greet">
      <div style={{ minWidth: 0 }}>
        <div className="ghi">{now ? `${greetVN(now)}, ${first}!` : ' '}</div>
        <div className="gday">{context}{now ? ` · ${todayVN(now)}, ${clockVN(now)} giờ Việt Nam` : ''}</div>
      </div>
      <div className="chips">
        {chips.map((c) => (
          <span className="chip" key={c.key}>
            {c.label}
            <button onClick={c.remove} aria-label={`Bỏ ${c.label}`}><Icon name="x" className="lu-xs" /></button>
          </span>
        ))}
        {chips.length > 1 && <button className="chip" onClick={onClear}>Xoá tất cả</button>}
      </div>
    </div>
  );
}
