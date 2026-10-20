import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import type { Deal, ProductFilters, ProductRow, SortKey, Stats } from './api';
import { api } from './api';
import { useUrlFilters, type UrlFilters } from './hooks/useUrlFilters';
import { useDebounce } from './hooks/useDebounce';
import { useFavorites } from './hooks/useFavorites';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import FilterBar from './components/FilterBar';
import DealSection from './components/DealSection';
import ProductGrid from './components/ProductGrid';
import Pagination from './components/Pagination';
import DetailSheet from './components/DetailSheet';
import ErrorBanner from './components/ErrorBanner';
import ComparePage from './components/ComparePage';

const PAGE_SIZE = 24;

function Shell() {
  const { filters, set, reset } = useUrlFilters();
  const { favorites, toggle } = useFavorites();

  const [stats, setStats] = useState<Stats | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [items, setItems] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [openSku, setOpenSku] = useState<string | null>(null);

  const query = useDebounce(filters.query, 300);

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, dealsRes, brandsRes] = await Promise.all([
        api.stats(),
        api.deals(),
        api.brands(),
      ]);
      setStats(statsRes);
      setDeals(dealsRes);
      setBrands(brandsRes);
      setApiError(false);
    } catch {
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    const f = buildApiFilters(filters, query, favorites);
    setLoading(true);
    try {
      const res = await api.products(f, PAGE_SIZE, (filters.page - 1) * PAGE_SIZE);
      setItems(res.items);
      setTotal(res.total);
      setApiError(false);
    } catch {
      setItems([]);
      setTotal(0);
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, query, favorites]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCollect = useCallback(async (term: string) => {
    await api.collect(term);
    await Promise.all([fetchData(), fetchProducts()]);
  }, [fetchData, fetchProducts]);

  const visible = items;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="container main">
        {apiError && (
          <ErrorBanner
            message="No se pudo conectar con la API. Revisa que el servidor esté corriendo."
            onDismiss={() => setApiError(false)}
          />
        )}
        <StatsBar stats={stats} total={total} />
        <FilterBar
          filters={filters}
          brands={brands}
          onChange={set}
          onReset={reset}
          favCount={favorites.length}
          onCollect={handleCollect}
        />
        <DealSection deals={deals} onOpen={setOpenSku} />
        <ProductGrid
          items={visible}
          loading={loading}
          isFav={(sku) => favSet.has(sku)}
          onToggleFav={toggle}
          onOpen={(p) => setOpenSku(p.sku)}
        />
        <Pagination
          page={filters.page}
          pages={pages}
          total={total}
          onPage={(p) => set({ page: p })}
        />
      </div>
      {openSku && <DetailSheet sku={openSku} onClose={() => setOpenSku(null)} />}
    </>
  );
}

function buildApiFilters(filters: UrlFilters, query: string, favorites: string[]): ProductFilters {
  const f: ProductFilters = {};
  if (query.trim()) f.query = query.trim();
  if (filters.store) f.store = filters.store;
  if (filters.brands.length) f.brands = filters.brands;
  if (filters.minPrice !== undefined) f.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined) f.maxPrice = filters.maxPrice;
  if (filters.dealOnly) f.dealOnly = true;
  if (filters.favOnly && favorites.length) f.skus = favorites;
  if (filters.sort !== 'default') f.sort = filters.sort as SortKey;
  return f;
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Shell />} />
        <Route path="/comparar" element={<ComparePage />} />
      </Routes>
    </BrowserRouter>
  );
}