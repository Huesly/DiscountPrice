import { useState, useEffect } from 'react';
import type { UrlFilters } from '../hooks/useUrlFilters';
import Icon from './Icons';

interface SidebarFiltersProps {
  filters: UrlFilters;
  storeCounts?: Record<string, number>;
  onChange: (patch: Partial<UrlFilters>) => void;
  onReset: () => void;
  onCollect?: (term: string) => Promise<void>;
  isMobileDrawer?: boolean;
}

const STORE_DEFINITIONS = [
  { code: '', label: 'Todas las tiendas', badge: 'ALL', color: 'bg-slate-800 text-white' },
  { code: 'falabella', label: 'Falabella', badge: 'FAL', color: 'bg-emerald-700 text-white' },
  { code: 'exito', label: 'Éxito', badge: 'EXT', color: 'bg-amber-500 text-slate-900' },
  { code: 'homecenter', label: 'Homecenter', badge: 'HC', color: 'bg-red-600 text-white' },
  { code: 'ikea', label: 'IKEA Cali', badge: 'IKEA', color: 'bg-blue-600 text-yellow-300' },
  { code: 'alkosto', label: 'Alkosto', badge: 'ALK', color: 'bg-blue-700 text-white' },
  { code: 'd1', label: 'Tiendas D1', badge: 'D1', color: 'bg-red-700 text-white' },
  { code: 'ara', label: 'Tiendas Ara', badge: 'ARA', color: 'bg-orange-500 text-white' },
];

const CATEGORY_DEFINITIONS = [
  { id: '', label: 'Todo el Catálogo', icon: 'storefront' },
  { id: 'Tecnología y Celulares', label: 'Tecnología & Celulares', icon: 'technology' },
  { id: 'Electrohogar y Cocina', label: 'Electrohogar & Cocina', icon: 'appliances' },
  { id: 'Muebles y Hogar', label: 'Muebles, Hogar & Lámparas', icon: 'furniture' },
  { id: 'Comidas y Supermercado', label: 'Supermercado & Despensa', icon: 'groceries' },
];

const DISCOUNT_SEGMENTS = [
  { value: undefined, label: 'Todos' },
  { value: 15, label: '15%+' },
  { value: 25, label: '25%+' },
  { value: 40, label: '40%+' },
  { value: 50, label: '50%+' },
];

