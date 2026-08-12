import { useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { HistoryPoint } from '../api';
import { fmt, compact } from '../api';

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'Todo', days: 0 },
];

interface Props {
  history: HistoryPoint[];
}

export default function PriceChart({ history }: Props) {
  const [range, setRange] = useState(7);

  const rows = history.slice().sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  const cutoff = range > 0 ? Date.now() - range * 86400000 : 0;
  const data = rows
    .filter((h) => !cutoff || new Date(h.captured_at).getTime() >= cutoff)
    .map((h) => ({ t: h.captured_at.slice(5, 16), price: h.price, original: h.original_price ?? undefined }));

  if (data.length < 2) {
    return <p className="muted" style={{ padding: 20, textAlign: 'center' }}>Pocos datos aún para graficar.</p>;
  }

  const prices = data.map((d) => d.price);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = Math.min(...prices);

  return (
    <div>
      <div className="chart-range">
        {RANGES.map((r) => (
          <button
            key={r.label}
            className={`btn chart-range-btn ${range === r.days ? 'active' : ''}`}
            onClick={() => setRange(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#7b8794' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: '#7b8794' }}
            tickLine={false}
            width={54}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => compact(v)}
          />
          <Tooltip
            formatter={(v) => fmt(typeof v === 'number' ? v : Number(v))}
            labelStyle={{ color: '#1f2933', fontSize: 12 }}
            contentStyle={{ borderRadius: 9, border: '1px solid #e4e7eb', fontSize: 12 }}
          />
          <ReferenceLine y={avg} stroke="#b45309" strokeDasharray="4 4" />
          <ReferenceLine y={min} stroke="#15803d" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="price" stroke="#0a66c2" strokeWidth={2.2} dot={false} />
          <Line type="monotone" dataKey="original" stroke="#cbd2d9" strokeWidth={1.4} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span><i className="dot" style={{ background: '#0a66c2' }} /> Precio</span>
        <span><i className="dot" style={{ background: '#cbd2d9' }} /> Tachado</span>
        <span><i className="dot" style={{ background: '#b45309' }} /> Promedio</span>
        <span><i className="dot" style={{ background: '#15803d' }} /> Mínimo</span>
      </div>
    </div>
  );
}