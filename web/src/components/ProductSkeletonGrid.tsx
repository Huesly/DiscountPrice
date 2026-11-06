interface Props {
  count?: number;
}

export default function ProductSkeletonGrid({ count = 12 }: Props) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="grid product-skeleton-grid" aria-busy="true" aria-label="Cargando productos...">
      {items.map((i) => (
        <article key={i} className="card product-card skeleton-card">
          <div className="pc-img-wrap skeleton-box skeleton-img-box">
            <div className="skeleton-badge" />
          </div>

          <div className="pc-header skeleton-content">
            <div className="skeleton-line skeleton-brand" />
            <div className="skeleton-line skeleton-title-1" />
            <div className="skeleton-line skeleton-title-2" />

            <div className="skeleton-price-section">
              <div className="skeleton-line skeleton-price" />
              <div className="skeleton-line skeleton-subprice" />
            </div>

            <div className="skeleton-actions">
              <div className="skeleton-btn" />
              <div className="skeleton-btn" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
