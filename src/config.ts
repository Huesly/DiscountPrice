import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function loadTermsFromFile(): { terms: SearchTermConfig[]; groups: SearchTermConfig[][] } {
  const path = join(__dirname, '..', 'terms.txt');
  let content: string;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return { terms: [], groups: [] };
  }
  const lines = content.split('\n');
  const all: SearchTermConfig[] = [];
  const groups: SearchTermConfig[][] = [[]];
  let currentGroup = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      const m = line.match(/#\s*grupo\s+(\d+)/i);
      if (m) {
        const n = Number(m[1]);
        currentGroup = n - 1;
        while (groups.length <= currentGroup) groups.push([]);
      }
      continue;
    }
    const t: SearchTermConfig = { term: line, subcategory: line };
    all.push(t);
    while (groups.length <= currentGroup) groups.push([]);
    groups[currentGroup].push(t);
  }
  const cleanGroups = groups.filter((g) => g.length > 0);
  return { terms: all, groups: cleanGroups };
}

export function getSearchTerms(group?: number): SearchTermConfig[] {
  const envTerms = (process.env.COLLECT_TERMS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (envTerms.length > 0) {
    return envTerms.map((t) => ({ term: t, subcategory: t }));
  }

  const { terms: all, groups } = loadTermsFromFile();
  if (!group || group < 1) return all;

  if (groups.length >= 2) {
    const idx = group - 1;
    return idx < groups.length ? groups[idx] : [];
  }

  const mid = Math.ceil(all.length / 2);
  return group === 1 ? all.slice(0, mid) : all.slice(mid);
}

export const SEARCH_TERMS: SearchTermConfig[] = getSearchTerms();

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