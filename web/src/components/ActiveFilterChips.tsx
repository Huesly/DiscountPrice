import type { UrlFilters } from '../hooks/useUrlFilters';
import { STORE_LABELS } from '../api';
import Icon from './Icons';

interface ActiveFilterChipsProps {
  filters: UrlFilters;
  total: number;
  storeCount: number;
  loading: boolean;
  onChange: (patch: Partial<UrlFilters>) => void;
  onReset: () => void;
  onOpenMobileFilters: () => void;
}

export default function ActiveFilterChips({
  filters,
  total,
  storeCount,
  loading,
  onChange,
  onReset,
  onOpenMobileFilters,
}: ActiveFilterChipsProps) {
  // Compute active chips
  const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

  if (filters.query.trim()) {
    chips.push({
      id: 'query',
      label: `"${filters.query.trim()}"`,
      onRemove: () => onChange({ query: '', page: 1 }),
    });
  }

  if (filters.category) {
    chips.push({
      id: 'category',
      label: filters.category,
      onRemove: () => onChange({ category: '', page: 1 }),
    });
  }

  if (filters.store) {
    chips.push({
      id: 'store',
      label: STORE_LABELS[filters.store] ?? filters.store,
      onRemove: () => onChange({ store: '', page: 1 }),
    });
  }

  if (filters.minDiscount !== undefined) {
    chips.push({
      id: 'discount',
      label: `Descuento > ${filters.minDiscount}%`,
      onRemove: () => onChange({ minDiscount: undefined, page: 1 }),
    });
  }

  if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
    chips.push({
      id: 'price-range',
      label: `$${filters.minPrice.toLocaleString('es-CO')} - $${filters.maxPrice.toLocaleString('es-CO')}`,
      onRemove: () => onChange({ minPrice: undefined, maxPrice: undefined, page: 1 }),
    });
  } else if (filters.minPrice !== undefined) {
    chips.push({
      id: 'min-price',
      label: `Min $${filters.minPrice.toLocaleString('es-CO')}`,
      onRemove: () => onChange({ minPrice: undefined, page: 1 }),
    });
  } else if (filters.maxPrice !== undefined) {
    chips.push({
      id: 'max-price',
      label: `Menos de $${filters.maxPrice.toLocaleString('es-CO')}`,
      onRemove: () => onChange({ maxPrice: undefined, page: 1 }),
    });
  }

  if (filters.dealOnly) {
    chips.push({
      id: 'deals',
      label: 'Ofertas Verificadas',
      onRemove: () => onChange({ dealOnly: false, page: 1 }),
    });
  }

  if (filters.energyA) {
    chips.push({
      id: 'energy',
      label: 'Eficiencia A (RETIQ)',
      onRemove: () => onChange({ energyA: false, page: 1 }),
    });
  }

  if (filters.favOnly) {
    chips.push({
      id: 'favs',
      label: 'Guardados',
      onRemove: () => onChange({ favOnly: false, page: 1 }),
    });
  }

  const activeCount = chips.length;

  return (
    <div className="df-active-toolbar">
      {/* Top Header: Counter + Mobile Filter Button + Sort Dropdown */}
      <div className="df-toolbar-top">
        <div className="df-counter-wrap">
          <h1 className="df-counter-heading">
            {loading ? (
              <span className="df-counter-loading">Consultando comercios...</span>
            ) : (
              <>
                Mostrando <strong className="font-mono text-slate-900">{total.toLocaleString('es-CO')}</strong> ofertas verificadas
                {storeCount > 0 && (
                  <span className="df-counter-store-text">
                    {' '}en <span className="font-mono font-medium">{storeCount}</span> tiendas nacionales
                  </span>
                )}
              </>
            )}
          </h1>
        </div>

        <div className="df-toolbar-actions">
          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            className="df-mobile-filter-trigger lg:hidden"
            onClick={onOpenMobileFilters}
            aria-label="Abrir panel de filtros"
          >
            <Icon name="tune" size={17} />
            <span>Filtros</span>
            {activeCount > 0 && (
              <span className="df-filter-count-badge font-mono">{activeCount}</span>
            )}
          </button>

          {/* Sort Selector */}
          <div className="df-sort-dropdown-wrap">
            <label htmlFor="df-sort-select" className="sr-only">
              Ordenar resultados
            </label>
            <div className="df-sort-select-box">
              <Icon name="swap_vert" size={16} className="df-sort-icon" />
              <select
                id="df-sort-select"
                value={filters.sort}
                onChange={(e) => onChange({ sort: e.target.value, page: 1 })}
                className="df-sort-select"
              >
                <option value="default">Recomendados / Relevancia</option>
                <option value="discount">Mayor descuento (%)</option>
                <option value="price_asc">Menor precio ($)</option>
                <option value="price_desc">Mayor precio ($)</option>
                <option value="newest">Recién publicadas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Active Chips Row */}
      {chips.length > 0 && (
        <div className="df-chips-row" role="region" aria-label="Filtros activos">
          <span className="df-chips-label">Filtros activos:</span>
          <div className="df-chips-list">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="df-active-chip"
                onClick={chip.onRemove}
                title={`Eliminar filtro ${chip.label}`}
              >
                <span>{chip.label}</span>
                <Icon name="close" size={13} className="df-chip-x" />
              </button>
            ))}
            <button
              type="button"
              className="df-clear-all-btn"
              onClick={onReset}
            >
              Limpiar todos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
