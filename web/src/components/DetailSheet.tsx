import { useEffect, useState } from 'react';
import type { HistoryPoint, PriceStats, ProductRow } from '../api';
import { api, fmt, discountPct, STORE_LABELS } from '../api';
import { useFavorites } from '../hooks/useFavorites';
import { getUnitMeasure, getEnergyEfficiencyInfo, buildWhatsAppShareUrl, normalizeProductUrl } from '../utils/unitMeasure';
import PriceChart from './PriceChart';
import ProductImage from './ProductImage';
import GIcon from './GIcon';

interface Props {
  sku: string;
  onClose: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card detail-stat">
      <div className="muted detail-stat-label">{label}</div>
      <div className="detail-stat-value">{value}</div>
    </div>
  );
}

export default function DetailSheet({ sku, onClose }: Props) {
  const { isFav, toggle } = useFavorites();
  const [p, setP] = useState<ProductRow | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [prod, hist, st] = await Promise.all([api.product(sku), api.history(sku), api.statsFor(sku)]);
        if (!alive) return;
        setP(prod);
        setHistory(hist);
        setStats(st.stats);
      } catch {
        /* API error → keep shell */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sku]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const d = p ? discountPct(p) : null;
  const fav = p ? isFav(p.sku) : false;
  const unitInfo = p ? getUnitMeasure(p.name, p.price) : null;
  const energyInfo = p ? getEnergyEfficiencyInfo(p.name) : null;
  const storeLabel = p ? (STORE_LABELS[p.store] ?? p.store) : '';

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={p?.name ?? 'Detalle de producto'}>
        <div className="sheet-handle" />
        <div className="sheet-close">
          <button className="btn btn-icon" onClick={onClose} aria-label="Cerrar">
            <GIcon name="close" size={20} />
          </button>
        </div>

        {loading && !p ? (
          <div className="sheet-loading">
            <div className="skeleton" style={{ width: 110, height: 110, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 14, width: '70%', marginTop: 12 }} />
            <div className="skeleton" style={{ height: 20, width: '40%', marginTop: 10 }} />
          </div>
        ) : !p ? (
          <p className="muted" style={{ textAlign: 'center', padding: 24 }}>
            No se pudo cargar el producto.
          </p>
        ) : (
          <>
            <div className="detail-top">
              <ProductImage
                src={p.image_url}
                alt={p.name}
                className="detail-img"
                noImgClassName="detail-img detail-noimg"
                size={40}
              />
              <div className="detail-info">
                {p.brand && <div className="pc-brand">{p.brand}</div>}
                <h2 className="detail-name">{p.name}</h2>
                <div className="muted" style={{ fontSize: 12 }}>
                  {p.seller} · SKU {p.sku} · {p.category ?? ''}
                </div>
                <div className="detail-price-row">
                  <span className="detail-price">{fmt(p.price)}</span>
                  {p.original_price !== null && (
                    <>
                      <span className="strike">{fmt(p.original_price)}</span>
                      {d !== null && d > 0 && <span className="chip badge-off">-{d}%</span>}
                    </>
                  )}
                </div>
                {energyInfo && (
                  <div className="pc-unit-row" style={{ marginTop: 6 }}>
                    <span className="pc-energy-badge">{energyInfo.badgeText}</span>
                  </div>
                )}
                {unitInfo && (
                  <div className="pc-unit-row" style={{ marginTop: 6 }}>
                    <span className="pc-unit-badge">{unitInfo.badgeText}</span>
                  </div>
                )}
                <div className="pc-store-row">
                  <span className={`store-badge store-${p.store}`}>{storeLabel}</span>
                </div>
              </div>
            </div>

            {stats && stats.samples > 0 && (
              <div className="detail-stats">
                <Stat label="Actual" value={fmt(stats.current)} />
                <Stat label="Mínimo" value={fmt(stats.min)} />
                <Stat label="Máximo" value={fmt(stats.max)} />
                <Stat label="Promedio" value={fmt(stats.avg)} />
                <Stat label="Mediana" value={fmt(stats.median)} />
                <Stat label="Muestras" value={String(stats.samples)} />
              </div>
            )}

            <div className="detail-chart">
              <h3>Historial de precio</h3>
              <PriceChart history={history} />
            </div>

            <div className="detail-actions">
              <button
                className={`btn ${fav ? 'btn-primary' : ''}`}
                onClick={() => toggle(p.sku)}
              >
                <GIcon name="favorite" size={17} fill={fav} />
                {fav ? 'Guardado' : 'Guardar'}
              </button>
              <a
                className="btn btn-whatsapp"
                href={buildWhatsAppShareUrl({
                  name: p.name,
                  store: p.store,
                  price: p.price,
                  original_price: p.original_price,
                  url: p.url,
                  storeLabel,
                })}
                target="_blank"
                rel="noreferrer"
              >
                <GIcon name="chat" size={17} /> Enviar a WhatsApp
              </a>
              <a className="btn btn-primary" href={normalizeProductUrl(p.url, p.store)} target="_blank" rel="noreferrer">
                <GIcon name="open_in_new" size={17} /> Ver en {storeLabel}
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}
