import type { ProductRow } from '../api';
import { useStaggerCards } from '../utils/smoothAnimations';
import ProductCard from './ProductCard';
import ProductSkeletonGrid from './ProductSkeletonGrid';
import GIcon from './GIcon';

interface Props {
  items: ProductRow[];
  loading: boolean;
  isFav: (sku: string) => boolean;
  onToggleFav: (sku: string) => void;
  onOpen: (p: ProductRow) => void;
  skeletonCount?: number;
}

export default function ProductGrid({
  items,
  loading,
  isFav,
  onToggleFav,
  onOpen,
  skeletonCount = 16,
}: Props) {
  const depKey = loading ? 'loading' : items.map((i) => `${i.store}:${i.sku}`).join('|');
  const gridRef = useStaggerCards<HTMLDivElement>(depKey);

  if (loading) {
    return <ProductSkeletonGrid count={skeletonCount} />;
  }

  if (items.length === 0) {
    return (
      <div className="card empty-state-box">
        <div className="empty-icon-wrap">
          <GIcon name="search_off" size={40} className="empty-icon" />
        </div>
        <h3 className="empty-title">Sin resultados en esta selección</h3>
        <p className="empty-desc">
          Prueba cambiando los filtros, escribiendo otro término en el buscador o seleccionando otra tienda.
        </p>
      </div>
    );
  }

  return (
    <div ref={gridRef} className="grid">
      {items.map((p) => (
        <ProductCard
          key={`${p.store}:${p.sku}`}
          p={p}
          isFav={isFav(p.sku)}
          onToggleFav={onToggleFav}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
