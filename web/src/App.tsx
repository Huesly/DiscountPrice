import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import type { ProductFilters, ProductRow, SortKey } from './api';
import { api } from './api';
import { useUrlFilters, type UrlFilters } from './hooks/useUrlFilters';
import { useFavorites } from './hooks/useFavorites';
import Header from './components/Header';
import CategoryBar from './components/CategoryBar';
import FilterBar from './components/FilterBar';
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
  const [collectingFood, setCollectingFood] = useState(false);

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const abortCtrlRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

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
    },
    [fetchProducts]
  );

  const handleCollectFood = useCallback(async () => {
    setCollectingFood(true);
    try {
      await api.collectFood();
      await fetchProducts();
    } finally {
      setCollectingFood(false);
    }
  }, [fetchProducts]);

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      set({
        category: categoryId,
        query: '',
        energyA: false,
        page: 1,
      });
    },
    [set]
  );

  const handleSelectVariable = useCallback(
    (term: string, opts?: { category?: string; energyA?: boolean }) => {
      set({
        category: opts?.category !== undefined ? opts.category : filters.category,
        query: term,
        energyA: Boolean(opts?.energyA),
        page: 1,
      });
    },
    [set, filters.category]
  );

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

        {/* Explorador Dinámico: Categorías Principales y Variables de Producto */}
        <CategoryBar
          activeCategory={filters.category}
          activeTerm={filters.query}
          activeEnergyA={filters.energyA}
          onSelectCategory={handleSelectCategory}
          onSelectVariable={handleSelectVariable}
          onCollectFood={handleCollectFood}
          collectingFood={collectingFood}
        />

        {/* Buscador General y Filtros Avanzados */}
        <FilterBar
          filters={filters}
          total={total}
          onChange={set}
          onReset={reset}
          favCount={favorites.length}
          onCollect={handleCollect}
        />

        {/* Cuadrícula de Productos */}
        <ProductGrid
          items={items}
          loading={loading}
          isFav={(sku) => favSet.has(sku)}
          onToggleFav={toggle}
          onOpen={(p) => setOpenSku(p.sku)}
        />

        {/* Paginación */}
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
  if (filters.favOnly && favorites.length) f.skus = favorites;
  f.sort = (filters.sort === 'default' ? 'price_asc' : filters.sort) as SortKey;
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