export default function SidebarFilters({
  filters,
  storeCounts = {},
  onChange,
  onReset,
  onCollect,
  isMobileDrawer = false,
}: SidebarFiltersProps) {
  // Local state for search input
  const [queryInput, setQueryInput] = useState(filters.query);
  const [minInput, setMinInput] = useState(
    filters.minPrice !== undefined ? String(filters.minPrice) : ''
  );
  const [maxInput, setMaxInput] = useState(
    filters.maxPrice !== undefined ? String(filters.maxPrice) : ''
  );
  const [collecting, setCollecting] = useState(false);
  const [collectSuccess, setCollectSuccess] = useState<string | null>(null);

  useEffect(() => {
    setQueryInput(filters.query);
  }, [filters.query]);

  useEffect(() => {
    setMinInput(filters.minPrice !== undefined ? String(filters.minPrice) : '');
  }, [filters.minPrice]);

  useEffect(() => {
    setMaxInput(filters.maxPrice !== undefined ? String(filters.maxPrice) : '');
  }, [filters.maxPrice]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onChange({ query: queryInput.trim(), page: 1 });
  };

  const handleApplyPriceRange = (e: React.FormEvent) => {
    e.preventDefault();
    const min = minInput.trim() ? Number(minInput.replace(/\D/g, '')) : undefined;
    const max = maxInput.trim() ? Number(maxInput.replace(/\D/g, '')) : undefined;
    onChange({
      minPrice: Number.isFinite(min) && (min ?? 0) > 0 ? min : undefined,
      maxPrice: Number.isFinite(max) && (max ?? 0) > 0 ? max : undefined,
      page: 1,
    });
  };

  const handleLiveScrape = async () => {
    const q = queryInput.trim();
    if (!q || !onCollect || collecting) return;
    setCollecting(true);
    setCollectSuccess(null);
    try {
      await onCollect(q);
      setCollectSuccess(`Sincronizado: catálogo actualizado para "${q}".`);
      setTimeout(() => setCollectSuccess(null), 5000);
    } catch {
      setCollectSuccess(`Comercios consultados.`);
      setTimeout(() => setCollectSuccess(null), 4000);
    } finally {
      setCollecting(false);
    }
  };

  const totalFilteredCount = Object.values(storeCounts).reduce((a, b) => a + b, 0);

  return (
    <aside className={`df-sidebar-panel ${isMobileDrawer ? 'is-drawer' : ''}`} aria-label="Filtros de búsqueda">
      {/* 1. Header with Reset Button */}
      <div className="df-sidebar-header">
        <div className="df-sidebar-title-wrap">
          <Icon name="tune" size={18} className="text-slate-700" />
          <h2 className="df-sidebar-title">Filtros Inteligentes</h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="df-sidebar-reset-btn"
          title="Restablecer todos los filtros"
        >
          Limpiar
        </button>
      </div>

      {/* 2. Search Input */}
      <div className="df-filter-section">
        <label htmlFor="df-search-input" className="df-filter-label">
          Búsqueda de producto o término
        </label>
        <form onSubmit={handleSearchSubmit} className="df-search-form">
          <div className="df-search-box">
            <Icon name="search" size={17} className="df-search-icon" />
            <input
              id="df-search-input"
              type="search"
              placeholder="Ej. MacBook, iPhone, iPad, Nevera..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="df-search-field"
            />
            {queryInput && (
              <button
                type="button"
                onClick={() => {
                  setQueryInput('');
                  onChange({ query: '', page: 1 });
                }}
                className="df-search-clear"
                title="Limpiar término"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
          <div className="df-search-actions">
            <button type="submit" className="df-btn-search">
              Filtrar
            </button>
            {onCollect && queryInput.trim().length >= 3 && (
              <button
                type="button"
                onClick={handleLiveScrape}
                disabled={collecting}
                className="df-btn-scrape"
                title="Buscar productos nuevos en vivo en las páginas de las tiendas"
              >
                <Icon name="refresh" size={14} className={collecting ? 'animate-spin' : ''} />
                <span>{collecting ? 'Consultando...' : 'Buscar en vivo'}</span>
              </button>
            )}
          </div>
          {collectSuccess && (
            <div className="df-scrape-feedback" role="status">
              <Icon name="check" size={13} />
              <span>{collectSuccess}</span>
            </div>
          )}

          {/* Sugerencias Rápidas: Apple y Populares */}
          <div className="df-quick-search-tags" role="group" aria-label="Búsquedas sugeridas">
            <span className="df-quick-search-label">Sugeridos:</span>
            {[
              { label: 'MacBook', query: 'macbook', icon: 'laptop' },
              { label: 'iPhone', query: 'iphone', icon: 'smartphone' },
              { label: 'iPad', query: 'ipad', icon: 'tablet' },
              { label: 'Airfryer', query: 'airfryer', icon: 'appliances' },
              { label: 'Televisor', query: 'televisor', icon: 'technology' },
            ].map((tag) => {
              const active = queryInput.trim().toLowerCase() === tag.query;
              return (
                <button
                  key={tag.query}
                  type="button"
                  className={`df-quick-tag-btn ${active ? 'active' : ''}`}
                  onClick={() => {
                    const newQ = active ? '' : tag.query;
                    setQueryInput(newQ);
                    onChange({ query: newQ, page: 1 });
                  }}
                  title={`Buscar ${tag.label}`}
                >
                  <Icon name={tag.icon} size={12} />
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </form>
      </div>

      {/* 3. Categories Accordion / Selection */}
      <div className="df-filter-section">
        <label className="df-filter-label">Categorías</label>
        <nav className="df-categories-list" aria-label="Filtrar por categoría">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const isSelected = filters.category === cat.id;
            return (
              <button
                key={cat.id || 'all'}
                type="button"
                className={`df-category-row ${isSelected ? 'active' : ''}`}
                onClick={() => onChange({ category: cat.id, page: 1 })}
              >
                <div className="df-category-left">
                  <span className="df-category-icon-box">
                    <Icon name={cat.icon} size={16} />
                  </span>
                  <span className="df-category-name">{cat.label}</span>
                </div>
                {isSelected && <Icon name="check" size={14} className="text-emerald-600" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 4. Store Selector with Live Counts */}
      <div className="df-filter-section">
        <div className="df-section-title-row">
          <label className="df-filter-label">Comercios Nacionales</label>
          <span className="df-label-muted font-mono text-xs">7 tiendas</span>
        </div>
        <div className="df-stores-list" role="group" aria-label="Filtrar por comercio">
          {STORE_DEFINITIONS.map((st) => {
            const isSelected = filters.store === st.code;
            const count =
              st.code === ''
                ? totalFilteredCount
                : (storeCounts[st.code] ?? 0);

            return (
              <button
                key={st.code || 'all'}
                type="button"
                className={`df-store-row ${isSelected ? 'active' : ''}`}
                onClick={() => onChange({ store: st.code, page: 1 })}
              >
                <div className="df-store-left">
                  <span className={`df-store-chip-tag ${st.color}`}>
                    {st.badge}
                  </span>
                  <span className="df-store-title">{st.label}</span>
                </div>
                <div className="df-store-right">
                  {count > 0 && (
                    <span className="df-store-count font-mono">
                      {count.toLocaleString('es-CO')}
                    </span>
                  )}
                  <span className={`df-store-radio ${isSelected ? 'checked' : ''}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Discount Percentage Segmented Buttons */}
      <div className="df-filter-section">
        <label className="df-filter-label">Porcentaje de Descuento</label>
        <div className="df-segmented-group" role="radiogroup" aria-label="Descuento mínimo">
          {DISCOUNT_SEGMENTS.map((seg) => {
            const isSelected = filters.minDiscount === seg.value;
            return (
              <button
                key={seg.label}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`df-segmented-btn ${isSelected ? 'active' : ''}`}
                onClick={() => onChange({ minDiscount: seg.value, page: 1 })}
              >
                {seg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Price Range Inputs (COP) */}
      <div className="df-filter-section">
        <label className="df-filter-label">Rango de Precio (COP)</label>
        <form onSubmit={handleApplyPriceRange} className="df-price-form">
          <div className="df-price-inputs-grid">
            <div className="df-price-field-wrap">
              <span className="df-currency-prefix">$</span>
              <input
                type="number"
                min="0"
                step="5000"
                placeholder="Mínimo"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                className="df-price-field"
                aria-label="Precio mínimo"
              />
            </div>
            <span className="df-price-separator">—</span>
            <div className="df-price-field-wrap">
              <span className="df-currency-prefix">$</span>
              <input
                type="number"
                min="0"
                step="10000"
                placeholder="Máximo"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                className="df-price-field"
                aria-label="Precio máximo"
              />
            </div>
          </div>
          <button type="submit" className="df-btn-apply-price">
            Aplicar rango
          </button>
        </form>
      </div>

      {/* 7. Special Smart Flags: Energy Efficiency RETIQ A */}
      <div className="df-filter-section df-flags-section">
        <label className="df-flag-toggle">
          <input
            type="checkbox"
            checked={filters.energyA}
            onChange={(e) => onChange({ energyA: e.target.checked, page: 1 })}
            className="df-checkbox"
          />
          <div className="df-flag-text">
            <span className="df-flag-title">
              <Icon name="bolt" size={14} className="text-amber-500 inline mr-1" />
              Eficiencia Energética Tipo A
            </span>
            <span className="df-flag-sub">
              Equipos de bajo consumo eléctrico (RETIQ Colombia)
            </span>
          </div>
        </label>
      </div>
    </aside>
  );
}
