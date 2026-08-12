import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X, Flame, Heart, Plus } from 'lucide-react';
import type { SortKey } from '../api';
import { SORT_LABELS } from '../api';
import type { UrlFilters } from '../hooks/useUrlFilters';

interface Props {
  filters: UrlFilters;
  brands: string[];
  onChange: (patch: Partial<UrlFilters>) => void;
  onReset: () => void;
  favCount: number;
  onCollect: (term: string) => Promise<void>;
}

export default function FilterBar({ filters, brands, onChange, onReset, favCount, onCollect }: Props) {
  const [open, setOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectMsg, setCollectMsg] = useState<string | null>(null);

  const term = filters.query.trim();

  const handleCollect = async () => {
    if (!term || collecting) return;
    setCollecting(true);
    setCollectMsg(null);
    try {
      await onCollect(term);
      setCollectMsg(`Termino "${term}" colectado`);
    } catch {
      setCollectMsg(`Error al colectar "${term}"`);
    } finally {
      setCollecting(false);
    }
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.query.trim()) n++;
    if (filters.brands.length) n += filters.brands.length;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) n++;
    if (filters.dealOnly) n++;
    if (filters.favOnly) n++;
    if (filters.sort !== 'default') n++;
    return n;
  }, [filters]);

  return (
    <div className="filterbar">
      <div className="search-wrap">
        <Search size={16} className="search-icon" />
        <input
          className="search-input"
          placeholder="Buscar producto, marca o SKU…"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value, page: 1 })}
        />
      </div>

      {collectMsg && <span className="collect-msg">{collectMsg}</span>}

      <button
        className="btn"
        onClick={handleCollect}
        disabled={!term || collecting}
        title="Colectar productos nuevos en Falabella con este término"
      >
        <Plus size={15} /> {collecting ? 'Colectando…' : 'Buscar en Falabella'}
      </button>

      <button
        className={`btn ${filters.dealOnly ? 'btn-primary' : ''}`}
        onClick={() => onChange({ dealOnly: !filters.dealOnly, page: 1 })}
      >
        <Flame size={15} /> Ofertas
      </button>

      <button
        className={`btn ${filters.favOnly ? 'btn-danger' : ''}`}
        onClick={() => onChange({ favOnly: !filters.favOnly, page: 1 })}
        disabled={favCount === 0 && !filters.favOnly}
        title={favCount === 0 ? 'Aún no hay favoritos' : 'Ver solo favoritos'}
      >
        <Heart size={15} fill={filters.favOnly ? 'currentColor' : 'none'} />
        {favCount > 0 ? `Favoritos (${favCount})` : 'Favoritos'}
      </button>

      <button className="btn" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={15} /> Filtros
        {activeCount > 0 && <span className="chip badge-deal count-pill">{activeCount}</span>}
      </button>

      {open && (
        <div className="filter-panel">
          <div className="fp-group">
            <label>Marca</label>
            <select
              value={filters.brands[0] ?? ''}
              onChange={(e) =>
                onChange({ brands: e.target.value ? [e.target.value] : [], page: 1 })
              }
            >
              <option value="">Todas</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="fp-group">
            <label>Precio mín. ($)</label>
            <input
              type="number"
              min="0"
              placeholder="Sin mín"
              value={filters.minPrice ?? ''}
              onChange={(e) =>
                onChange({ minPrice: e.target.value !== '' ? Number(e.target.value) : undefined, page: 1 })
              }
            />
          </div>

          <div className="fp-group">
            <label>Precio máx. ($)</label>
            <input
              type="number"
              min="0"
              placeholder="Sin máx"
              value={filters.maxPrice ?? ''}
              onChange={(e) =>
                onChange({ maxPrice: e.target.value !== '' ? Number(e.target.value) : undefined, page: 1 })
              }
            />
          </div>

          <div className="fp-group">
            <label>Ordenar por</label>
            <select
              value={filters.sort}
              onChange={(e) => onChange({ sort: e.target.value as SortKey, page: 1 })}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <button className="btn fp-reset" onClick={onReset}>
            <X size={14} /> Limpiar
          </button>
        </div>
      )}
    </div>
  );
}