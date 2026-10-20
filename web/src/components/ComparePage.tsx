import { useEffect, useState } from 'react';
import { ExternalLink, Scale, Search } from 'lucide-react';
import type { GroupRow, GroupDetail } from '../api';
import { api, fmt, discountPct, STORE_LABELS } from '../api';
import ProductImage from './ProductImage';

function StoreBadge({ store }: { store: string }) {
  const label = STORE_LABELS[store] ?? store;
  return <span className={`store-badge store-${store}`}>{label}</span>;
}

export default function ComparePage() {
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selected, setSelected] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const debounced = query.trim();

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const g = await api.groups(debounced, 20);
        if (!alive) return;
        setGroups(g);
        setError(false);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    }, debounced ? 300 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [debounced]);

  useEffect(() => {
    if (selected && selected.members.length === 0) {
      setSelected(null);
    }
  }, [selected]);

  const openGroup = async (id: number) => {
    try {
      setLoading(true);
      const g = await api.group(id);
      setSelected(g);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const bestSku = selected?.members.reduce<string | null>((acc, m) => {
    if (m.price === null) return acc;
    if (acc === null) return m.sku;
    const current = selected.members.find((x) => x.sku === acc)?.price ?? null;
    return current === null || m.price < current ? m.sku : acc;
  }, null);

  return (
    <div className="container main">
      <div className="page-head">
        <div className="page-title">
          <Scale size={22} />
          <div>
            <div className="logo-title">Comparar precios</div>
            <div className="logo-sub">Mismo producto en varias tiendas</div>
          </div>
        </div>
        <div className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar grupo (ej. lavadora, tv, microondas)…"
          />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>No se pudo cargar la comparación. Revisa que la API esté corriendo.</span>
        </div>
      )}

      {!selected ? (
        <div className="grid group-grid">
          {loading && groups.length === 0
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="card group-card shimmer" />)
            : groups.map((g) => (
                <button key={g.id} className="card group-card" onClick={() => openGroup(g.id)}>
                  <div className="pc-name">{g.name}</div>
                  <div className="group-meta">
                    {g.brand && <span className="pc-brand">{g.brand}</span>}
                    <span className="chip badge">{g.members} tiendas</span>
                  </div>
                </button>
              ))}
          {!loading && groups.length === 0 && (
            <div className="empty-state">
              <p>No hay grupos todavía. Colecta datos de otra tienda (ej. Éxito) y ejecuta el matcher.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="compare-view">
          <button className="btn" onClick={() => setSelected(null)}>
            ← Volver
          </button>
          <div className="compare-grid">
            {selected.members.map((m) => {
              const d = discountPct(m);
              const isBest = m.sku === bestSku;
              return (
                <div key={`${m.store}:${m.sku}`} className={`card compare-card ${isBest ? 'compare-best' : ''}`}>
                  {isBest && <div className="chip badge compare-flag">Mejor precio</div>}
                  <ProductImage src={m.image_url} alt={m.name} className="thumb compare-thumb" noImgClassName="thumb pc-noimg" size={60} />
                  <StoreBadge store={m.store} />
                  <div className="pc-brand">{m.brand}</div>
                  <div className="pc-name" title={m.name}>
                    {m.name}
                  </div>
                  <div className="pc-price-row">
                    <span className="pc-price">{fmt(m.price)}</span>
                    {m.original_price !== null && (
                      <span className="strike">{fmt(m.original_price)}</span>
                    )}
                  </div>
                  {d !== null && d > 0 && <div className="chip badge-off">-{d}%</div>}
                  {m.city && <div className="pc-seller muted">Envío: {m.city}</div>}
                  <a className="btn btn-sm" href={m.url} target="_blank" rel="noreferrer">
                    Ver en {STORE_LABELS[m.store] ?? m.store} <ExternalLink size={13} />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
