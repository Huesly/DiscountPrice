import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductRow } from '../api';
import { fmt, discountPct, STORE_LABELS } from '../api';
import { getUnitMeasure, getEnergyEfficiencyInfo, normalizeProductUrl } from '../utils/unitMeasure';
import ProductImage from './ProductImage';
import Icon from './Icons';

interface ProductCardProps {
  p: ProductRow;
  isFav: boolean;
  onToggleFav: (sku: string) => void;
  onOpen: (p: ProductRow) => void;
}

export default function ProductCard({
  p,
  isFav,
  onToggleFav,
  onOpen,
}: ProductCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const discount = discountPct(p);
  const originalPrice = p.original_price;
  const currentPrice = p.price;
  const savings =
    originalPrice !== null && currentPrice !== null && originalPrice > currentPrice
      ? originalPrice - currentPrice
      : 0;

  const storeLabel = STORE_LABELS[p.store] ?? p.store;
  const unitInfo = getUnitMeasure(p.name, currentPrice);
  const energyInfo = getEnergyEfficiencyInfo(p.name);
  const canonicalUrl = normalizeProductUrl(p.url, p.store);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanQuery = p.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, ' ').slice(0, 32).trim();
    navigate(`/comparar?q=${encodeURIComponent(cleanQuery)}`);
  };

  return (
    <article
      className="df-card"
      onClick={() => onOpen(p)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(p);
      }}
      aria-label={`Ver detalles de ${p.name}`}
    >
      {/* 1. Header de Tarjeta */}
      <div className="df-card-top-bar">
        {/* Píldora del comercio */}
        <span className={`df-store-pill df-store-${p.store}`}>
          {storeLabel}
        </span>

        {/* Badge de Descuento (Fondo Emerald 50, borde Emerald 200, texto Emerald 800) */}
        {discount !== null && discount > 0 ? (
          <span className="df-discount-badge font-mono">
            -{discount}% OFF
          </span>
        ) : (
          <span className="df-badge-verified">
            <Icon name="verified" size={13} className="text-emerald-600" />
            <span>Verificado</span>
          </span>
        )}

        {/* Botón Favorito */}
        <button
          type="button"
          className={`df-fav-btn ${isFav ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(p.sku);
          }}
          aria-label={isFav ? 'Quitar de guardados' : 'Guardar producto'}
          title={isFav ? 'Quitar de guardados' : 'Guardar en favoritos'}
        >
          <Icon name={isFav ? 'heart_filled' : 'heart'} size={16} />
        </button>
      </div>

      {/* 2. Imagen del Producto (aspect-square con object-contain p-4 sobre fondo blanco limpio) */}
      <div className="df-card-image-wrap">
        <ProductImage
          src={p.image_url}
          alt={p.name}
          className="df-card-img"
          noImgClassName="df-card-noimg"
          size={56}
        />
      </div>

      {/* 3. Cuerpo Informativo */}
      <div className="df-card-body">
        {p.brand && <div className="df-card-brand">{p.brand}</div>}
        <h3 className="df-card-title" title={p.name}>
          {p.name}
        </h3>

        {/* Microetiquetas de verificación y eficiencia */}
        <div className="df-card-meta-row">
          <span className="df-meta-verified">
            <Icon name="check" size={12} className="text-emerald-600" />
            <span>Verificado hoy</span>
          </span>

          {energyInfo && (
            <span className="df-meta-energy" title="Clasificación RETIQ: Eficiencia A">
              <Icon name="bolt" size={11} className="text-amber-500" />
              <span>{energyInfo.badgeText}</span>
            </span>
          )}

          {unitInfo && (
            <span className="df-meta-unit font-mono" title="Precio por unidad de medida">
              {unitInfo.badgeText}
            </span>
          )}
        </div>

        {/* 4. Bloque de Precios (Tabular Numbers en JetBrains Mono) */}
        <div className="df-price-block">
          <div className="df-price-main-row">
            <span className="df-price-current font-mono">
              {fmt(currentPrice)}
            </span>
            {originalPrice !== null && originalPrice > (currentPrice ?? 0) && (
              <span className="df-price-original font-mono">
                {fmt(originalPrice)}
              </span>
            )}
          </div>

          {/* Etiqueta de Ahorro Monetario Real */}
          {savings > 0 && (
            <div className="df-savings-badge">
              <Icon name="trending_down" size={13} className="text-emerald-600" />
              <span>
                Ahorras <strong className="font-mono">{fmt(savings)} COP</strong>
              </span>
            </div>
          )}
        </div>

        {/* 5. CTAs de Acción */}
        <div className="df-card-actions" onClick={(e) => e.stopPropagation()}>
          <a
            href={canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="df-btn-primary-offer"
            title={`Abrir oferta en ${storeLabel}`}
          >
            <span>Ir a la oferta</span>
            <Icon name="open_in_new" size={14} />
          </a>

          <div className="df-btn-subgroup">
            <button
              type="button"
              className="df-btn-icon-action"
              onClick={handleCompareClick}
              title="Comparar con otras tiendas"
              aria-label="Comparar con otras tiendas"
            >
              <Icon name="compare_arrows" size={16} />
            </button>

            <button
              type="button"
              className={`df-btn-icon-action ${copied ? 'text-emerald-600 bg-emerald-50' : ''}`}
              onClick={handleCopyLink}
              title={copied ? '¡Enlace copiado!' : 'Copiar enlace directo'}
              aria-label="Copiar enlace del producto"
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
