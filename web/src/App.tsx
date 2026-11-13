import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import type { ProductFilters, ProductRow, SortKey, Stats } from './api';
import { api } from './api';
import { useUrlFilters, type UrlFilters } from './hooks/useUrlFilters';
import { useFavorites } from './hooks/useFavorites';
import Header from './components/Header';
import QuickPresetsBar from './components/QuickPresetsBar';
import SidebarFilters from './components/SidebarFilters';
import ActiveFilterChips from './components/ActiveFilterChips';
import MobileFilterDrawer from './components/MobileFilterDrawer';
import ProductGrid from './components/ProductGrid';
import Pagination from './components/Pagination';
import DetailSheet from './components/DetailSheet';
import ErrorBanner from './components/ErrorBanner';
import ComparePage from './components/ComparePage';

const PAGE_SIZE = 24;

function Shell() {
  const { filters, set, reset } = useUrlFilters();
  const { favorites, toggle } = useFavorites();

  const [items, setItems] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [openSku, setOpenSku] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState<Stats | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const abortCtrlRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  // Fetch stats on mount for store counts
  useEffect(() => {
    let alive = true;
    api.stats().then((s) => {
      if (alive) setGlobalStats(s);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const fetchProducts = useCallback(async () => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const controller = new AbortController();
    abortCtrlRef.current = controller;
    const currentReqId = ++reqIdRef.current;

    const f = buildApiFilters(filters, favorites);
    setLoading(true);
    try {
      const res = await api.products(
        f,
        PAGE_SIZE,
        (filters.page - 1) * PAGE_SIZE,
        controller.signal
      );
      if (currentReqId !== reqIdRef.current) return;
      setItems(res.items);
      setTotal(res.total);
      setApiError(false);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (currentReqId !== reqIdRef.current) return;
      setItems([]);
      setTotal(0);
      setApiError(true);
    } finally {
      if (currentReqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters, favorites]);

  useEffect(() => {
    fetchProducts();
    return () => {
      abortCtrlRef.current?.abort();
    };
  }, [fetchProducts]);

  const handleCollect = useCallback(
    async (term: string) => {
      await api.collect(term);
      await fetchProducts();
      // Refresh stats
      api.stats().then(setGlobalStats).catch(() => {});
    },
    [fetchProducts]
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeStoresCount = globalStats?.store_counts
    ? Object.keys(globalStats.store_counts).length
    : 7;

  return (
    <>
      {/* 1-Click Quick Presets Bar */}
      <QuickPresetsBar
        filters={filters}
        onChange={set}
        onReset={reset}
        favCount={favorites.length}
      />

      <div className="df-layout-container">
        {apiError && (
          <div className="df-error-wrapper">
            <ErrorBanner
              message="No se pudo conectar con la API de precios. Revisa que el servidor backend esté en línea."
              onDismiss={() => setApiError(false)}
            />
          </div>
        )}

        <div className="df-main-grid">
          {/* Desktop Modular Sticky Sidebar */}
          <div className="df-sidebar-column">
            <SidebarFilters
              filters={filters}
              storeCounts={globalStats?.store_counts}
              onChange={set}
              onReset={reset}
              onCollect={handleCollect}
            />
          </div>

          {/* Main Product Catalog Section */}
          <main className="df-content-column">
            {/* Active Chips Toolbar + Sort + Live Counter */}
            <ActiveFilterChips
              filters={filters}
              total={total}
              storeCount={activeStoresCount}
              loading={loading}
              onChange={set}
              onReset={reset}
              onOpenMobileFilters={() => setMobileDrawerOpen(true)}
            />

            {/* Product Cards Grid */}
            <ProductGrid
              items={items}
              loading={loading}
              isFav={(sku) => favSet.has(sku)}
              onToggleFav={toggle}
              onOpen={(p) => setOpenSku(p.sku)}
              onResetFilters={reset}
            />

            {/* Pagination */}
            <Pagination
              page={filters.page}
              pages={pages}
              total={total}
              onPage={(p) => set({ page: p })}
            />
          </main>
        </div>
      </div>

      {/* Mobile Accessible Filter Drawer */}
      <MobileFilterDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        filters={filters}
        total={total}
        storeCounts={globalStats?.store_counts}
        onChange={set}
        onReset={reset}
        onCollect={handleCollect}
      />

      {/* Product Detail Modal */}
      {openSku && <DetailSheet sku={openSku} onClose={() => setOpenSku(null)} />}
    </>
  );
}

function buildApiFilters(
  filters: UrlFilters,
  favorites: string[]
): ProductFilters {
  const f: ProductFilters = {};
  if (filters.query.trim()) f.query = filters.query.trim();
  if (filters.category) f.category = filters.category;
  if (filters.store) f.store = filters.store;
  if (filters.dealOnly) f.dealOnly = true;
  if (filters.energyA) f.energyClassA = true;
  if (filters.minDiscount !== undefined) f.minDiscount = filters.minDiscount;
  if (filters.minPrice !== undefined) f.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined) f.maxPrice = filters.maxPrice;
  if (filters.favOnly && favorites.length) f.skus = favorites;
  f.sort = (filters.sort === 'default' ? 'price_asc' : filters.sort) as SortKey;
  return f;
}

export default function App() {
  const { favorites } = useFavorites();
  const [totalCatalog, setTotalCatalog] = useState<number | undefined>(undefined);

  useEffect(() => {
    api.stats().then((s) => setTotalCatalog(s.products)).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Header favCount={favorites.length} totalProducts={totalCatalog} />
      <Routes>
        <Route path="/" element={<Shell />} />
        <Route path="/comparar" element={<ComparePage />} />
      </Routes>
    </BrowserRouter>
  );
}
