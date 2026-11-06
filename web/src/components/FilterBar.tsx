import { useEffect, useRef, useState } from 'react';
import type { UrlFilters } from '../hooks/useUrlFilters';
import { animateTap, runSmoothTransition, useAnimatedNumber } from '../utils/smoothAnimations';
import GIcon from './GIcon';

const STORES = [
  { value: '', label: 'Todas las tiendas', code: 'all' },
  { value: 'ikea', label: 'IKEA Cali', code: 'ikea' },
  { value: 'd1', label: 'Tiendas D1', code: 'd1' },
  { value: 'ara', label: 'Tiendas Ara', code: 'ara' },
  { value: 'exito', label: 'Éxito', code: 'exito' },
  { value: 'alkosto', label: 'Alkosto', code: 'alkosto' },
  { value: 'falabella', label: 'Falabella', code: 'falabella' },
  { value: 'homecenter', label: 'Homecenter', code: 'homecenter' },
];

interface Props {
  filters: UrlFilters;
  total: number;
  onChange: (patch: Partial<UrlFilters>) => void;
  onReset: () => void;
  favCount: number;
  onCollect: (term: string) => Promise<void>;
}

export default function FilterBar({
  filters,
  total,
  onChange,
  favCount,
  onCollect,
}: Props) {
  const [collecting, setCollecting] = useState(false);
  const [collectMsg, setCollectMsg] = useState<string | null>(null);
  const animatedTotal = useAnimatedNumber(total, 300);

  const term = filters.query.trim();
  const isFridgeSearch = /\b(nevera|neveras|nevecon|nevecón|minibar)\b/i.test(term);

  const handleCollect = async () => {
    if (!term || collecting) return;
    setCollecting(true);
    setCollectMsg(null);
    try {
      await onCollect(term);
      setCollectMsg(`¡Listo! Se actualizaron precios en vivo para "${term}".`);
      setTimeout(() => setCollectMsg(null), 5000);
    } catch {
      setCollectMsg(`No se pudo consultar "${term}" en este momento.`);
    } finally {
      setCollecting(false);
    }
  };

  const [searchInput, setSearchInput] = useState(filters.query);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchInput(filters.query);
  }, [filters.query]);

  const handleInputChange = (val: string) => {
    setSearchInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onChange({ query: val, page: 1 });
    }, 350);
  };

  const handleClear = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSearchInput('');
    runSmoothTransition(() => onChange({ query: '', energyA: false, page: 1 }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      onChange({ query: searchInput, page: 1 });
      handleCollect();
    }
  };

  const isLowestPrice = filters.sort === 'default' || filters.sort === 'price_asc';
  const isDiscountSort = filters.sort === 'discount';

  return (
    <div className="simple-controls-box" aria-label="Buscador general y filtros">
      {/* 1. Buscador General Prominente */}
      <div className="simple-search-row">
        <div className="simple-search-input-wrap">
          <GIcon name="search" size={20} className="simple-search-icon" />
          <input
            className="simple-search-input"
            placeholder="Buscar por nombre, modelo o marca (ej. FADO, nevera, arroz, escritorio, iPhone)…"
            value={searchInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchInput && (
            <button
              type="button"
              className="simple-clear-btn"
              onClick={handleClear}
              aria-label="Borrar texto"
            >
              <GIcon name="close" size={18} />
            </button>
          )}
        </div>

        {/* Botón de búsqueda en vivo en tiendas si hay texto */}
        {term && (
          <button
            type="button"
            className="btn-collect-live"
            onClick={(e) => {
              animateTap(e.currentTarget);
              handleCollect();
            }}
            disabled={collecting}
            title="Consultar precios en tiempo real en IKEA, Éxito, Falabella y más"
          >
            <GIcon
              name={collecting ? 'sync' : 'travel_explore'}
              size={18}
              className={`pc-btn-icon ${collecting ? 'spin' : ''}`}
            />
            <span>{collecting ? 'Consultando tiendas…' : 'Buscar en Tiendas en Vivo'}</span>
          </button>
        )}
      </div>

      {/* Banner de Neveras RETIQ si busca refrigeración */}
      {isFridgeSearch && (
        <div className="fridge-energy-banner">
          <div className="fridge-banner-info">
            <span className="fridge-banner-badge">
              <GIcon name="bolt" size={15} />
              RETIQ COLOMBIA
            </span>
            <strong>Neveras Domésticas ($520k – $3.8M):</strong>
            <span>Filtra por bajo consumo eléctrico Categoría Tipo A:</span>
          </div>
          <div className="fridge-preset-btns">
            <button
              type="button"
              className={`fridge-preset-btn ${filters.energyA && !filters.dealOnly ? 'is-active' : ''}`}
              onClick={(e) => {
                animateTap(e.currentTarget);
                runSmoothTransition(() =>
                  onChange({ energyA: true, dealOnly: false, sort: 'price_asc', page: 1 })
                );
              }}
            >
              ⚡ Precios Bajos + Tipo A
            </button>
            <button
              type="button"
              className={`fridge-preset-btn ${filters.energyA && filters.dealOnly ? 'is-active' : ''}`}
              onClick={(e) => {
                animateTap(e.currentTarget);
                runSmoothTransition(() =>
                  onChange({ energyA: true, dealOnly: true, sort: 'discount', page: 1 })
                );
              }}
            >
              🔥 En Oferta + Tipo A
            </button>
            <button
              type="button"
              className={`fridge-preset-btn ${!filters.energyA ? 'is-active' : ''}`}
              onClick={(e) => {
                animateTap(e.currentTarget);
                runSmoothTransition(() =>
                  onChange({ energyA: false, dealOnly: false, sort: 'price_asc', page: 1 })
                );
              }}
            >
              ❄️ Ver todas
            </button>
          </div>
        </div>
      )}

      {collectMsg && <div className="friendly-alert">{collectMsg}</div>}

      {/* 2. Barra de Refinamiento: Ordenación, Ofertas, Eficiencia y Tiendas */}
      <div className="simple-options-row">
        <div className="filter-block">
          <span className="simple-group-label">Ordenar:</span>
          <div className="simple-sort-group">
            <button
              type="button"
              className={`simple-pill ${isLowestPrice && !filters.dealOnly ? 'is-active' : ''}`}
              onClick={(e) => {
                animateTap(e.currentTarget);
                runSmoothTransition(() => onChange({ sort: 'price_asc', dealOnly: false, page: 1 }));
              }}
              title="Ordenar de menor a mayor precio"
            >
              <GIcon name="payments" size={16} className="pc-btn-icon" />
              <span className="pc-btn-text">Más baratos</span>
            </button>

            <button
              type="button"
              className={`simple-pill pill-discount ${isDiscountSort || filters.dealOnly ? 'is-active' : ''}`}
              onClick={(e) => {
                animateTap(e.currentTarget);
                runSmoothTransition(() =>
                  onChange({
                    sort: isDiscountSort ? 'price_asc' : 'discount',
                    dealOnly: !filters.dealOnly,
                    page: 1,
                  })
                );
              }}
              title="Ver solo productos con descuento activo"
            >
              <GIcon name="local_fire_department" size={16} className="pc-btn-icon" fill={filters.dealOnly} />
              <span className="pc-btn-text">Con Descuento</span>
            </button>

            <button
              type="button"
              className={`simple-pill pill-energy-a ${filters.energyA ? 'is-active' : ''}`}
              onClick={(e) => {
                animateTap(e.currentTarget);
                runSmoothTransition(() =>
                  onChange({
                    energyA: !filters.energyA,
                    page: 1,
                  })
                );
              }}
              title="Filtrar modelos certificados con Eficiencia Energética Categoría Tipo A (RETIQ)"
            >
              <GIcon name="bolt" size={16} className="pc-btn-icon" fill={filters.energyA} />
              <span className="pc-btn-text">Eficiencia Tipo A</span>
            </button>

            {favCount > 0 && (
              <button
                type="button"
                className={`simple-pill pill-fav ${filters.favOnly ? 'is-active' : ''}`}
                onClick={(e) => {
                  animateTap(e.currentTarget);
                  runSmoothTransition(() => onChange({ favOnly: !filters.favOnly, page: 1 }));
                }}
              >
                <GIcon name="favorite" size={16} className="pc-btn-icon" fill={filters.favOnly} />
                <span className="pc-btn-text">Guardados ({favCount})</span>
              </button>
            )}
          </div>
        </div>

        <div className="filter-block">
          <span className="simple-group-label">Filtrar por tienda:</span>
          <div className="simple-store-group">
            {STORES.map((s) => {
              const active = filters.store === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  className={`simple-store-btn store-btn-${s.code} ${active ? 'is-active' : ''}`}
                  onClick={(e) => {
                    animateTap(e.currentTarget);
                    runSmoothTransition(() =>
                      onChange({ store: active && s.value !== '' ? '' : s.value, page: 1 })
                    );
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resumen dinámico de resultados */}
      <div className="results-summary-bar">
        <span>
          Mostrando <strong>{animatedTotal.toLocaleString('es-CO')}</strong> productos disponibles
          {filters.store ? ` en ${STORES.find((st) => st.value === filters.store)?.label}` : ' en todas las tiendas'}
          {filters.dealOnly ? ' (solo ofertas)' : ''}
          {filters.energyA ? ' (con certificación Tipo A)' : ''}
        </span>
      </div>
    </div>
  );
}
