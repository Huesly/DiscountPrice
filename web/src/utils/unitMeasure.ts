export interface UnitMeasureInfo {
  /** Cantidad normalizada en gramos, mililitros o unidades */
  totalAmount: number;
  /** Unidad base ('g' | 'ml' | 'und') */
  baseUnit: 'g' | 'ml' | 'und';
  /** Precio por 1 unidad base ($/g, $/ml, $/und) */
  unitPrice: number;
  /** Etiqueta de la presentación detectada (ej. "500 g", "6x900 ml", "30 und") */
  presentationLabel: string;
  /** Etiqueta de precio por unidad (ej. "$4,3 / g", "$3,2 / ml", "$526 c/u") */
  unitPriceLabel: string;
  /** Etiqueta completa amigable para mostrar en la tarjeta */
  badgeText: string;
}

const APPLIANCE_SKIP_RE =
  /\b(freidora|airfryer|nevera|nevecon|microondas|lavadora|secadora|horno|licuadora|aspiradora|olla|sarten|sartén|caneca|basura|escritorio|silla|mesa|colchon|colchón|televisor|celular|portatil|portátil|bateria|ups)\b/i;

function fmtDecimalCo(n: number): string {
  if (n >= 100) {
    return `$${Math.round(n).toLocaleString('es-CO')}`;
  }
  if (n >= 10) {
    return `$${n.toFixed(1).replace('.', ',')}`;
  }
  return `$${n.toFixed(1).replace('.', ',')}`;
}

export function getUnitMeasure(name: string, price: number | null | undefined): UnitMeasureInfo | null {
  if (!price || price <= 0 || !name) return null;
  if (APPLIANCE_SKIP_RE.test(name)) return null;

  const clean = name.replace(/\s+/g, ' ').trim();

  // 1. Multipack de peso o volumen (ej: "6 x 900 ml", "3x160g", "4 x 250 g")
  const multiMatch = clean.match(
    /\b(\d{1,2})\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos|g|gr|grs|gramos|lb|libra|libras|l|lt|lts|litro|litros|ml|cc|cm3)\b/i
  );
  if (multiMatch) {
    const count = Number(multiMatch[1]);
    const rawQty = Number(multiMatch[2].replace(',', '.'));
    const unitRaw = multiMatch[3].toLowerCase();
    const parsed = normalizeWeightOrVolume(rawQty * count, unitRaw, `${count}x${multiMatch[2]} ${ normalizeUnitDisplay(unitRaw) }`, price);
    if (parsed) return parsed;
  }

  // 2. Peso o volumen individual (ej: "500 g", "3000g", "1 kg", "900 ml", "3 L", "1.5 L")
  const singleMatch = clean.match(
    /\b(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos|g|gr|grs|gramos|lb|libra|libras|l|lt|lts|litro|litros|ml|cc|cm3)\b/i
  );
  if (singleMatch) {
    let rawStr = singleMatch[1];
    // En Colombia a veces escriben "1.000 g" o "3.000 ml" con punto de miles
    if (/^\d\.\d{3}$/.test(rawStr)) {
      rawStr = rawStr.replace('.', '');
    } else {
      rawStr = rawStr.replace(',', '.');
    }
    const rawQty = Number(rawStr);
    const unitRaw = singleMatch[2].toLowerCase();
    const displayQty = rawQty >= 1000 && (unitRaw === 'g' || unitRaw === 'gr' || unitRaw === 'gramos')
      ? `${rawQty} g`
      : `${singleMatch[1]} ${normalizeUnitDisplay(unitRaw)}`;
    const parsed = normalizeWeightOrVolume(rawQty, unitRaw, displayQty, price);
    if (parsed) return parsed;
  }

  // 3. Conteo por unidades (ej: "x 30 und", "30 unidades", "12 rollos", "x12 und")
  const unitMatch = clean.match(
    /\b(?:x\s*)?(\d{1,3})\s*(und|uds|unid|unidades|huevos|rollos|sobres|latas|paquetes|bolsas|capsulas|cápsulas|tabletas)\b/i
  );
  if (unitMatch) {
    const count = Number(unitMatch[1]);
    if (count >= 2 && count <= 200) {
      const unitPrice = price / count;
      const unitPriceLabel = `${fmtDecimalCo(unitPrice)} c/u`;
      const presentationLabel = `${count} und`;
      return {
        totalAmount: count,
        baseUnit: 'und',
        unitPrice,
        presentationLabel,
        unitPriceLabel,
        badgeText: `📦 ${presentationLabel} · ${unitPriceLabel}`,
      };
    }
  }

  return null;
}

function normalizeUnitDisplay(u: string): string {
  if (/^(kg|kilo|kilos)$/.test(u)) return 'kg';
  if (/^(lb|libra|libras)$/.test(u)) return 'lb';
  if (/^(g|gr|grs|gramos)$/.test(u)) return 'g';
  if (/^(l|lt|lts|litro|litros)$/.test(u)) return 'L';
  return 'ml';
}

