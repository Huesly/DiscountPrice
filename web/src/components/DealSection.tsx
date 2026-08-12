import { TrendingDown, ExternalLink } from 'lucide-react';
import type { Deal } from '../api';
import { fmt } from '../api';
import ProductImage from './ProductImage';

interface Props {
  deals: Deal[];
  onOpen: (sku: string) => void;
}

export default function DealSection({ deals, onOpen }: Props) {
  if (deals.length === 0) return null;
  return (
    <section className="deals-section">
      <h2 className="section-title">
        <TrendingDown size={18} /> Ofertas destacadas
        <span className="chip badge-deal">{deals.length}</span>
      </h2>
      <div className="deals-row">
        {deals.map((d) => (
          <div key={d.sku} className="card deal-card" onClick={() => onOpen(d.sku)}>
            <ProductImage
              src={d.image_url}
              alt={d.name}
              className="deal-thumb"
              noImgClassName="deal-thumb deal-noimg"
              size={22}
            />
            <div className="deal-body">
              {d.brand && <div className="pc-brand">{d.brand}</div>}
              <div className="deal-name" title={d.name}>{d.name}</div>
              <div className="deal-meta muted">
                {fmt(d.avg_30d)} · {fmt(d.min_historical)}
              </div>
              <div className="deal-foot">
                <span className="deal-price">{fmt(d.price)}</span>
                {d.discount_pct !== null && (
                  <span className="chip badge-off">-{Math.round(d.discount_pct)}%</span>
                )}
                <a
                  className="deal-link"
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Ver en Falabella"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}