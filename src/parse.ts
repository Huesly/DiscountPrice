export function parseCoPrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$.\s]/g, '').replace(/,/g, '.').trim();
  if (!cleaned || /[^\d.]/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function cleanSeller(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^Por\s+/i, '').replace(/\s+/g, ' ');
  return s || null;
}