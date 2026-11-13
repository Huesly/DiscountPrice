interface ProductSkeletonGridProps {
  count?: number;
}

export default function ProductSkeletonGrid({ count = 12 }: ProductSkeletonGridProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      className="df-product-grid"
      aria-busy="true"
      aria-label="Cargando ofertas..."
    >
      {items.map((i) => (
        <article key={i} className="df-card df-skeleton-card">
          {/* Top Bar Skeleton */}
          <div className="df-card-top-bar">
            <div className="df-skel-box df-skel-store" />
            <div className="df-skel-box df-skel-badge" />
            <div className="df-skel-box df-skel-fav" />
          </div>

          {/* Image Box Skeleton */}
          <div className="df-card-image-wrap">
            <div className="df-skel-box df-skel-image" />
          </div>

          {/* Content Body Skeleton */}
          <div className="df-card-body">
            <div className="df-skel-box df-skel-brand" />
            <div className="df-skel-box df-skel-title-1" />
            <div className="df-skel-box df-skel-title-2" />
            <div className="df-skel-box df-skel-meta" />

            {/* Price Block Skeleton */}
            <div className="df-price-block">
              <div className="df-skel-box df-skel-price-main" />
              <div className="df-skel-box df-skel-savings" />
            </div>

            {/* Actions Skeleton */}
            <div className="df-card-actions">
              <div className="df-skel-box df-skel-btn-primary" />
              <div className="df-skel-box df-skel-btn-icon" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
