import { Heart, ExternalLink } from 'lucide-react';
import type { ProductRow } from '../api';
import { fmt, discountPct, STORE_LABELS } from '../api';
import ProductImage from './ProductImage';

interface Props {
  p: ProductRow;
  isFav: boolean;
  onToggleFav: (sku: string) => void;
  onOpen: (p: ProductRow) => void;
}

export default function ProductCard({ p, isFav, onToggleFav, onOpen }: Props) {
  const d = discountPct(p);
  return (
    <div className="card product-card" onClick={() => onOpen(p)}>
      <div className="pc-img-wrap">
        <ProductImage
          src={p.image_url}
          alt={p.name}
          className="thumb"
          noImgClassName="thumb pc-noimg"
          size={40}
        />
        {d !== null && d > 0 && <span className="chip badge-off pc-badge">-{d}%</span>}
        <span className={`store-badge store-${p.store} pc-store`}>{STORE_LABELS[p.store] ?? p.store}</span>
        <button
          className={`pc-fav ${isFav ? 'is-fav' : ''}`}
          aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(p.sku);
          }}
        >
          <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="pc-body">
        {p.brand && <div className="pc-brand">{p.brand}</div>}
        <div className="pc-name" title={p.name}>
          {p.name}
        </div>
        <div className="pc-seller muted">{p.seller ?? ''}</div>
        <div className="pc-price-row">
          <span className="pc-price">{fmt(p.price)}</span>
          {p.original_price !== null && (
            <span className="strike">{fmt(p.original_price)}</span>
          )}
        </div>
      </div>
      <a
        className="pc-link"
        href={p.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Ver en ${STORE_LABELS[p.store] ?? p.store}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={13} />
      </a>
    </div>
  );
}