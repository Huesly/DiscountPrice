import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { GroupRow, GroupDetail, ProductRow } from '../api';
import { api, fmt, discountPct, STORE_LABELS } from '../api';
import { getUnitMeasure, buildWhatsAppShareUrl, normalizeProductUrl } from '../utils/unitMeasure';
import { useStaggerCards, animateTap, runSmoothTransition } from '../utils/smoothAnimations';
import ProductImage from './ProductImage';
import GIcon from './GIcon';

function StoreBadge({ store }: { store: string }) {
  const label = STORE_LABELS[store] ?? store;
  return <span className={`store-badge store-${store}`}>{label}</span>;
}

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQ);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [directItems, setDirectItems] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectStatus, setCollectStatus] = useState<string | null>(null);
  const debounced = query.trim();
  const staggerKey = `${selected?.id ?? 'list'}-${groups.length}-${directItems.length}-${debounced}`;
  const pageRef = useStaggerCards<HTMLDivElement>(staggerKey);

  useEffect(() => {
    const urlQ = searchParams.get('q') ?? '';
    if (urlQ !== query) {
      setQuery(urlQ);
    }
  }, [searchParams]);

  const loadComparison = async (q: string) => {
    try {
      setLoading(true);
      const [g, prodRes] = await Promise.all([
        api.groups(q, 24),
        q ? api.products({ query: q, sort: 'price_asc' }, 16, 0) : Promise.resolve({ total: 0, items: [] }),
      ]);
      setGroups(g);
      setDirectItems(prodRes.items);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const [g, prodRes] = await Promise.all([
          api.groups(debounced, 24),
          debounced
            ? api.products({ query: debounced, sort: 'price_asc' }, 16, 0)
            : Promise.resolve({ total: 0, items: [] }),
        ]);
        if (!alive) return;
        setGroups(g);
        setDirectItems(prodRes.items);
        setError(false);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    }, debounced ? 250 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [debounced]);

  const handleCollectAcrossStores = async () => {
    const q = debounced || query.trim();
    if (!q || collecting) return;
    setCollecting(true);
    setCollectStatus(`Consultando "${q}" en D1, Ara, Éxito, Alkosto, Falabella y Homecenter...`);
    try {
      const res = await api.collect(q);
      setCollectStatus(`¡Listo! ${res.added} productos encontrados y comparados.`);
      await loadComparison(q);
    } catch {
      setCollectStatus('Error recolectando datos en tiendas.');
    } finally {
      setCollecting(false);
    }
  };

  const openGroup = async (id: number) => {
    try {
      setLoading(true);
      const g = await api.group(id);
      setSelected(g);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const bestSku = selected?.members.reduce<string | null>((acc, m) => {
    if (m.price === null) return acc;
    if (acc === null) return m.sku;
    const current = selected.members.find((x) => x.sku === acc)?.price ?? null;
    return current === null || m.price < current ? m.sku : acc;
  }, null);

  return (
    <div ref={pageRef} className="container main compare-page-wrap">
      <div className="compare-header-card">
        <div className="compare-title-row">
          <button
            type="button"
            className="btn btn-back-cat"
            onClick={(e) => {
              animateTap(e.currentTarget);
              runSmoothTransition(() => navigate('/'));
            }}
          >
            <GIcon name="arrow_back" size={16} /> Volver al catálogo
          </button>
          <div className="page-title">
            <GIcon name="compare_arrows" size={24} />
            <div>
              <div className="logo-title">Comparador Multitienda</div>
              <div className="logo-sub">Compara en D1, Ara, Éxito, Alkosto, Falabella, Homecenter e IKEA Cali</div>
            </div>
          </div>
        </div>

        <div className="compare-search-row">
          <div className="simple-search-input-wrap">
            <GIcon name="search" size={18} className="simple-search-icon" />
            <input
              className="simple-search-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setSearchParams(e.target.value ? { q: e.target.value } : {}, { replace: true });
              }}
              placeholder="Escribe qué quieres comparar (ej: lámpara, arroz, leche, aceite, silla, escritorio)…"
            />
          </div>
          {query.trim() && (
            <button
              type="button"
              className="btn-collect-live"
              onClick={handleCollectAcrossStores}
              disabled={collecting}
            >
              <GIcon name="add" size={16} /> {collecting ? 'Buscando…' : 'Buscar en todas las tiendas'}
            </button>
          )}
        </div>

        {collectStatus && <div className="friendly-alert">{collectStatus}</div>}
      </div>

      {error && (
        <div className="error-banner">
          <span>No se pudo cargar la comparación. Revisa que la API esté corriendo.</span>
        </div>
      )}

      {selected ? (
        <div className="compare-view">
          <button type="button" className="btn mb-16" onClick={() => setSelected(null)}>
            <GIcon name="arrow_back" size={15} /> Volver a resultados
          </button>
          <div className="compare-grid">
            {selected.members.map((m) => {
              const d = discountPct(m);
              const isBest = m.sku === bestSku;
              const unitInfo = getUnitMeasure(m.name, m.price);
              const storeLabel = STORE_LABELS[m.store] ?? m.store;
              return (
                <article key={`${m.store}:${m.sku}`} className={`card compare-card ${isBest ? 'compare-best' : ''}`}>
                  {isBest && <div className="chip badge compare-flag">🏆 Más Económico</div>}
                  <ProductImage
                    src={m.image_url}
                    alt={m.name}
                    className="thumb compare-thumb"
                    noImgClassName="thumb pc-noimg"
                    size={60}
                  />
                  <StoreBadge store={m.store} />
                  {m.brand && <div className="pc-brand">{m.brand}</div>}
                  <h3 className="pc-name" title={m.name}>
                    {m.name}
                  </h3>
                  <div className="pc-price-row">
                    <span className="pc-price">{fmt(m.price)}</span>
                    {m.original_price !== null && m.original_price > (m.price ?? 0) && (
                      <span className="strike">{fmt(m.original_price)}</span>
                    )}
                  </div>
                  {unitInfo && (
                    <div className="pc-unit-row">
                      <span className="pc-unit-badge">{unitInfo.badgeText}</span>
                    </div>
                  )}
                  {d !== null && d > 0 && <div className="chip badge-off">-{d}%</div>}
                  <footer className="pc-actions">
                    <a
                      className="pc-btn-action pc-btn-whatsapp"
                      href={buildWhatsAppShareUrl({
                        name: m.name,
                        store: m.store,
                        price: m.price,
                        original_price: m.original_price,
                        url: m.url,
                        storeLabel,
                      })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <GIcon name="chat" size={14} className="pc-btn-icon" />
                      <span className="pc-btn-text">WhatsApp</span>
                    </a>
                    <a className="pc-btn-action pc-btn-store" href={normalizeProductUrl(m.url, m.store)} target="_blank" rel="noreferrer">
                      <GIcon name="open_in_new" size={14} className="pc-btn-icon" />
                      <span className="pc-btn-text">Ver en {storeLabel}</span>
                    </a>
                  </footer>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {groups.length > 0 && (
            <section className="mb-16">
              <h3 className="step-title mb-16">Grupos idénticos comparados entre tiendas ({groups.length})</h3>
              <div className="grid group-grid">
                {groups.map((g) => (
                  <button key={g.id} type="button" className="card group-card" onClick={() => openGroup(g.id)}>
                    <div className="pc-name">{g.name}</div>
                    <div className="group-meta">
                      {g.brand && <span className="pc-brand">{g.brand}</span>}
                      <span className="chip badge">{g.members} tiendas</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {directItems.length > 0 && (
            <section className="mb-16">
              <h3 className="step-title mb-16">
                Opciones ordenadas de menor a mayor precio para "{debounced}"
              </h3>
              <div className="compare-grid">
                {directItems.map((m, idx) => {
                  const d = discountPct(m);
                  const isBest = idx === 0;
                  const unitInfo = getUnitMeasure(m.name, m.price);
                  const storeLabel = STORE_LABELS[m.store] ?? m.store;
                  return (
                    <article key={`${m.store}:${m.sku}`} className={`card compare-card ${isBest ? 'compare-best' : ''}`}>
                      {isBest && <div className="chip badge compare-flag">🏆 Opción más barata</div>}
                      <ProductImage
                        src={m.image_url}
                        alt={m.name}
                        className="thumb compare-thumb"
                        noImgClassName="thumb pc-noimg"
                        size={56}
                      />
                      <StoreBadge store={m.store} />
                      {m.brand && <div className="pc-brand">{m.brand}</div>}
                      <h3 className="pc-name" title={m.name}>
                        {m.name}
                      </h3>
                      <div className="pc-price-row">
                        <span className="pc-price">{fmt(m.price)}</span>
                        {m.original_price !== null && m.original_price > (m.price ?? 0) && (
                          <span className="strike">{fmt(m.original_price)}</span>
                        )}
                      </div>
                      {unitInfo && (
                        <div className="pc-unit-row">
                          <span className="pc-unit-badge">{unitInfo.badgeText}</span>
                        </div>
                      )}
                      {d !== null && d > 0 && <div className="chip badge-off">-{d}%</div>}
                      <footer className="pc-actions">
                        <a
                          className="pc-btn-action pc-btn-whatsapp"
                          href={buildWhatsAppShareUrl({
                            name: m.name,
                            store: m.store,
                            price: m.price,
                            original_price: m.original_price,
                            url: m.url,
                            storeLabel,
                          })}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <GIcon name="chat" size={14} className="pc-btn-icon" />
                          <span className="pc-btn-text">WhatsApp</span>
                        </a>
                        <a className="pc-btn-action pc-btn-store" href={normalizeProductUrl(m.url, m.store)} target="_blank" rel="noreferrer">
                          <GIcon name="open_in_new" size={14} className="pc-btn-icon" />
                          <span className="pc-btn-text">Ver en {storeLabel}</span>
                        </a>
                      </footer>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {!loading && groups.length === 0 && directItems.length === 0 && (
            <div className="empty-state">
              <p>No se encontraron resultados aún para "{query || 'esta búsqueda'}".</p>
              {query.trim() && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCollectAcrossStores}
                  disabled={collecting}
                  style={{ marginTop: '0.75rem' }}
                >
                  {collecting
                    ? 'Consultando en tiendas...'
                    : `Buscar "${query.trim()}" ahora en D1, Ara, Éxito, Alkosto, Falabella y Homecenter`}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
