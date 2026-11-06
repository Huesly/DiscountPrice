import { useNavigate } from 'react-router-dom';
import type { ProductRow } from '../api';
import { fmt, discountPct, STORE_LABELS } from '../api';
import { getUnitMeasure, getEnergyEfficiencyInfo, normalizeProductUrl } from '../utils/unitMeasure';
import { animateHeartPop, animateTap, runSmoothTransition } from '../utils/smoothAnimations';
import ProductImage from './ProductImage';
import GIcon from './GIcon';

interface Props {
  p: ProductRow;
  isFav: boolean;
  onToggleFav: (sku: string) => void;
  onOpen: (p: ProductRow) => void;
}

export default function ProductCard({ p, isFav, onToggleFav, onOpen }: Props) {
  const navigate = useNavigate();
  const d = discountPct(p);
  const savings =
    p.original_price !== null && p.price !== null && p.original_price > p.price
      ? p.original_price - p.price
      : 0;

  const storeName = STORE_LABELS[p.store] ?? p.store;
  const unitInfo = getUnitMeasure(p.name, p.price);
  const energyInfo = getEnergyEfficiencyInfo(p.name);

  const handleCompare = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    animateTap(e.currentTarget);
    const cleanQuery = p.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, ' ').slice(0, 35).trim();
    runSmoothTransition(() => {
      navigate(`/comparar?q=${encodeURIComponent(cleanQuery)}`);
    });
  };

  return (
    <article
      className="card product-card"
      onClick={(e) => {
        animateTap(e.currentTarget);
        onOpen(p);
      }}
    >
      <div className="pc-img-wrap">
        <ProductImage
          src={p.image_url}
          alt={p.name}
          className="thumb"
          noImgClassName="thumb pc-noimg"
          size={56}
        />

        {d !== null && d > 0 && (
          <span className="chip badge-off pc-badge">-{d}%</span>
        )}

        <span className={`store-badge store-${p.store} pc-store`}>
          {storeName}
        </span>

        <button
          type="button"
          className={`pc-fav ${isFav ? 'is-fav' : ''}`}
          aria-label={isFav ? 'Quitar de guardados' : 'Guardar producto'}
          onClick={(e) => {
            e.stopPropagation();
            animateHeartPop(e.currentTarget);
            onToggleFav(p.sku);
          }}
        >
          <GIcon name="favorite" size={18} fill={isFav} />
        </button>
      </div>

      <header className="pc-header">
        {p.brand && <span className="pc-brand">{p.brand}</span>}
        <h3 className="pc-name" title={p.name}>
          {p.name}
        </h3>
      </header>

      <div className="pc-price-section">
        <div className="pc-price-row">
          <span className="pc-price">{fmt(p.price)}</span>
          {p.original_price !== null && p.original_price > (p.price ?? 0) && (
            <span className="strike">Antes {fmt(p.original_price)}</span>
          )}
        </div>

        {energyInfo && (
          <div className="pc-unit-row">
            <span className="pc-energy-badge" title="Clasificación RETIQ Colombia: Eficiencia Energética Categoría Tipo A (Bajo consumo eléctrico)">
              {energyInfo.badgeText}
            </span>
          </div>
        )}

        {unitInfo && (
          <div className="pc-unit-row">
            <span className="pc-unit-badge" title={`Presentación: ${unitInfo.presentationLabel} — Costo unitario: ${unitInfo.unitPriceLabel}`}>
              {unitInfo.badgeText}
            </span>
          </div>
        )}

        {savings > 0 && (
          <div className="pc-savings-row">
            <span className="pc-savings-text">Te ahorras {fmt(savings)}</span>
          </div>
        )}
      </div>

      <footer className="pc-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="pc-btn-action pc-btn-compare"
          onClick={handleCompare}
        >
          <GIcon name="compare_arrows" size={15} className="pc-btn-icon" />
          <span className="pc-btn-text">Comparar</span>
        </button>

        <a
          className="pc-btn-action pc-btn-store"
          href={normalizeProductUrl(p.url, p.store)}
          target="_blank"
          rel="noreferrer"
        >
          <GIcon name="open_in_new" size={15} className="pc-btn-icon" />
          <span className="pc-btn-text">Ver en tienda</span>
        </a>
      </footer>
    </article>
  );
}
