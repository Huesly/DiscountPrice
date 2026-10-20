import type { Page } from 'playwright';
import type { ScrapedProduct } from '../db/repo.js';

export interface FetchListingOptions {
  page?: number;
  city?: string | null;
  term?: string;
}

export interface StoreAdapter {
  code: string;
  name: string;
  searchUrl(term: string): string;
  fetchListing?(targetUrl: string, opts?: FetchListingOptions): Promise<ScrapedProduct[]>;
  setRegion?(page: Page, city: string): Promise<void>;
  waitForListing(page: Page): Promise<void>;
  extractListing(page: Page): Promise<ScrapedProduct[]>;
  pageDelayMs?: number;
  termDelayMs?: number;
}

export const POSTAL_CODES: Record<string, string> = {
  Cali: '760000',
  Bucaramanga: '680000',
};
