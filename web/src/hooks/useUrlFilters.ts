import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UrlFilters {
  query: string;
  category: string;
  store: string;
  brands: string[];
  minPrice: number | undefined;
  maxPrice: number | undefined;
  dealOnly: boolean;
  energyA: boolean;
  minDiscount: number | undefined;
  favOnly: boolean;
  sort: string;
  page: number;
}

export function useUrlFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<UrlFilters>(() => {
    const brandVal = params.get('brands');
    const brands = brandVal ? brandVal.split(',').filter(Boolean) : [];
    const minPrice = params.get('min') ? Number(params.get('min')) : undefined;
    const maxPrice = params.get('max') ? Number(params.get('max')) : undefined;
    const minDiscount = params.get('discount') ? Number(params.get('discount')) : undefined;
    const page = Number(params.get('page')) || 1;
    return {
      query: params.get('q') ?? '',
      category: params.get('cat') ?? '',
      store: params.get('store') ?? '',
      brands,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      dealOnly: params.get('deals') === '1',
      energyA: params.get('energyA') === '1',
      minDiscount: Number.isFinite(minDiscount) ? minDiscount : undefined,
      favOnly: params.get('favs') === '1',
      sort: params.get('sort') ?? 'default',
      page,
    };
  }, [params]);

  const set = useCallback(
    (patch: Partial<UrlFilters>) => {
      const next = { ...filters, ...patch };
      const q = new URLSearchParams();
      if (next.query.trim()) q.set('q', next.query.trim());
      if (next.category) q.set('cat', next.category);
      if (next.store) q.set('store', next.store);
      if (next.brands.length) q.set('brands', next.brands.join(','));
      if (next.minPrice !== undefined) q.set('min', String(next.minPrice));
      if (next.maxPrice !== undefined) q.set('max', String(next.maxPrice));
      if (next.dealOnly) q.set('deals', '1');
      if (next.energyA) q.set('energyA', '1');
      if (next.minDiscount !== undefined) q.set('discount', String(next.minDiscount));
      if (next.favOnly) q.set('favs', '1');
      if (next.sort !== 'default') q.set('sort', next.sort);
      if (next.page > 1) q.set('page', String(next.page));
      const str = q.toString();
      setParams(str ? `?${str}` : '', { replace: true });
    },
    [filters, setParams]
  );

  const reset = useCallback(() => {
    setParams('', { replace: true });
  }, [setParams]);

  return { filters, set, reset };
}
