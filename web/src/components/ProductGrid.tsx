import type { ProductRow } from '../api';
import ProductCard from './ProductCard';
import ProductSkeletonGrid from './ProductSkeletonGrid';
import Icon from './Icons';

interface ProductGridProps {
  items: ProductRow[];
  loading: boolean;
  isFav: (sku: string) => boolean;
  onToggleFav: (sku: string) => void;
  onOpen: (p: ProductRow) => void;
  onResetFilters?: () => void;
}

export default function ProductGrid({
  items,
  loading,
  isFav,
  onToggleFav,
  onOpen,
  onResetFilters,
}: ProductGridProps) {
  if (loading) {
    return <ProductSkeletonGrid count={12} />;
  }

  if (items.length === 0) {
    return (
      <div className="df-empty-state" role="status" aria-live="polite">
        <div className="df-empty-illustration-wrap">
          <svg
            className="df-empty-svg"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="60" cy="60" r="54" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="60" cy="60" r="40" fill="#F1F5F9" />
            <path
              d="M50 48H70M50 56H65M50 64H58"
              stroke="#94A3B8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="68" cy="68" r="14" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
            <path d="M78 78L86 86" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        <h3 className="df-empty-title">No encontramos ofertas con esos criterios</h3>
        <p className="df-empty-sub">
          Intenta ajustar el porcentaje de descuento, eliminar términos de búsqueda o cambiar de comercio para explorar más opciones.
        </p>

        {onResetFilters && (
          <button
            type="button"
            className="df-empty-btn-reset"
            onClick={onResetFilters}
          >
            <Icon name="refresh" size={16} />
            <span>Restablecer todos los filtros</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="df-product-grid" role="region" aria-label="Resultados de ofertas">
      {items.map((p) => (
        <ProductCard
          key={p.sku}
          p={p}
          isFav={isFav(p.sku)}
          onToggleFav={onToggleFav}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
