import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'falabella_favorites';

let listeners: Array<() => void> = [];
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  let parsed: string[];
  try {
    parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') ?? [];
  } catch {
    parsed = [];
  }
  cache = parsed;
  return parsed;
}

function emit() {
  cache = null;
  listeners.forEach((l) => l());
}

export function useFavorites() {
  const favorites = useSyncExternalStore(
    (cb) => {
      listeners = [...listeners, cb];
      return () => {
        listeners = listeners.filter((l) => l !== cb);
      };
    },
    read
  );

  const toggle = useCallback((sku: string) => {
    const cur = read();
    const next = cur.includes(sku) ? cur.filter((s) => s !== sku) : [...cur, sku];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, []);

  const isFav = useCallback((sku: string) => read().includes(sku), []);

  return { favorites, toggle, isFav };
}