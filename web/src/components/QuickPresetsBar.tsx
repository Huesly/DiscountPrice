import type { UrlFilters } from '../hooks/useUrlFilters';
import Icon from './Icons';

interface QuickPresetsProps {
  filters: UrlFilters;
  onChange: (patch: Partial<UrlFilters>) => void;
  onReset: () => void;
  favCount: number;
}

export default function QuickPresetsBar({
  filters,
  onChange,
  onReset,
  favCount,
}: QuickPresetsProps) {
  const isAll =
    !filters.query &&
    !filters.category &&
    !filters.store &&
    !filters.dealOnly &&
    !filters.energyA &&
    filters.minDiscount === undefined &&
    filters.minPrice === undefined &&
    filters.maxPrice === undefined &&
    !filters.favOnly;

  const isHighDiscount = filters.minDiscount === 40;
  const isUnder100k = filters.maxPrice === 100000;
  const isEnergyA = filters.energyA;
  const isDealsToday = filters.dealOnly && filters.minDiscount === undefined;
  const isFavs = filters.favOnly;
  const isMacbook = filters.query.trim().toLowerCase() === 'macbook';
  const isIphone = filters.query.trim().toLowerCase() === 'iphone';
  const isIpad = filters.query.trim().toLowerCase() === 'ipad';

  return (
    <div className="df-presets-wrapper">
      <div className="df-container df-presets-inner" role="region" aria-label="Presets rápidos de ofertas">
        <div className="df-presets-scroll">
          {/* Preset: Todos */}
          <button
            type="button"
            className={`df-preset-chip ${isAll ? 'active' : ''}`}
            onClick={onReset}
          >
            <span>Todas las ofertas</span>
          </button>

          {/* Preset Apple: MacBook */}
          <button
            type="button"
            className={`df-preset-chip ${isMacbook ? 'active' : ''}`}
            onClick={() =>
              onChange({
                query: isMacbook ? '' : 'macbook',
                page: 1,
              })
            }
          >
            <Icon name="laptop" size={14} className="text-blue-600" />
            <span>MacBook</span>
          </button>

          {/* Preset Apple: iPhone */}
          <button
            type="button"
            className={`df-preset-chip ${isIphone ? 'active' : ''}`}
            onClick={() =>
              onChange({
                query: isIphone ? '' : 'iphone',
                page: 1,
              })
            }
          >
            <Icon name="smartphone" size={14} className="text-slate-700" />
            <span>iPhone</span>
          </button>

          {/* Preset Apple: iPad */}
          <button
            type="button"
            className={`df-preset-chip ${isIpad ? 'active' : ''}`}
            onClick={() =>
              onChange({
                query: isIpad ? '' : 'ipad',
                page: 1,
              })
            }
          >
            <Icon name="tablet" size={14} className="text-indigo-600" />
            <span>iPad</span>
          </button>

          {/* Preset: Rebajas > 40% */}
          <button
            type="button"
            className={`df-preset-chip ${isHighDiscount ? 'active' : ''}`}
            onClick={() =>
              onChange({
                minDiscount: isHighDiscount ? undefined : 40,
                page: 1,
              })
            }
          >
            <span className="df-chip-dot emerald" />
            <span>Rebajas &gt; 40%</span>
          </button>

          {/* Preset: Menos de $100.000 */}
          <button
            type="button"
            className={`df-preset-chip ${isUnder100k ? 'active' : ''}`}
            onClick={() =>
              onChange({
                maxPrice: isUnder100k ? undefined : 100000,
                page: 1,
              })
            }
          >
            <span>Menos de $100.000 COP</span>
          </button>

          {/* Preset: Verificados Hoy / Gangas Detectadas */}
          <button
            type="button"
            className={`df-preset-chip ${isDealsToday ? 'active' : ''}`}
            onClick={() =>
              onChange({
                dealOnly: !isDealsToday,
                page: 1,
              })
            }
          >
            <Icon name="verified" size={14} className="text-emerald-600" />
            <span>Verificados Hoy</span>
          </button>

          {/* Preset: Eficiencia A */}
          <button
            type="button"
            className={`df-preset-chip ${isEnergyA ? 'active' : ''}`}
            onClick={() =>
              onChange({
                energyA: !isEnergyA,
                page: 1,
              })
            }
          >
            <Icon name="bolt" size={14} className="text-amber-600" />
            <span>Eficiencia RETIQ A</span>
          </button>

          {/* Preset: Favoritos */}
          {favCount > 0 && (
            <button
              type="button"
              className={`df-preset-chip ${isFavs ? 'active' : ''}`}
              onClick={() =>
                onChange({
                  favOnly: !isFavs,
                  page: 1,
                })
              }
            >
              <Icon name="heart_filled" size={13} className="text-rose-500" />
              <span>Guardados ({favCount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
