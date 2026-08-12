import type { ProductRow } from '../api';
import ProductCard from './ProductCard';

interface Props {
  items: ProductRow[];
  loading: boolean;
  isFav: (sku: string) => boolean;
  onToggleFav: (sku: string) => void;
  onOpen: (p: ProductRow) => void;
  skeletonCount?: number;
}

export default function ProductGrid({ items, loading, isFav, onToggleFav, onOpen, skeletonCount = 24 }: Props) {
  if (loading) {
    return (
      <div className="grid">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="card pc-skeleton">
            <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 10 }} />
            <div className="skeleton" style={{ height: 12, width: '50%', marginTop: 10 }} />
            <div className="skeleton" style={{ height: 12, width: '90%', marginTop: 8 }} />
            <div className="skeleton" style={{ height: 16, width: '40%', marginTop: 10 }} />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card empty">
        <div style={{ fontSize: 34, marginBottom: 6 }}>🔍</div>
        <p>No hay productos que coincidan con tu búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="grid">
      {items.map((p) => (
        <ProductCard key={p.sku} p={p} isFav={isFav(p.sku)} onToggleFav={onToggleFav} onOpen={onOpen} />
      ))}
    </div>
  );
}