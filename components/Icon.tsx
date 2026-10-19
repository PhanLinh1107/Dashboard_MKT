/* 33 icon Lucide nhúng sẵn trong lib/icons.ts. Sprite nạp MỘT lần ở app/layout.tsx; mọi chỗ khác chỉ <use>.
   Không vẽ lại path theo trí nhớ, không dùng emoji. Thiếu icon thì chọn icon có sẵn gần nghĩa nhất. */
import { ICON_SPRITE, type IconName } from '@/lib/icons';

export function IconSprite() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden="true" focusable="false"
         dangerouslySetInnerHTML={{ __html: `<defs>${ICON_SPRITE}</defs>` }} />
  );
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className ? `lu ${className}` : 'lu'} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
