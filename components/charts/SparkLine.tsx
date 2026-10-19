/* Sparkline có ĐƯỜNG CHUẨN gạch ngang: nhờ nó, sparkline không chỉ cho thấy hình dáng
   mà còn cho biết đang trên hay dưới mốc. Mốc = ngưỡng nghiệp vụ nếu có, còn lại là trung bình kỳ. */
import { useId } from 'react';

export function SparkLine({ w, h, values, color, base }: { w: number; h: number; values: number[]; color: string; base: number | null }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!values.length) return <svg width={w} height={h} />;
  const all = base == null ? values : values.concat([base]);
  const mx = Math.max(...all), mn = Math.min(...all), sp = mx - mn || 1, pad = 4;
  const x = (i: number) => (i / (values.length - 1 || 1)) * w;
  const y = (v: number) => h - pad - ((v - mn) / sp) * (h - pad * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  return (
    <svg width={w} height={h}>
      <defs>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: color, stopOpacity: 0.2 }} />
          <stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={`url(#s${uid})`} />
      {base != null && (
        <line x1={0} y1={y(base).toFixed(1)} x2={w} y2={y(base).toFixed(1)} style={{ stroke: 'var(--label3)' }}
              strokeWidth={1} strokeDasharray="3 3" />
      )}
      <path d={d} fill="none" style={{ stroke: color }} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last).toFixed(1)} cy={y(values[last]).toFixed(1)} r={2.6} style={{ fill: color }} />
    </svg>
  );
}
