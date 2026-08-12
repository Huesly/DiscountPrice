export interface CategoryConfig {
  name: string;
  subcategory: string;
  url: string;
}

export interface SearchTermConfig {
  term: string;
  subcategory: string;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    name: 'Hogar',
    subcategory: 'Electrohogar',
    url: 'https://www.falabella.com.co/falabella-co/category/cat50623/Electrohogar',
  },
];

export const SEARCH_TERMS: SearchTermConfig[] = [
  { term: 'aspiradora', subcategory: 'aspiradora' },
  { term: 'licuadora', subcategory: 'licuadora' },
  { term: 'microondas', subcategory: 'microondas' },
  { term: 'cafetera', subcategory: 'cafetera' },
  { term: 'lavadora', subcategory: 'lavadora' },
  { term: 'silla', subcategory: 'silla' },
  { term: 'comedor', subcategory: 'comedor' },
  { term: 'escritorio', subcategory: 'escritorio' },
  { term: 'colchon', subcategory: 'colchon' },
  { term: 'closet', subcategory: 'closet' },
  { term: 'armario', subcategory: 'armario' },
  { term: 'tapete', subcategory: 'tapete' },
  { term: 'lampara', subcategory: 'lampara' },
  { term: 'mesita', subcategory: 'mesita' },
  { term: 'mueble tv', subcategory: 'mueble tv' },
  { term: 'estante', subcategory: 'estante' },
  { term: 'sofa', subcategory: 'sofa' },
  { term: 'cama', subcategory: 'cama' },
  { term: 'tocador', subcategory: 'tocador' },
  { term: 'comoda', subcategory: 'comoda' },
  { term: 'ollas', subcategory: 'ollas' },
  { term: 'platos', subcategory: 'platos' },
  { term: 'vajilla', subcategory: 'vajilla' },
  { term: 'sarten', subcategory: 'sarten' },
  { term: 'cacerola', subcategory: 'cacerola' },
  { term: 'cubiertos', subcategory: 'cubiertos' },
  { term: 'tazas', subcategory: 'tazas' },
  { term: 'vasos', subcategory: 'vasos' },
];

export const MAX_PAGES = Number(process.env.MAX_PAGES ?? 10);
export const PAGE_DELAY_MS = Number(process.env.PAGE_DELAY_MS ?? 3000);
export const COLLECT_TERMS = (process.env.COLLECT_TERMS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const FALABELLA_BASE = process.env.FALABELLA_BASE ?? 'https://www.falabella.com.co';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export const POD_SELECTOR = 'a[data-pod="catalyst-pod"]';