import { Package, Flame, Database, Tags } from 'lucide-react';
import type { Stats } from '../api';

interface Props {
  stats: Stats | null;
  total: number | null;
}

function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`card kpi ${accent ? 'kpi-accent' : ''}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function StatsBar({ stats, total }: Props) {
  const fmt = (n: number) => n.toLocaleString('es-CO');
  return (
    <div className="stats-bar">
      <Kpi
        icon={<Package size={18} />}
        label="Productos"
        value={stats ? fmt(stats.products) : total !== null ? fmt(total) : '—'}
      />
      <Kpi
        icon={<Flame size={18} />}
        label="Ofertas activas"
        value={stats ? fmt(stats.active_deals) : '—'}
        accent
      />
      <Kpi
        icon={<Database size={18} />}
        label="Registros de precio"
        value={stats ? fmt(stats.price_records) : '—'}
      />
      <Kpi
        icon={<Tags size={18} />}
        label="Categorías"
        value={stats ? fmt(stats.categories) : '—'}
      />
    </div>
  );
}