export const STOP_WORDS = new Set([
  'con',
  'de',
  'del',
  'para',
  'por',
  'y',
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'en',
  'a',
  'o',
  'color',
  'colores',
  'negra',
  'negro',
  'blanca',
  'blanco',
  'gris',
  'grises',
  'azul',
  'roja',
  'rojo',
  'verde',
  'modelo',
  'nuevo',
  'nueva',
  'precio',
  'oferta',
  'varios',
  'conjunto',
  'set',
  'juego',
  'unidad',
  'unidades',
  'nacional',
  'incluido',
  'incluida',
  'original',
  'importado',
  'hogar',
  'hacer',
  'para',
  'moda',
  'talla',
  'referencia',
]);

export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d+)\s*[xX](\d+)/g, '$1x$2')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .join(' ');
}

export function tokenize(name: string | null | undefined): Set<string> {
  const n = normalizeName(name);
  return new Set(
    n
      .split(' ')
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t) && !/^(cm|kg|gr|g|ml|lt|l|m)$/.test(t))
  );
}

const MODEL_RE = /[A-Z0-9]{5,}/g;

export function modelTokens(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    Array.from(
      raw
        .replace(/[^A-Za-z0-9]/g, ' ')
        .matchAll(MODEL_RE),
      (m) => m[0].toLowerCase()
    ).filter((t) => /[a-z]/.test(t) && /[0-9]/.test(t))
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function productScore(aName: string, bName: string): number {
  const ma = modelTokens(aName);
  const mb = modelTokens(bName);
  const inter = ma.size && mb.size ? Array.from(ma).filter((t) => mb.has(t)).length : 0;
  if (inter > 0) {
    const union = ma.size + mb.size - inter;
    return Math.max(jaccard(ma, mb), inter / Math.min(ma.size, mb.size));
  }
  return jaccard(tokenize(aName), tokenize(bName));
}

export interface MatchCandidate {
  group: string;
  member: string;
  score: number;
}

export function buildGroups(items: { key: string; name: string; brand: string | null }[]): MatchCandidate[] {
  const cands: MatchCandidate[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (!a.brand || !b.brand) continue;
      if (a.brand.toLowerCase() !== b.brand.toLowerCase()) continue;
      const ta = tokenize(a.name);
      const tb = tokenize(b.name);
      const score = jaccard(ta, tb);
      if (score >= 0.5) {
        cands.push({ group: a.key, member: b.key, score });
      }
    }
  }
  return cands;
}