function normalizeWeightOrVolume(
  qty: number,
  unitRaw: string,
  presentationLabel: string,
  price: number
): UnitMeasureInfo | null {
  if (!Number.isFinite(qty) || qty <= 0) return null;

  // Peso -> convertir a gramos (g)
  if (/^(kg|kilo|kilos|g|gr|grs|gramos|lb|libra|libras)$/.test(unitRaw)) {
    let grams = qty;
    if (/^(kg|kilo|kilos)$/.test(unitRaw)) grams = qty * 1000;
    else if (/^(lb|libra|libras)$/.test(unitRaw)) grams = qty * 500;

    if (grams < 15 || grams > 50000) return null;
    const unitPrice = price / grams;
    const unitPriceLabel = `${fmtDecimalCo(unitPrice)} / g`;
    return {
      totalAmount: grams,
      baseUnit: 'g',
      unitPrice,
      presentationLabel,
      unitPriceLabel,
      badgeText: `⚖️ ${presentationLabel} · ${unitPriceLabel}`,
    };
  }

  // Volumen -> convertir a mililitros (ml)
  if (/^(l|lt|lts|litro|litros|ml|cc|cm3)$/.test(unitRaw)) {
    let ml = qty;
    if (/^(l|lt|lts|litro|litros)$/.test(unitRaw)) ml = qty * 1000;

    if (ml < 15 || ml > 50000) return null;
    const unitPrice = price / ml;
    const unitPriceLabel = `${fmtDecimalCo(unitPrice)} / ml`;
    return {
      totalAmount: ml,
      baseUnit: 'ml',
      unitPrice,
      presentationLabel,
      unitPriceLabel,
      badgeText: `💧 ${presentationLabel} · ${unitPriceLabel}`,
    };
  }

  return null;
}

export function normalizeProductUrl(url: string, store?: string): string {
  if (!url) return '#';
  if (store === 'exito' || url.includes('tienda.exito.com')) {
    return url.replace(/^https?:\/\/tienda\.exito\.com/i, 'https://www.exito.com');
  }
  return url;
}

export function buildWhatsAppShareUrl(p: {
  name: string;
  store: string;
  price: number | null;
  original_price?: number | null;
  url: string;
  storeLabel: string;
}): string {
  const priceStr = p.price ? `$${Math.round(p.price).toLocaleString('es-CO')}` : '';
  const u = getUnitMeasure(p.name, p.price);
  const unitLine = u ? `\n⚖️ Rendimiento: *${u.presentationLabel}* (${u.unitPriceLabel})` : '';
  const oldLine =
    p.original_price && p.price && p.original_price > p.price
      ? ` (Antes $${Math.round(p.original_price).toLocaleString('es-CO')})`
      : '';
  const finalUrl = normalizeProductUrl(p.url, p.store);
  const text = `🛒 *Oferta en ${p.storeLabel}*\n📦 ${p.name}\n💰 Precio: *${priceStr}*${oldLine}${unitLine}\n🔗 Ver producto: ${finalUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export interface EnergyEfficiencyInfo {
  isClassA: boolean;
  isInverter: boolean;
  litersLabel: string | null;
  badgeText: string;
}

const FRIDGE_ENERGY_A_RE =
  /(inverter|tipo a|clase a|eficiencia a|ahorro|no frost|ert|erb|rmu|rma|himalaya|austria|lumina|lúmina|cr239|cr256|cr 239|cr 256|n220|n250|nev 207|bcd|rt2|rlh|mdrd|ri-|k-n|h4160|h6161)/i;

const FRIDGE_EXCLUDE_RE =
  /(portatil|portátil|camping|icopor|hielera|cava|vinos|botellas|silla|organizador|base para|soporte|protector|forro|iman|imán|filtro|repuesto|dispensador de agua)/i;

export function getEnergyEfficiencyInfo(name: string): EnergyEfficiencyInfo | null {
  if (!name) return null;
  const clean = name.replace(/\s+/g, ' ').trim();
  const isFridge = /\b(nevera|neveras|nevecon|nevecón|minibar)\b/i.test(clean);
  if (!isFridge || FRIDGE_EXCLUDE_RE.test(clean)) return null;

  const isClassA = FRIDGE_ENERGY_A_RE.test(clean);
  if (!isClassA) return null;

  const isInverter = /\b(inverter|ert23|ert20|twin cooling|smart inverter|digital inverter)\b/i.test(clean);
  const litersMatch = clean.match(/\b(\d{2,3})\s*(?:l|lt|lts|litros)\b/i);
  const litersLabel = litersMatch ? `${litersMatch[1]} L` : null;

  const parts: string[] = [isInverter ? '⚡ Categoría A (Inverter)' : '⚡ Eficiencia Tipo A'];
  if (litersLabel) parts.push(`❄️ ${litersLabel}`);

  return {
    isClassA: true,
    isInverter,
    litersLabel,
    badgeText: parts.join(' · '),
  };
}
